"""R5 verification: option weights produce a risk score and set `important`."""

import uuid as uuidlib

import pytest
from sqlalchemy.ext.asyncio import async_sessionmaker

from app.db.models import Report
from tests.test_cases import _auth, _login


@pytest.mark.asyncio
async def test_scoring_sets_score_and_important(client, engine):
    ac, data = client
    tok = await _login(ac, "admin", data["admin_password"])

    q = (
        await ac.post(
            "/api/admin/questionnaires",
            json={
                "name": "scored",
                "steps": [
                    {
                        "label": {"it": "Gravità"},
                        "order": 0,
                        "fields": [
                            {
                                "label": {"it": "Livello"},
                                "type": "select",
                                "required": True,
                                "order": 0,
                                "options": [
                                    {"label": {"it": "Grave"}, "order": 0, "score": 10},
                                    {"label": {"it": "Lieve"}, "order": 1, "score": 1},
                                ],
                            }
                        ],
                    }
                ],
            },
            headers=_auth(tok),
        )
    ).json()
    qid = q["id"]
    field_id = q["steps"][0]["fields"][0]["id"]

    ctx = (
        await ac.post(
            "/api/admin/contexts",
            json={"name": {"it": "Canale scored"}, "questionnaire_id": qid, "score_threshold_high": 10},
            headers=_auth(tok),
        )
    ).json()
    ctx_id = ctx["id"]
    assert ctx["score_threshold_high"] == 10

    maker = async_sessionmaker(engine, expire_on_commit=False)

    # High-score answer → score 10, important
    high = (await ac.post("/api/report", json={"context_id": ctx_id, "answers": {field_id: "Grave"}})).json()
    async with maker() as s:
        rep = await s.get(Report, uuidlib.UUID(high["report_id"]))
        assert rep.score == 10
        assert rep.important is True

    # Low-score answer → score 1, not important
    low = (await ac.post("/api/report", json={"context_id": ctx_id, "answers": {field_id: "Lieve"}})).json()
    async with maker() as s:
        rep2 = await s.get(Report, uuidlib.UUID(low["report_id"]))
        assert rep2.score == 1
        assert rep2.important is False
