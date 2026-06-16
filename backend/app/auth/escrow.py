"""Tenant key escrow for controlled administrative recovery.

Model:
  * Per-tenant escrow keypair. `escrow_pub` is stored on the tenant.
  * The escrow PRIVATE key is sealed to each admin's public key
    (`AppUser.crypto_escrow_prv_key`) — only admins can unlock it, with their
    own session key.
  * Each user's private key is sealed to `escrow_pub`
    (`AppUser.escrow_recoverable_key`) — so an admin holding the escrow private
    key can recover that user's account WITHOUT losing report access.
"""

from app import crypto
from app.auth import passwords
from app.db.models import AppUser, Tenant


def init_escrow(tenant: Tenant, admin: AppUser, admin_password: str) -> str:
    """Bootstrap escrow with the first admin. Returns the admin recovery key."""
    escrow_pub, escrow_prv = crypto.generate_keypair()
    tenant.escrow_pub = escrow_pub
    recovery_key = passwords.provision_credentials(admin, admin_password, escrow_pub=escrow_pub)
    admin.crypto_escrow_prv_key = crypto.wrap_report_key_for_recipient(escrow_prv, admin.crypto_pub_key)
    return recovery_key


def unlock_escrow_prv(admin: AppUser, admin_private_key_b64: str) -> str | None:
    """Recover the escrow private key from an admin's (session) private key."""
    if not admin.crypto_escrow_prv_key:
        return None
    try:
        return crypto.unwrap_report_key_with_private(admin.crypto_escrow_prv_key, admin_private_key_b64)
    except Exception:
        return None


def grant_escrow_to_admin(escrow_prv_b64: str, new_admin: AppUser) -> None:
    """Seal the escrow private key to a newly-created admin."""
    new_admin.crypto_escrow_prv_key = crypto.wrap_report_key_for_recipient(
        escrow_prv_b64, new_admin.crypto_pub_key
    )


def recover_user(escrow_prv_b64: str, target: AppUser, new_password: str) -> str | None:
    """Recover a user via escrow, preserving their keypair. Returns the new recovery key."""
    if not target.escrow_recoverable_key:
        return None
    try:
        user_prv = crypto.unwrap_report_key_with_private(target.escrow_recoverable_key, escrow_prv_b64)
    except Exception:
        return None
    return passwords.set_password_with_prv(target, new_password, user_prv)
