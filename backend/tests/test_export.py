"""R4 verification: case export ZIP with decrypted answers + attachments."""

import io
import zipfile

import pytest

from tests.test_cases import _auth, _login
from tests.test_redaction import _answers_with


@pytest.mark.asyncio
async def test_export_case_zip(client, engine):
    ac, data = client
    answers = await _answers_with(engine, "contenuto da esportare")
    submit = (await ac.post("/api/report", json={"answers": answers})).json()
    report_id, wb_token = submit["report_id"], submit["token"]

    await ac.post(
        "/api/report/me/files",
        files={"file": ("prova.txt", b"allegato-bytes", "text/plain")},
        headers=_auth(wb_token),
    )

    tok = await _login(ac, "admin", data["admin_password"])
    resp = await ac.get(f"/api/cases/{report_id}/export", headers=_auth(tok))
    assert resp.status_code == 200
    assert resp.headers["content-type"] == "application/zip"

    z = zipfile.ZipFile(io.BytesIO(resp.content))
    names = z.namelist()
    assert "segnalazione.json" in names
    assert "messaggi.txt" in names
    attachments = [n for n in names if n.startswith("allegati/")]
    assert attachments and z.read(attachments[0]) == b"allegato-bytes"
    assert b"contenuto da esportare" in z.read("segnalazione.json")
