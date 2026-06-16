"""TOTP two-factor authentication helpers (RFC 6238)."""

import hashlib
import secrets

import pyotp


def generate_secret() -> str:
    return pyotp.random_base32()


def hash_code(code: str) -> str:
    """SHA-256 of a recovery code (stored; the plaintext is shown once)."""
    return hashlib.sha256(code.strip().encode("utf-8")).hexdigest()


def generate_recovery_codes(n: int = 8) -> tuple[list[str], list[str]]:
    """Return (plaintext_codes, hashes). Plaintext is shown to the user once."""
    codes = ["-".join(secrets.token_hex(2) for _ in range(2)) for _ in range(n)]
    return codes, [hash_code(c) for c in codes]


def provisioning_uri(secret: str, username: str, issuer: str = "WhistleBlower") -> str:
    return pyotp.TOTP(secret).provisioning_uri(name=username, issuer_name=issuer)


def verify(secret: str, code: str) -> bool:
    if not secret or not code:
        return False
    # valid_window=1 tolerates ~30s clock drift on each side.
    return pyotp.TOTP(secret).verify(code, valid_window=1)
