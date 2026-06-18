"""Fase 4 verification: full whistleblower flow + at-rest encryption guarantees."""

import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import async_sessionmaker
from sqlalchemy.orm import selectinload

from app.db.models import Questionnaire, RecipientReport, ReportAnswer, Step


async def _required_answers(engine) -> dict:
    """Build a minimal valid answer set from the seeded default questionnaire."""
    maker = async_sessionmaker(engine, expire_on_commit=False)
    async with maker() as s:
        q = await s.scalar(
            select(Questionnaire)
            .where(Questionnaire.name == "default")
            .options(selectinload(Questionnaire.steps).selectinload(Step.fields))
        )
    answers = {}
    for step in q.steps:
        for field in step.fields:
            if field.required:
                answers[str(field.id)] = "Corruzione" if field.type == "select" else "Testo segnalazione"
    return answers


def _auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


@pytest.mark.asyncio
async def test_missing_required_answer_rejected(client, engine):
    ac, _ = client
    resp = await ac.post("/api/report", json={"answers": {}})
    assert resp.status_code == 400


@pytest.mark.asyncio
async def test_full_whistleblower_flow(client, engine):
    ac, _ = client
    answers = await _required_answers(engine)

    # 1. Submit
    submit = await ac.post("/api/report", json={"answers": answers})
    assert submit.status_code == 200
    body = submit.json()
    assert len(body["receipt"]) == 20 and body["receipt"].isdigit()
    receipt = body["receipt"]

    # 2. Re-enter anonymously with the receipt (fresh session)
    re = await ac.post("/api/auth/receipt", json={"receipt": receipt})
    assert re.status_code == 200
    token = re.json()["token"]

    # 3. Read the decrypted report
    view = await ac.get("/api/report/me", headers=_auth(token))
    assert view.status_code == 200
    data = view.json()
    assert data["answers"] == answers
    assert data["comments"] == []

    # 4. Add a comment, then see it
    c = await ac.post("/api/report/me/comments", json={"content": "Aggiungo un dettaglio"}, headers=_auth(token))
    assert c.status_code == 200
    data = (await ac.get("/api/report/me", headers=_auth(token))).json()
    assert len(data["comments"]) == 1
    assert data["comments"][0]["content"] == "Aggiungo un dettaglio"
    assert data["comments"][0]["author_kind"] == "whistleblower"

    # 5. Upload an attachment
    up = await ac.post(
        "/api/report/me/files",
        files={"file": ("prova.txt", b"contenuto allegato", "text/plain")},
        headers=_auth(token),
    )
    assert up.status_code == 200
    data = (await ac.get("/api/report/me", headers=_auth(token))).json()
    assert len(data["files"]) == 1
    assert data["files"][0]["name"] == "prova.txt"


@pytest.mark.asyncio
async def test_content_is_encrypted_at_rest(client, engine):
    ac, _ = client
    answers = await _required_answers(engine)
    await ac.post("/api/report", json={"answers": answers})

    maker = async_sessionmaker(engine, expire_on_commit=False)
    async with maker() as s:
        rows = (await s.scalars(select(ReportAnswer))).all()
    # The plaintext answer must NOT appear in the stored payload.
    blob = str([r.answers for r in rows])
    assert "Testo segnalazione" not in blob
    assert "ciphertext" in blob


@pytest.mark.asyncio
async def test_report_key_wrapped_for_recipient(client, engine):
    ac, _ = client
    answers = await _required_answers(engine)
    await ac.post("/api/report", json={"answers": answers})

    maker = async_sessionmaker(engine, expire_on_commit=False)
    async with maker() as s:
        link = await s.scalar(select(RecipientReport))
    # The seeded admin recipient has crypto keys, so the tip key is wrapped for them.
    assert link is not None
    assert link.wrapped_tip_prv_key != ""
