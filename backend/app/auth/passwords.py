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


def provision_credentials(user: AppUser, password: str) -> None:
    """Set salt, password verifier and a fresh keypair (private key wrapped)."""
    salt = crypto.new_salt()
    key = crypto.derive_key(password, salt)
    pub, prv = crypto.generate_keypair()
    user.salt = salt
    user.password_hash = crypto.auth_hash(key)
    user.crypto_pub_key = pub
    user.crypto_prv_key = crypto.encrypt_private_key(key, prv)
    user.password_change_needed = False


def authenticate(user: AppUser, password: str) -> str | None:
    """Return the user's unlocked private key (b64) on success, else None."""
    key = crypto.verify_password(password, user.salt, user.password_hash)
    if key is None:
        return None
    if not user.crypto_prv_key:
        return ""  # account without keys yet (e.g. seeded before first password)
    return crypto.decrypt_private_key(key, user.crypto_prv_key)
