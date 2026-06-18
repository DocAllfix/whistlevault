"""Targeted tests for the security-audit fixes (H2, M3, M7).

H1/H4 are exercised indirectly by the whole client suite (every request flows
through the tenant resolver fallback; ZK uses the peppered lookup).
"""

import hashlib

import pytest

from app import crypto
from app.cases.router import _content_disposition
from app.files import storage


def test_hash_receipt_is_peppered_not_plain_sha256():
    # H2: a DB-only attacker must not be able to confirm guesses with a plain
    # unsalted SHA-256 rainbow table — the lookup is HMAC(pepper, x).
    assert crypto.hash_receipt("0123456789012345") != hashlib.sha256(b"0123456789012345").hexdigest()
    # Deterministic for a fixed pepper (so lookups still work).
    assert crypto.hash_receipt("abc") == crypto.hash_receipt("abc")


def test_content_disposition_blocks_header_injection():
    # M3: a malicious (whistleblower-supplied) filename with CRLF must not break
    # out of the header.
    cd = _content_disposition('evil"\r\nSet-Cookie: pwned=1\r\n\r\n.pdf')
    assert "\r" not in cd and "\n" not in cd
    assert cd.startswith("attachment;")


@pytest.mark.parametrize("bad", ["../etc/passwd", "1/../../x", "/abs/path", "..", "zz" * 16 + "/x"])
def test_storage_rejects_path_traversal(bad):
    # M7: reference_id is validated against traversal before being joined.
    with pytest.raises(ValueError):
        storage._resolve(bad)


def test_storage_accepts_valid_reference_ids():
    flat = "a" * 32
    namespaced = "7/" + "b" * 32
    assert storage._resolve(flat).endswith(flat)
    assert storage._resolve(namespaced).endswith(namespaced.replace("/", "\\")) or storage._resolve(
        namespaced
    ).endswith(namespaced)
