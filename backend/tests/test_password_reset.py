"""R8 verification: self-service password reset via emailed token."""

import pytest
from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import async_sessionmaker

from app.db.models import AppUser, Mail


async def _set_admin_mail(engine, address="admin@example.org"):
    maker = async_sessionmaker(engine, expire_on_commit=False)
    async with maker() as s:
        await s.execute(update(AppUser).where(AppUser.username == "admin").values(mail_address=address))
        await s.commit()


@pytest.mark.asyncio
async def test_password_reset_flow(client, engine):
    ac, data = client
    await _set_admin_mail(engine)

    f = await ac.post("/api/auth/password/forgot", json={"username": "admin"})
    assert f.status_code == 200

    maker = async_sessionmaker(engine, expire_on_commit=False)
    async with maker() as s:
        mail = await s.scalar(select(Mail).where(Mail.subject == "Reimposta la password"))
    assert mail is not None
    token = mail.body.splitlines()[1]

    r = await ac.post("/api/auth/password/reset", json={"token": token, "new_password": "NewPass123!"})
    assert r.status_code == 200

    assert (await ac.post("/api/auth/login", json={"username": "admin", "password": "NewPass123!"})).status_code == 200
    assert (await ac.post("/api/auth/login", json={"username": "admin", "password": data["admin_password"]})).status_code == 401


@pytest.mark.asyncio
async def test_forgot_unknown_user_no_enumeration(client, engine):
    ac, _ = client
    r = await ac.post("/api/auth/password/forgot", json={"username": "nonexistent"})
    assert r.status_code == 200  # same response as an existing user
    maker = async_sessionmaker(engine, expire_on_commit=False)
    async with maker() as s:
        n = await s.scalar(select(func.count()).select_from(Mail))
    assert n == 0  # no email queued


@pytest.mark.asyncio
async def test_reset_with_bad_token_rejected(client, engine):
    ac, _ = client
    r = await ac.post("/api/auth/password/reset", json={"token": "bogus", "new_password": "x"})
    assert r.status_code == 400
