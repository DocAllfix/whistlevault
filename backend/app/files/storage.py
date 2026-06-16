"""Encrypted attachment storage.

Each file is encrypted with a random per-file key; that key is sealed to the
report public key, so only holders of the report private key (whistleblower via
receipt, or authorized recipients) can decrypt it. On disk we store:

    [2-byte sealed-key length][sealed file key][encrypted file blob]

The filename on disk is an opaque reference id (no "talking" names).
"""

import os
import uuid

from app import crypto
from app.core.config import get_settings


def _base_dir() -> str:
    path = get_settings().files_path
    os.makedirs(path, exist_ok=True)
    return path


def store_encrypted(report_public_key_b64: str, content: bytes) -> str:
    """Encrypt and persist file content. Returns an opaque reference id."""
    file_key = crypto.new_symmetric_key()
    sealed_key = crypto.seal(report_public_key_b64, file_key).encode("ascii")
    blob = crypto.encrypt_file(file_key, content)

    reference_id = uuid.uuid4().hex
    with open(os.path.join(_base_dir(), reference_id), "wb") as fh:
        fh.write(len(sealed_key).to_bytes(2, "big"))
        fh.write(sealed_key)
        fh.write(blob)
    return reference_id


def load_decrypted(report_private_key_b64: str, reference_id: str) -> bytes:
    """Read and decrypt a stored file using the report private key."""
    with open(os.path.join(_base_dir(), reference_id), "rb") as fh:
        klen = int.from_bytes(fh.read(2), "big")
        sealed_key = fh.read(klen).decode("ascii")
        blob = fh.read()
    file_key = crypto.unseal(report_private_key_b64, sealed_key)
    return crypto.decrypt_file(file_key, blob)


def delete(reference_id: str) -> None:
    try:
        os.remove(os.path.join(_base_dir(), reference_id))
    except FileNotFoundError:
        pass
