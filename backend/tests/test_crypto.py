"""Fase 2 verification: crypto primitives and key-custody flows round-trip."""

from app import crypto


def test_sealed_box_roundtrip():
    pub, prv = crypto.generate_keypair()
    ct = crypto.seal(pub, b"secret payload")
    assert crypto.unseal(prv, ct) == b"secret payload"


def test_secretbox_roundtrip():
    key = crypto.new_symmetric_key()
    ct = crypto.secretbox_encrypt(key, b"data")
    assert crypto.secretbox_decrypt(key, ct) == b"data"


def test_derive_key_is_deterministic_and_salt_dependent():
    salt = crypto.new_salt()
    k1 = crypto.derive_key("hunter2", salt)
    k2 = crypto.derive_key("hunter2", salt)
    assert k1 == k2
    assert crypto.derive_key("hunter2", crypto.new_salt()) != k1


def test_password_verification():
    salt = crypto.new_salt()
    key = crypto.derive_key("correct horse", salt)
    h = crypto.auth_hash(key)
    assert crypto.verify_password("correct horse", salt, h) == key
    assert crypto.verify_password("wrong", salt, h) is None


def test_receipt_format():
    r = crypto.generate_receipt()
    assert len(r) == 16 and r.isdigit()
    assert crypto.hash_receipt(r) == crypto.hash_receipt(r)


def test_whistleblower_receipt_unlocks_report_key():
    report_pub, report_prv = crypto.generate_keypair()
    receipt = crypto.generate_receipt()
    salt = crypto.new_salt()

    wrapped = crypto.wrap_report_key_for_secret(report_prv, receipt, salt)
    recovered = crypto.unwrap_report_key_with_secret(wrapped, receipt, salt)
    assert recovered == report_prv

    # Content sealed to the report can then be read.
    ct = crypto.encrypt_content(report_pub, "il contenuto della segnalazione")
    assert crypto.decrypt_content(recovered, ct) == "il contenuto della segnalazione"


def test_recipient_can_unwrap_report_key():
    report_pub, report_prv = crypto.generate_keypair()
    rec_pub, rec_prv = crypto.generate_keypair()

    wrapped = crypto.wrap_report_key_for_recipient(report_prv, rec_pub)
    recovered = crypto.unwrap_report_key_with_private(wrapped, rec_prv)
    assert recovered == report_prv

    # A different recipient cannot.
    _, other_prv = crypto.generate_keypair()
    try:
        crypto.unwrap_report_key_with_private(wrapped, other_prv)
        raise AssertionError("decryption should have failed")
    except Exception:
        pass


def test_file_encryption_roundtrip():
    key = crypto.new_symmetric_key()
    for payload in [b"", b"small", b"x" * (64 * 1024 * 2 + 7)]:
        blob = crypto.encrypt_file(key, payload)
        assert crypto.decrypt_file(key, blob) == payload
