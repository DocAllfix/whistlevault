"""R3 verification: temporary (reversible) and permanent redaction + permission."""

import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import async_sessionmaker
from sqlalchemy.orm import selectinload

from app.db.enums import UserRole
from app.db.models import Questionnaire, Step
from tests.test_cases import _auth, _login, _make_user


async def _answers_with(engine, description: str) -> dict:
    maker = async_sessionmaker(engine, expire_on_commit=False)
    async with maker() as s:
        q = await s.scalar(
            select(Questionnaire)
            .where(Questionnaire.name == "default")
            .options(selectinload(Questionnaire.steps).selectinload(Step.fields))
        )
    answers = {}
    for step in q.steps:
        for f in step.fields:
            if f.required:
                answers[str(f.id)] = "Corruzione" if f.type == "select" else description
    return answers


@pytest.mark.asyncio
async def test_temporary_redaction_masks_view(client, engine):
    ac, data = client
    answers = await _answers_with(engine, "Contattare Mario Rossi al 333")
    report_id = (await ac.post("/api/report", json={"answers": answers})).json()["report_id"]
    tok = await _login(ac, "admin", data["admin_password"])

    before = (await ac.get(f"/api/cases/{report_id}", headers=_auth(tok))).json()
    assert any("Mario Rossi" in str(v) for v in before["answers"].values())

    r = await ac.post(
        f"/api/cases/{report_id}/redactions",
        json={"reference": "answers", "mask": ["Mario Rossi"], "permanent": False},
        headers=_auth(tok),
    )
    assert r.status_code == 200

    after = (await ac.get(f"/api/cases/{report_id}", headers=_auth(tok))).json()
    assert not any("Mario Rossi" in str(v) for v in after["answers"].values())
    assert any("■" in str(v) for v in after["answers"].values())


@pytest.mark.asyncio
async def test_permanent_redaction_rewrites_content(client, engine):
    ac, data = client
    answers = await _answers_with(engine, "Numero sensibile 333-4455 da oscurare")
    report_id = (await ac.post("/api/report", json={"answers": answers})).json()["report_id"]
    tok = await _login(ac, "admin", data["admin_password"])

    r = await ac.post(
        f"/api/cases/{report_id}/redactions",
        json={"reference": "answers", "mask": ["333-4455"], "permanent": True},
        headers=_auth(tok),
    )
    assert r.status_code == 200

    # The secret is gone from the (re-encrypted) content, persistently.
    d = (await ac.get(f"/api/cases/{report_id}", headers=_auth(tok))).json()
    assert not any("333-4455" in str(v) for v in d["answers"].values())
    assert any("■" in str(v) for v in d["answers"].values())


@pytest.mark.asyncio
async def test_redaction_requires_permission(client, engine):
    ac, data = client
    answers = await _answers_with(engine, "Mario Rossi")
    report_id = (await ac.post("/api/report", json={"answers": answers})).json()["report_id"]

    await _make_user(engine, "rec_noredact", UserRole.recipient, "RecPass123!")
    tok = await _login(ac, "rec_noredact", "RecPass123!")
    r = await ac.post(
        f"/api/cases/{report_id}/redactions",
        json={"reference": "answers", "mask": ["Mario Rossi"], "permanent": False},
        headers=_auth(tok),
    )
    assert r.status_code == 403
