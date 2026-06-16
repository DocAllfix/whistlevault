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


def provision_credentials(user: AppUser, password: str) -> str:
    """Set salt, verifier and a fresh keypair. Returns the recovery key (show once).

    The private key is wrapped two ways: under the password-derived key (login) and
    under a random recovery key (account recovery without losing report access).
    """
    salt = crypto.new_salt()
    key = crypto.derive_key(password, salt)
    pub, prv = crypto.generate_keypair()
    recovery_key = crypto.generate_recovery_key()
    user.salt = salt
    user.password_hash = crypto.auth_hash(key)
    user.crypto_pub_key = pub
    user.crypto_prv_key = crypto.encrypt_private_key(key, prv)
    user.crypto_rec_key = crypto.encrypt_private_key_with_recovery(recovery_key, prv)
    user.password_change_needed = False
    return recovery_key


def recover_with_recovery_key(user: AppUser, recovery_key: str, new_password: str) -> str | None:
    """Reset the password WITHOUT losing the keypair (report access preserved).

    Returns a fresh recovery key on success, or None if the recovery key is wrong.
    """
    try:
        prv = crypto.decrypt_private_key_with_recovery(recovery_key, user.crypto_rec_key)
    except Exception:
        return None
    salt = crypto.new_salt()
    key = crypto.derive_key(new_password, salt)
    user.salt = salt
    user.password_hash = crypto.auth_hash(key)
    user.crypto_prv_key = crypto.encrypt_private_key(key, prv)  # same private key, new password
    new_recovery = crypto.generate_recovery_key()
    user.crypto_rec_key = crypto.encrypt_private_key_with_recovery(new_recovery, prv)
    user.password_change_needed = False
    return new_recovery


def authenticate(user: AppUser, password: str) -> str | None:
    """Return the user's unlocked private key (b64) on success, else None."""
    key = crypto.verify_password(password, user.salt, user.password_hash)
    if key is None:
        return None
    if not user.crypto_prv_key:
        return ""  # account without keys yet (e.g. seeded before first password)
    return crypto.decrypt_private_key(key, user.crypto_prv_key)
