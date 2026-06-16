"""TOTP two-factor authentication helpers (RFC 6238)."""

import pyotp


def generate_secret() -> str:
    return pyotp.random_base32()


def provisioning_uri(secret: str, username: str, issuer: str = "WhistleBlower") -> str:
    return pyotp.TOTP(secret).provisioning_uri(name=username, issuer_name=issuer)


def verify(secret: str, code: str) -> bool:
    if not secret or not code:
        return False
    # valid_window=1 tolerates ~30s clock drift on each side.
    return pyotp.TOTP(secret).verify(code, valid_window=1)
