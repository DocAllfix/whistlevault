"""R11 verification: password change (keypair preserved), forced first change, signup."""

import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import async_sessionmaker

from app.db.models import Mail
from tests.test_cases import _answers, _auth, _login


@pytest.mark.asyncio
async def test_change_password_preserves_access(client, engine):
    ac, data = client
    answers = await _answers(engine)
    report_id = (await ac.post("/api/report", json={"answers": answers})).json()["report_id"]

    tok = await _login(ac, "admin", data["admin_password"])
    # admin can read the report
    assert (await ac.get(f"/api/cases/{report_id}", headers=_auth(tok))).status_code == 200

    ch = await ac.post(
        "/api/auth/password/change",
        json={"current_password": data["admin_password"], "new_password": "BrandNew1!"},
        headers=_auth(tok),
    )
    assert ch.status_code == 200

    # New password works and report STILL readable (keypair preserved)
    newtok = await _login(ac, "admin", "BrandNew1!")
    assert (await ac.get(f"/api/cases/{report_id}", headers=_auth(newtok))).json()["answers"] == answers


@pytest.mark.asyncio
async def test_change_password_wrong_current(client, engine):
    ac, data = client
    tok = await _login(ac, "admin", data["admin_password"])
    r = await ac.post(
        "/api/auth/password/change",
        json={"current_password": "wrong", "new_password": "X"},
        headers=_auth(tok),
    )
    assert r.status_code == 400


@pytest.mark.asyncio
async def test_new_user_must_change_password(client, engine):
    ac, data = client
    tok = await _login(ac, "admin", data["admin_password"])
    await ac.post(
        "/api/admin/users",
        json={"username": "mario", "password": "MarioPass1!", "role": "recipient"},
        headers=_auth(tok),
    )
    login = (await ac.post("/api/auth/login", json={"username": "mario", "password": "MarioPass1!"})).json()
    assert login["password_change_needed"] is True


@pytest.mark.asyncio
async def test_signup_request_notifies_when_configured(client, engine):
    ac, data = client
    tok = await _login(ac, "admin", data["admin_password"])
    await ac.put(
        "/api/admin/settings",
        json={"settings": {"signup_notify_email": "sales@example.org"}},
        headers=_auth(tok),
    )
    r = await ac.post("/api/public/signup", json={"organization": "Acme SpA", "email": "ceo@acme.it"})
    assert r.status_code == 200

    maker = async_sessionmaker(engine, expire_on_commit=False)
    async with maker() as s:
        mail = await s.scalar(select(Mail).where(Mail.address == "sales@example.org"))
    assert mail is not None and mail.subject == "Nuova richiesta di attivazione"
