"""Fase 3 verification: auth flows, RBAC, 2FA, rate limiting, security headers."""

import pyotp
import pytest
from fastapi import HTTPException

from app.auth import totp
from app.auth.deps import require_roles, require_whistleblower
from app.auth.passwords import authenticate, provision_credentials
from app.auth.sessions import Session, store
from app.core import ratelimit
from app.db.enums import UserRole
from app.db.models import AppUser

# --- HTTP flow tests -------------------------------------------------------


@pytest.mark.asyncio
async def test_login_success(client):
    ac, data = client
    resp = await ac.post(
        "/api/auth/login", json={"username": "admin", "password": data["admin_password"]}
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["role"] == "admin"
    assert body["token"]


@pytest.mark.asyncio
async def test_login_wrong_password(client):
    ac, _ = client
    resp = await ac.post("/api/auth/login", json={"username": "admin", "password": "nope"})
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_me_requires_auth(client):
    ac, _ = client
    assert (await ac.get("/api/auth/me")).status_code == 401


@pytest.mark.asyncio
async def test_me_with_token(client):
    ac, data = client
    token = (
        await ac.post(
            "/api/auth/login", json={"username": "admin", "password": data["admin_password"]}
        )
    ).json()["token"]
    resp = await ac.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200
    assert resp.json()["role"] == "admin"


@pytest.mark.asyncio
async def test_receipt_login(client):
    ac, data = client
    resp = await ac.post("/api/auth/receipt", json={"receipt": data["receipt"]})
    assert resp.status_code == 200
    assert resp.json()["report_id"]


@pytest.mark.asyncio
async def test_receipt_invalid(client):
    ac, _ = client
    assert (await ac.post("/api/auth/receipt", json={"receipt": "0000000000000000"})).status_code == 401


@pytest.mark.asyncio
async def test_rate_limit_login(client):
    ac, _ = client
    last = None
    for _ in range(6):
        last = await ac.post("/api/auth/login", json={"username": "admin", "password": "x"})
    assert last.status_code == 429


@pytest.mark.asyncio
async def test_security_headers(client):
    ac, _ = client
    resp = await ac.get("/api/health")
    assert resp.headers["X-Frame-Options"] == "DENY"
    assert resp.headers["X-Content-Type-Options"] == "nosniff"
    assert resp.headers["Referrer-Policy"] == "no-referrer"


# --- Unit tests ------------------------------------------------------------


def test_passwords_provision_and_authenticate():
    user = AppUser(tenant_id=1, username="u", role=UserRole.recipient)
    provision_credentials(user, "s3cret")
    assert authenticate(user, "s3cret") is not None
    assert authenticate(user, "wrong") is None


def test_totp_verify():
    secret = totp.generate_secret()
    assert totp.verify(secret, pyotp.TOTP(secret).now())
    assert not totp.verify(secret, "000000")


def test_rbac_role_dependency():
    admin_dep = require_roles("admin")
    s_admin = Session(kind="user", tenant_id=1, role="admin")
    assert admin_dep(s_admin) is s_admin
    s_recipient = Session(kind="user", tenant_id=1, role="recipient")
    with pytest.raises(HTTPException):
        admin_dep(s_recipient)
    # whistleblower session rejected from user-only routes
    s_wb = Session(kind="whistleblower", tenant_id=1, role="whistleblower")
    with pytest.raises(HTTPException):
        admin_dep(s_wb)


def test_rbac_whistleblower_dependency():
    s_wb = Session(kind="whistleblower", tenant_id=1, role="whistleblower")
    assert require_whistleblower(s_wb) is s_wb
    with pytest.raises(HTTPException):
        require_whistleblower(Session(kind="user", tenant_id=1, role="admin"))


def test_session_store_lifecycle():
    token = store.create(Session(kind="user", tenant_id=1, role="admin"))
    assert store.get(token) is not None
    store.delete(token)
    assert store.get(token) is None


def test_ratelimit_allows_then_blocks():
    ratelimit.reset()
    assert ratelimit.allow("k", limit=2, window_seconds=60)
    assert ratelimit.allow("k", limit=2, window_seconds=60)
    assert not ratelimit.allow("k", limit=2, window_seconds=60)
