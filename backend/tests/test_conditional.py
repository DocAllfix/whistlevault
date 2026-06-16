"""R5b verification: conditional (trigger-based) questionnaire validation."""

import pytest

from tests.test_cases import _auth, _login


@pytest.mark.asyncio
async def test_conditional_required_field(client, engine):
    ac, data = client
    tok = await _login(ac, "admin", data["admin_password"])

    q = (
        await ac.post(
            "/api/admin/questionnaires",
            json={
                "name": "condizionale",
                "steps": [
                    {
                        "label": {"it": "S"},
                        "order": 0,
                        "fields": [
                            {
                                "label": {"it": "Categoria"},
                                "type": "select",
                                "required": True,
                                "order": 0,
                                "key": "cat",
                                "options": [
                                    {"label": {"it": "Corruzione"}, "order": 0},
                                    {"label": {"it": "Altro"}, "order": 1},
                                ],
                            },
                            {
                                "label": {"it": "Specificare"},
                                "type": "textarea",
                                "required": True,
                                "order": 1,
                                "key": "other_detail",
                                "trigger_field_key": "cat",
                                "trigger_value": "Altro",
                            },
                        ],
                    }
                ],
            },
            headers=_auth(tok),
        )
    ).json()
    assert q["steps"][0]["fields"][0]["key"] == "cat"  # stable key persisted
    qid = q["id"]
    cat_id = q["steps"][0]["fields"][0]["id"]
    detail_id = q["steps"][0]["fields"][1]["id"]

    ctx = (
        await ac.post(
            "/api/admin/contexts",
            json={"name": {"it": "Canale cond"}, "questionnaire_id": qid},
            headers=_auth(tok),
        )
    ).json()
    ctx_id = ctx["id"]

    # Trigger NOT met → conditional field not required.
    r1 = await ac.post("/api/report", json={"context_id": ctx_id, "answers": {cat_id: "Corruzione"}})
    assert r1.status_code == 200

    # Trigger met but conditional field missing → rejected.
    r2 = await ac.post("/api/report", json={"context_id": ctx_id, "answers": {cat_id: "Altro"}})
    assert r2.status_code == 400

    # Trigger met and conditional field provided → accepted.
    r3 = await ac.post(
        "/api/report",
        json={"context_id": ctx_id, "answers": {cat_id: "Altro", detail_id: "dettagli"}},
    )
    assert r3.status_code == 200
