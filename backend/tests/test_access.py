"""R7 verification: grant / transfer / permission for case access (crypto re-wrap)."""

import pytest

from app.db.enums import UserRole
from tests.test_cases import _answers, _auth, _login, _make_user


@pytest.mark.asyncio
async def test_grant_access_lets_new_recipient_decrypt(client, engine):
    ac, data = client
    answers = await _answers(engine)
    report_id = (await ac.post("/api/report", json={"answers": answers})).json()["report_id"]

    rid2 = await _make_user(engine, "rec2", UserRole.recipient, "Rec2Pass!")
    tok2 = await _login(ac, "rec2", "Rec2Pass!")
    # Not assigned yet → cannot read.
    assert (await ac.get(f"/api/cases/{report_id}", headers=_auth(tok2))).status_code == 403

    admintok = await _login(ac, "admin", data["admin_password"])
    g = await ac.post(f"/api/cases/{report_id}/grant", json={"user_id": rid2}, headers=_auth(admintok))
    assert g.status_code == 200

    d = await ac.get(f"/api/cases/{report_id}", headers=_auth(tok2))
    assert d.status_code == 200
    assert d.json()["answers"] == answers


@pytest.mark.asyncio
async def test_transfer_access_moves_the_case(client, engine):
    ac, data = client
    answers = await _answers(engine)
    report_id = (await ac.post("/api/report", json={"answers": answers})).json()["report_id"]
    rid3 = await _make_user(engine, "rec3", UserRole.recipient, "Rec3Pass!")

    admintok = await _login(ac, "admin", data["admin_password"])
    users = (await ac.get("/api/admin/users", headers=_auth(admintok))).json()
    admin_id = next(u["id"] for u in users if u["username"] == "admin")
    await ac.patch(
        f"/api/admin/users/{admin_id}",
        json={"permissions": {"can_transfer_access_to_reports": True}},
        headers=_auth(admintok),
    )
    # Re-login so the session picks up the new permission.
    admintok = await _login(ac, "admin", data["admin_password"])

    t = await ac.post(f"/api/cases/{report_id}/transfer", json={"user_id": rid3}, headers=_auth(admintok))
    assert t.status_code == 200

    tok3 = await _login(ac, "rec3", "Rec3Pass!")
    assert (await ac.get(f"/api/cases/{report_id}", headers=_auth(tok3))).status_code == 200
    # The transferring admin gave up access.
    assert (await ac.get(f"/api/cases/{report_id}", headers=_auth(admintok))).status_code == 403


@pytest.mark.asyncio
async def test_grant_requires_permission(client, engine):
    ac, _ = client
    answers = await _answers(engine)
    report_id = (await ac.post("/api/report", json={"answers": answers})).json()["report_id"]
    rid = await _make_user(engine, "recx", UserRole.recipient, "RecxPass!")
    tokx = await _login(ac, "recx", "RecxPass!")
    g = await ac.post(f"/api/cases/{report_id}/grant", json={"user_id": rid}, headers=_auth(tokx))
    assert g.status_code == 403
