"""Handler credential provisioning and verification.

Login is bound to encryption: the password derives a key that (1) verifies the
user and (2) unwraps the user's private key, enabling decryption of reports.
"""

from app import crypto
from app.db.models import AppUser

# Fixed salt used to spend comparable time when the user does not exist,
# mitigating username enumeration via login timing.
_DUMMY_SALT = crypto.new_salt()


def waste_time() -> None:
    """Run a throwaway KDF so a missing user takes ~the same time as a real one."""
    crypto.derive_key("invalid-password", _DUMMY_SALT)


def set_password_with_prv(user: AppUser, new_password: str, private_key_b64: str) -> str:
    """(Re)wrap the GIVEN private key under a new password + a fresh recovery key.

    The public/private keypair is preserved → existing report access is kept.
    Returns the new recovery key.
    """
    salt = crypto.new_salt()
    key = crypto.derive_key(new_password, salt)
    recovery_key = crypto.generate_recovery_key()
    user.salt = salt
    user.password_hash = crypto.auth_hash(key)
    user.crypto_prv_key = crypto.encrypt_private_key(key, private_key_b64)
    user.crypto_rec_key = crypto.encrypt_private_key_with_recovery(recovery_key, private_key_b64)
    user.password_change_needed = False
    return recovery_key


def provision_credentials(user: AppUser, password: str, escrow_pub: str | None = None) -> str:
    """Set salt, verifier and a FRESH keypair. Returns the recovery key (show once).

    If `escrow_pub` is given, the new private key is also sealed to the tenant escrow
    key, enabling controlled administrative recovery later.
    """
    pub, prv = crypto.generate_keypair()
    user.crypto_pub_key = pub
    recovery_key = set_password_with_prv(user, password, prv)
    if escrow_pub:
        user.escrow_recoverable_key = crypto.wrap_report_key_for_recipient(prv, escrow_pub)
    return recovery_key


def recover_with_recovery_key(user: AppUser, recovery_key: str, new_password: str) -> str | None:
    """Reset the password WITHOUT losing the keypair. Returns a fresh recovery key, or None."""
    try:
        prv = crypto.decrypt_private_key_with_recovery(recovery_key, user.crypto_rec_key)
    except Exception:
        return None
    return set_password_with_prv(user, new_password, prv)


def authenticate(user: AppUser, password: str) -> str | None:
    """Return the user's unlocked private key (b64) on success, else None."""
    key = crypto.verify_password(password, user.salt, user.password_hash)
    if key is None:
        return None
    if not user.crypto_prv_key:
        return ""  # account without keys yet (e.g. seeded before first password)
    return crypto.decrypt_private_key(key, user.crypto_prv_key)
