"""R9b verification: admin escrow recovery preserves the user's report access."""

import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import async_sessionmaker

from app.db.models import AppUser
from tests.test_cases import _answers, _auth, _login


@pytest.mark.asyncio
async def test_escrow_recovery_preserves_report_access(client, engine):
    ac, data = client
    admintok = await _login(ac, "admin", data["admin_password"])

    answers = await _answers(engine)
    report_id = (await ac.post("/api/report", json={"answers": answers})).json()["report_id"]

    created = (
        await ac.post(
            "/api/admin/users",
            json={"username": "recx", "password": "RecxPass1!", "role": "recipient"},
            headers=_auth(admintok),
        )
    ).json()
    recx_id = created["id"]
    assert created.get("recovery_key")

    # Give recX access to the report (key wrapped to recX).
    assert (
        await ac.post(f"/api/cases/{report_id}/grant", json={"user_id": recx_id}, headers=_auth(admintok))
    ).status_code == 200

    recxtok = await _login(ac, "recx", "RecxPass1!")
    assert (await ac.get(f"/api/cases/{report_id}", headers=_auth(recxtok))).json()["answers"] == answers

    maker = async_sessionmaker(engine, expire_on_commit=False)
    async with maker() as s:
        pub_before = (await s.scalar(select(AppUser).where(AppUser.username == "recx"))).crypto_pub_key

    # Admin recovers recX via escrow with a new password.
    rec = await ac.post(
        f"/api/admin/users/{recx_id}/recover",
        json={"password": "NewRecxPass1!"},
        headers=_auth(admintok),
    )
    assert rec.status_code == 200 and rec.json().get("recovery_key")

    async with maker() as s:
        pub_after = (await s.scalar(select(AppUser).where(AppUser.username == "recx"))).crypto_pub_key
    assert pub_after == pub_before  # keypair preserved

    # recX logs in with the NEW password and can STILL decrypt the report.
    newtok = await _login(ac, "recx", "NewRecxPass1!")
    assert (await ac.get(f"/api/cases/{report_id}", headers=_auth(newtok))).json()["answers"] == answers
    # Old password no longer works.
    assert (
        await ac.post("/api/auth/login", json={"username": "recx", "password": "RecxPass1!"})
    ).status_code == 401
