"""R2 verification: 2FA enrollment, login with TOTP / recovery code, disable."""

import pyotp
import pytest

from tests.test_cases import _login


def _auth(t: str) -> dict:
    return {"Authorization": f"Bearer {t}"}


@pytest.mark.asyncio
async def test_2fa_enrollment_login_and_recovery(client):
    ac, data = client
    tok = await _login(ac, "admin", data["admin_password"])

    init = await ac.post("/api/auth/2fa/init", headers=_auth(tok))
    assert init.status_code == 200
    secret = init.json()["secret"]
    assert init.json()["otpauth_uri"].startswith("otpauth://")

    conf = await ac.post(
        "/api/auth/2fa/confirm",
        json={"secret": secret, "code": pyotp.TOTP(secret).now()},
        headers=_auth(tok),
    )
    assert conf.status_code == 200
    recovery = conf.json()["recovery_codes"]
    assert len(recovery) == 8

    # Login now requires 2FA
    r = await ac.post("/api/auth/login", json={"username": "admin", "password": data["admin_password"]})
    assert r.status_code == 401

    # Login with a valid TOTP code
    r2 = await ac.post(
        "/api/auth/login",
        json={"username": "admin", "password": data["admin_password"], "totp_code": pyotp.TOTP(secret).now()},
    )
    assert r2.status_code == 200

    # Login with a recovery code (consumed)
    r3 = await ac.post(
        "/api/auth/login",
        json={"username": "admin", "password": data["admin_password"], "totp_code": recovery[0]},
    )
    assert r3.status_code == 200

    # Same recovery code no longer works
    r4 = await ac.post(
        "/api/auth/login",
        json={"username": "admin", "password": data["admin_password"], "totp_code": recovery[0]},
    )
    assert r4.status_code == 401


@pytest.mark.asyncio
async def test_2fa_disable(client):
    ac, data = client
    tok = await _login(ac, "admin", data["admin_password"])
    secret = (await ac.post("/api/auth/2fa/init", headers=_auth(tok))).json()["secret"]
    await ac.post(
        "/api/auth/2fa/confirm",
        json={"secret": secret, "code": pyotp.TOTP(secret).now()},
        headers=_auth(tok),
    )
    d = await ac.post(
        "/api/auth/2fa/disable", json={"code": pyotp.TOTP(secret).now()}, headers=_auth(tok)
    )
    assert d.status_code == 200
    # 2FA no longer required
    r = await ac.post("/api/auth/login", json={"username": "admin", "password": data["admin_password"]})
    assert r.status_code == 200
