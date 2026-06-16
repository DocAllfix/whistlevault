"""Cryptography primitives and key-flow helpers (libsodium via PyNaCl).

Design (reimplemented from documented best practice; our own code):

Key hierarchy
  * Each HANDLER has a Curve25519 keypair. The private key is stored encrypted
    with a key derived from the handler password (Argon2id). Login derives that
    key and unlocks the private key.
  * Each REPORT has a Curve25519 keypair. Sensitive content (answers, comments,
    file metadata) is sealed to the report PUBLIC key, so anyone holding the
    report PRIVATE key can read it.
  * The report private key is made available to the right parties WITHOUT
    storing it in clear:
      - Whistleblower path: secretbox(report_prv) with a key derived from the
        16-digit receipt (Argon2id + per-report salt).
      - Recipient path: sealed_box(report_prv) to each authorized recipient's
        public key (stored per recipient).
      - (Escrow/admin recovery: sealed to an escrow public key — added later.)

All binary values are returned/consumed as base64 strings for DB storage.
"""

import base64
import hashlib
import secrets

import nacl.pwhash
import nacl.secret
import nacl.utils
from nacl.public import PrivateKey, PublicKey, SealedBox

from app.core.config import get_settings

# Argon2id cost levels. "interactive" (64 MiB / 2 iters) already exceeds the
# OWASP minimum for Argon2id; "moderate"/"sensitive" raise resistance further.
_ARGON2_LEVELS = {
    "interactive": (nacl.pwhash.argon2id.OPSLIMIT_INTERACTIVE, nacl.pwhash.argon2id.MEMLIMIT_INTERACTIVE),
    "moderate": (nacl.pwhash.argon2id.OPSLIMIT_MODERATE, nacl.pwhash.argon2id.MEMLIMIT_MODERATE),
    "sensitive": (nacl.pwhash.argon2id.OPSLIMIT_SENSITIVE, nacl.pwhash.argon2id.MEMLIMIT_SENSITIVE),
}


def _argon2_params() -> tuple[int, int]:
    level = get_settings().argon2_level
    return _ARGON2_LEVELS.get(level, _ARGON2_LEVELS["interactive"])


_KDF_KEYLEN = nacl.secret.SecretBox.KEY_SIZE  # 32 bytes
_SALT_BYTES = nacl.pwhash.argon2id.SALTBYTES


def _b64e(raw: bytes) -> str:
    return base64.b64encode(raw).decode("ascii")


def _b64d(value: str) -> bytes:
    return base64.b64decode(value.encode("ascii"))


# --- Asymmetric (Curve25519 sealed box) ------------------------------------
def generate_keypair() -> tuple[str, str]:
    """Return (public_key_b64, private_key_b64)."""
    prv = PrivateKey.generate()
    return _b64e(prv.public_key.encode()), _b64e(prv.encode())


def seal(public_key_b64: str, data: bytes) -> str:
    """Anonymous public-key encryption to the given public key."""
    box = SealedBox(PublicKey(_b64d(public_key_b64)))
    return _b64e(box.encrypt(data))


def unseal(private_key_b64: str, ciphertext_b64: str) -> bytes:
    box = SealedBox(PrivateKey(_b64d(private_key_b64)))
    return box.decrypt(_b64d(ciphertext_b64))


# --- Symmetric (XSalsa20-Poly1305 secret box) ------------------------------
def new_symmetric_key() -> bytes:
    return nacl.utils.random(_KDF_KEYLEN)


def secretbox_encrypt(key: bytes, data: bytes) -> str:
    return _b64e(nacl.secret.SecretBox(key).encrypt(data))


def secretbox_decrypt(key: bytes, ciphertext_b64: str) -> bytes:
    return nacl.secret.SecretBox(key).decrypt(_b64d(ciphertext_b64))


# --- Password / key derivation (Argon2id) ----------------------------------
def new_salt() -> str:
    return _b64e(nacl.utils.random(_SALT_BYTES))


def derive_key(password: str, salt_b64: str) -> bytes:
    """Derive a 32-byte symmetric key from a password/secret and salt."""
    opslimit, memlimit = _argon2_params()
    return nacl.pwhash.argon2id.kdf(
        _KDF_KEYLEN,
        password.encode("utf-8"),
        _b64d(salt_b64),
        opslimit=opslimit,
        memlimit=memlimit,
    )


def auth_hash(key: bytes) -> str:
    """Verifier stored in DB: SHA-256 of the derived key (never the key itself)."""
    return hashlib.sha256(key).hexdigest()


def verify_password(password: str, salt_b64: str, expected_hash: str) -> bytes | None:
    """Return the derived key if the password matches, else None (constant-time)."""
    key = derive_key(password, salt_b64)
    if secrets.compare_digest(auth_hash(key), expected_hash):
        return key
    return None


# --- Whistleblower receipt --------------------------------------------------
def generate_receipt() -> str:
    """16-digit numeric receipt (no account, no email)."""
    return "".join(secrets.choice("0123456789") for _ in range(16))


def hash_receipt(receipt: str) -> str:
    """Lookup hash for the receipt (indexed in DB). Not used for key derivation."""
    return hashlib.sha256(receipt.encode("utf-8")).hexdigest()


# --- Report key custody -----------------------------------------------------
def wrap_report_key_for_secret(report_private_key_b64: str, secret: str, salt_b64: str) -> str:
    """Encrypt the report private key with a key derived from a secret (e.g. receipt)."""
    key = derive_key(secret, salt_b64)
    return secretbox_encrypt(key, _b64d(report_private_key_b64))


def unwrap_report_key_with_secret(wrapped_b64: str, secret: str, salt_b64: str) -> str:
    key = derive_key(secret, salt_b64)
    return _b64e(secretbox_decrypt(key, wrapped_b64))


def encrypt_private_key(key: bytes, private_key_b64: str) -> str:
    """Wrap a private key with an already-derived symmetric key (e.g. user login key)."""
    return secretbox_encrypt(key, _b64d(private_key_b64))


def decrypt_private_key(key: bytes, wrapped_b64: str) -> str:
    return _b64e(secretbox_decrypt(key, wrapped_b64))


def generate_recovery_key() -> str:
    """A 32-byte recovery key (b64). Shown to the user once; never stored in clear."""
    return _b64e(new_symmetric_key())


def encrypt_private_key_with_recovery(recovery_key_b64: str, private_key_b64: str) -> str:
    return encrypt_private_key(_b64d(recovery_key_b64), private_key_b64)


def decrypt_private_key_with_recovery(recovery_key_b64: str, wrapped_b64: str) -> str:
    return decrypt_private_key(_b64d(recovery_key_b64), wrapped_b64)


def wrap_report_key_for_recipient(report_private_key_b64: str, recipient_public_key_b64: str) -> str:
    """Seal the report private key to a recipient's public key."""
    return seal(recipient_public_key_b64, _b64d(report_private_key_b64))


def unwrap_report_key_with_private(wrapped_b64: str, recipient_private_key_b64: str) -> str:
    return _b64e(unseal(recipient_private_key_b64, wrapped_b64))


# --- Content helpers --------------------------------------------------------
def encrypt_content(report_public_key_b64: str, plaintext: str) -> str:
    """Encrypt report content (answers/comments/metadata) to the report key."""
    return seal(report_public_key_b64, plaintext.encode("utf-8"))


def decrypt_content(report_private_key_b64: str, ciphertext_b64: str) -> str:
    return unseal(report_private_key_b64, ciphertext_b64).decode("utf-8")


# --- File encryption (chunked secret box) -----------------------------------
_CHUNK = 64 * 1024


def encrypt_file(key: bytes, data: bytes) -> bytes:
    """Encrypt a file as length-prefixed secretbox chunks. Returns raw bytes."""
    box = nacl.secret.SecretBox(key)
    out = bytearray()
    for i in range(0, max(len(data), 1), _CHUNK):
        chunk = data[i : i + _CHUNK]
        enc = box.encrypt(chunk)
        out += len(enc).to_bytes(4, "big") + enc
        if not data:
            break
    return bytes(out)


def decrypt_file(key: bytes, blob: bytes) -> bytes:
    box = nacl.secret.SecretBox(key)
    out = bytearray()
    pos = 0
    while pos < len(blob):
        n = int.from_bytes(blob[pos : pos + 4], "big")
        pos += 4
        out += box.decrypt(blob[pos : pos + n])
        pos += n
    return bytes(out)
