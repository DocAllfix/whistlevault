"""R9 verification: recovery key preserves report access across password reset."""

import pytest

from app import crypto
from app.auth.passwords import provision_credentials, recover_with_recovery_key
from app.db.enums import UserRole
from app.db.models import AppUser
from tests.test_cases import _auth, _login


def _user() -> AppUser:
    return AppUser(tenant_id=1, username="u", role=UserRole.recipient)


def test_recovery_preserves_report_access():
    user = _user()
    rec = provision_credentials(user, "Pw1!")
    # A report key wrapped for this user.
    _, report_prv = crypto.generate_keypair()
    wrapped = crypto.wrap_report_key_for_recipient(report_prv, user.crypto_pub_key)

    new_rec = recover_with_recovery_key(user, rec, "Pw2!")
    assert new_rec is not None and new_rec != rec

    # Login with the NEW password yields the SAME private key → report still readable.
    key = crypto.verify_password("Pw2!", user.salt, user.password_hash)
    assert key is not None
    prv = crypto.decrypt_private_key(key, user.crypto_prv_key)
    assert crypto.unwrap_report_key_with_private(wrapped, prv) == report_prv


def test_rotate_without_recovery_loses_access():
    user = _user()
    provision_credentials(user, "Pw1!")
    _, report_prv = crypto.generate_keypair()
    wrapped = crypto.wrap_report_key_for_recipient(report_prv, user.crypto_pub_key)

    old_pub = user.crypto_pub_key
    provision_credentials(user, "Pw2!")  # admin-style rotation
    assert user.crypto_pub_key != old_pub

    key = crypto.verify_password("Pw2!", user.salt, user.password_hash)
    prv = crypto.decrypt_private_key(key, user.crypto_prv_key)
    with pytest.raises(Exception):
        crypto.unwrap_report_key_with_private(wrapped, prv)


def test_wrong_recovery_key_rejected():
    user = _user()
    provision_credentials(user, "Pw1!")
    assert recover_with_recovery_key(user, crypto.generate_recovery_key(), "Pw2!") is None


@pytest.mark.asyncio
async def test_create_user_returns_recovery_key(client):
    ac, data = client
    tok = await _login(ac, "admin", data["admin_password"])
    r = await ac.post(
        "/api/admin/users",
        json={"username": "u2", "password": "Pw1Pass!", "role": "recipient"},
        headers=_auth(tok),
    )
    assert r.status_code == 200
    assert r.json().get("recovery_key")
