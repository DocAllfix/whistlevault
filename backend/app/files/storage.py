"""Encrypted attachment storage.

Each file is encrypted with a random per-file key; that key is sealed to the
report public key, so only holders of the report private key (whistleblower via
receipt, or authorized recipients) can decrypt it. On disk we store:

    [2-byte sealed-key length][sealed file key][encrypted file blob]

The on-disk name is an opaque reference id (no "talking" names), namespaced per
tenant (`<tenant_id>/<uuid hex>`) so a shared storage volume (multi-tenant
Option B) keeps each tenant's files in a separate directory (L4). All paths are
validated against directory traversal before use (M7).
"""

import os
import re
import uuid

from app import crypto
from app.core.config import get_settings

# Accepts the namespaced form "<tenant_id>/<32 hex>" and the legacy flat form.
_REF_RE = re.compile(r"(?:(\d+)/)?([0-9a-f]{32})\Z")


def _base_dir() -> str:
    path = get_settings().files_path
    os.makedirs(path, exist_ok=True)
    return path


def _resolve(reference_id: str) -> str:
    """Map a reference id to an absolute path inside the storage dir, safely.

    Rejects anything that is not exactly `<digits>/<32-hex>` or `<32-hex>`,
    which makes path traversal (``..``, absolute paths, separators) impossible.
    """
    m = _REF_RE.fullmatch(reference_id or "")
    if not m:
        raise ValueError("invalid reference_id")
    tenant_part, ref = m.group(1), m.group(2)
    base = _base_dir()
    return os.path.join(base, tenant_part, ref) if tenant_part else os.path.join(base, ref)


def store_encrypted(report_public_key_b64: str, content: bytes, *, tenant_id: int) -> str:
    """Encrypt and persist file content. Returns an opaque, tenant-namespaced id."""
    file_key = crypto.new_symmetric_key()
    sealed_key = crypto.seal(report_public_key_b64, file_key).encode("ascii")
    blob = crypto.encrypt_file(file_key, content)

    ref = uuid.uuid4().hex
    reference_id = f"{int(tenant_id)}/{ref}"
    path = _resolve(reference_id)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "wb") as fh:
        fh.write(len(sealed_key).to_bytes(2, "big"))
        fh.write(sealed_key)
        fh.write(blob)
    return reference_id


def load_decrypted(report_private_key_b64: str, reference_id: str) -> bytes:
    """Read and decrypt a stored file using the report private key."""
    with open(_resolve(reference_id), "rb") as fh:
        klen = int.from_bytes(fh.read(2), "big")
        sealed_key = fh.read(klen).decode("ascii")
        blob = fh.read()
    file_key = crypto.unseal(report_private_key_b64, sealed_key)
    return crypto.decrypt_file(file_key, blob)


def delete(reference_id: str) -> None:
    try:
        os.remove(_resolve(reference_id))
    except (FileNotFoundError, ValueError):
        pass
