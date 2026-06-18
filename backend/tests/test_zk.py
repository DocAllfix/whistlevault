"""R16 (Option A) verification: zero-knowledge return channel.

Simulates the browser client with PyNaCl: the server never receives the receipt
and never decrypts on re-entry — it returns ciphertext that only the client
(holding the receipt-derived key) can open.
"""

import base64
import hashlib
import json

import pytest
from nacl.public import PrivateKey, SealedBox

from tests.test_cases import _answers


def _b64e(b: bytes) -> str:
    return base64.b64encode(b).decode("ascii")


def _b64d(s: str) -> bytes:
    return base64.b64decode(s.encode("ascii"))


def _auth(t: str) -> dict:
    return {"Authorization": f"Bearer {t}"}


@pytest.mark.asyncio
async def test_zero_knowledge_return_channel(client, engine):
    ac, _ = client
    answers = await _answers(engine)

    # Client generates its receipt locally and derives a keypair from it.
    receipt = "1234567890123456"
    wb_prv = PrivateKey(hashlib.sha256(receipt.encode()).digest())
    wb_pub_b64 = _b64e(bytes(wb_prv.public_key))

    # Submit: the server receives wb_pub, NEVER the receipt.
    submit = await ac.post("/api/report", json={"answers": answers, "wb_pub": wb_pub_b64})
    assert submit.status_code == 200
    assert submit.json()["receipt"] == ""  # ZK mode: no server-issued receipt

    # Re-entry: the client sends wb_pub (public); the server applies the peppered
    # HMAC lookup itself and derives no key.
    re = await ac.post("/api/auth/receipt", json={"lookup": wb_pub_b64})
    assert re.status_code == 200
    tok = re.json()["token"]

    view = (await ac.get("/api/report/me", headers=_auth(tok))).json()
    assert view["zk"] is True
    assert "answers" not in view  # the server did NOT decrypt anything

    # Client unseals the report key with its receipt-derived key, then decrypts.
    report_prv_raw = SealedBox(wb_prv).decrypt(_b64d(view["sealed_report_prv"]))
    report_prv = PrivateKey(report_prv_raw)
    decrypted = json.loads(SealedBox(report_prv).decrypt(_b64d(view["answers_ct"])).decode("utf-8"))
    assert decrypted == answers


@pytest.mark.asyncio
async def test_legacy_receipt_flow_still_works(client, engine):
    """Without wb_pub the classic server-side flow is unchanged."""
    ac, _ = client
    answers = await _answers(engine)
    submit = (await ac.post("/api/report", json={"answers": answers})).json()
    assert len(submit["receipt"]) == 20
    re = await ac.post("/api/auth/receipt", json={"receipt": submit["receipt"]})
    assert re.status_code == 200
    view = (await ac.get("/api/report/me", headers=_auth(re.json()["token"]))).json()
    assert view["zk"] is False
    assert view["answers"] == answers
