"""R15 verification: 'voice' questionnaire field + encrypted audio attachment."""

import pytest

from tests.test_cases import _auth, _login


@pytest.mark.asyncio
async def test_voice_field_and_audio_upload(client, engine):
    ac, data = client
    tok = await _login(ac, "admin", data["admin_password"])

    q = (
        await ac.post(
            "/api/admin/questionnaires",
            json={
                "name": "voce",
                "steps": [
                    {
                        "label": {"it": "Segnalazione"},
                        "order": 0,
                        "fields": [
                            {"label": {"it": "Descrizione"}, "type": "textarea", "required": True, "order": 0},
                            {"label": {"it": "Messaggio vocale"}, "type": "voice", "required": False, "order": 1},
                        ],
                    }
                ],
            },
            headers=_auth(tok),
        )
    ).json()
    assert q["steps"][0]["fields"][1]["type"] == "voice"
    qid = q["id"]
    text_field = q["steps"][0]["fields"][0]["id"]

    ctx = (
        await ac.post(
            "/api/admin/contexts",
            json={"name": {"it": "Canale orale"}, "questionnaire_id": qid},
            headers=_auth(tok),
        )
    ).json()

    submit = (
        await ac.post("/api/report", json={"context_id": ctx["id"], "answers": {text_field: "con audio"}})
    ).json()
    wb = submit["token"]

    up = await ac.post(
        "/api/report/me/files",
        files={"file": ("registrazione-vocale.webm", b"FAKE_AUDIO_BYTES", "audio/webm")},
        headers=_auth(wb),
    )
    assert up.status_code == 200

    view = (await ac.get("/api/report/me", headers=_auth(wb))).json()
    assert any(f["content_type"] == "audio/webm" for f in view["files"])
