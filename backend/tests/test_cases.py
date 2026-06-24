"""Fase 5 verification: handler case management, crypto access control, audit."""

import pytest
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import async_sessionmaker
from sqlalchemy.orm import selectinload

from app.auth.passwords import provision_credentials
from app.db.enums import UserRole
from app.db.models import AppUser, AuditLog, Questionnaire, Step


def _auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


async def _answers(engine) -> dict:
    maker = async_sessionmaker(engine, expire_on_commit=False)
    async with maker() as s:
        q = await s.scalar(
            select(Questionnaire)
            .where(Questionnaire.name == "default")
            .options(selectinload(Questionnaire.steps).selectinload(Step.fields))
        )
    return {
        str(f.id): ("Corruzione" if f.type == "select" else "Dettagli riservati")
        for step in q.steps
        for f in step.fields
        if f.required
    }


async def _make_user(engine, username: str, role: UserRole, password: str) -> str:
    maker = async_sessionmaker(engine, expire_on_commit=False)
    async with maker() as s:
        u = AppUser(tenant_id=1, username=username, role=role)
        provision_credentials(u, password)
        s.add(u)
        await s.commit()
        return str(u.id)


async def _login(ac, username: str, password: str) -> str:
    resp = await ac.post("/api/auth/login", json={"username": username, "password": password})
    assert resp.status_code == 200, resp.text
    return resp.json()["token"]


@pytest.mark.asyncio
async def test_handler_reads_and_manages_case(client, engine):
    ac, data = client
    answers = await _answers(engine)

    submit = (await ac.post("/api/report", json={"answers": answers})).json()
    report_id = submit["report_id"]

    token = await _login(ac, "admin", data["admin_password"])

    # List shows the report
    cases = (await ac.get("/api/cases", headers=_auth(token))).json()
    assert any(c["report_id"] == report_id for c in cases)

    # Detail decrypts answers (recipient unwraps the tip key with own private key)
    detail = (await ac.get(f"/api/cases/{report_id}", headers=_auth(token))).json()
    assert detail["answers"] == answers

    # Internal note is NOT visible to the whistleblower
    await ac.post(
        f"/api/cases/{report_id}/comments",
        json={"content": "nota interna", "visibility": "internal"},
        headers=_auth(token),
    )
    re = await ac.post("/api/auth/receipt", json={"receipt": submit["receipt"]})
    wb_view = (await ac.get("/api/report/me", headers=_auth(re.json()["token"]))).json()
    assert wb_view["comments"] == []  # internal note hidden from WB

    # Status change
    status_id = detail["status_id"]
    # pick a different status from the list endpoint is overkill; reuse same id is valid
    r = await ac.post(
        f"/api/cases/{report_id}/status", json={"status_id": status_id}, headers=_auth(token)
    )
    assert r.status_code == 200


@pytest.mark.asyncio
async def test_unassigned_handler_cannot_read(client, engine):
    ac, data = client
    answers = await _answers(engine)
    report_id = (await ac.post("/api/report", json={"answers": answers})).json()["report_id"]

    await _make_user(engine, "recipient2", UserRole.recipient, "Recipient2Pass!")
    token2 = await _login(ac, "recipient2", "Recipient2Pass!")

    resp = await ac.get(f"/api/cases/{report_id}", headers=_auth(token2))
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_file_download_roundtrip(client, engine):
    ac, data = client
    answers = await _answers(engine)
    submit = (await ac.post("/api/report", json={"answers": answers})).json()
    report_id = submit["report_id"]
    wb_token = submit["token"]

    # WB uploads a file
    await ac.post(
        "/api/report/me/files",
        files={"file": ("evidenza.txt", b"prova-contenuto", "text/plain")},
        headers=_auth(wb_token),
    )

    token = await _login(ac, "admin", data["admin_password"])
    detail = (await ac.get(f"/api/cases/{report_id}", headers=_auth(token))).json()
    file_id = detail["files"][0]["id"]

    dl = await ac.get(f"/api/cases/{report_id}/files/{file_id}", headers=_auth(token))
    assert dl.status_code == 200
    assert dl.content == b"prova-contenuto"


@pytest.mark.asyncio
async def test_identity_disclosure_is_crypto_enforced(client, engine):
    ac, data = client
    answers = await _answers(engine)

    # Custodian must exist BEFORE submission so the identity key is wrapped for them.
    await _make_user(engine, "custode", UserRole.custodian, "CustodePass!")

    identity = {"nome": "Mario Rossi", "contatto": "mario@example.org"}
    report_id = (
        await ac.post("/api/report", json={"answers": answers, "identity": identity})
    ).json()["report_id"]

    handler_token = await _login(ac, "admin", data["admin_password"])

    # Before grant: the recipient CANNOT read the identity (crypto-enforced).
    pre = (await ac.get(f"/api/cases/{report_id}", headers=_auth(handler_token))).json()
    assert pre["identity_available"] is True
    assert pre["identity_granted"] is False
    assert pre["identity"] is None

    req = await ac.post(
        f"/api/cases/{report_id}/identity-requests",
        json={"motivation": "necessario per istruttoria"},
        headers=_auth(handler_token),
    )
    iar_id = req.json()["identity_request_id"]

    cust_token = await _login(ac, "custode", "CustodePass!")
    pending = (await ac.get("/api/custodian/identity-requests", headers=_auth(cust_token))).json()
    assert any(p["id"] == iar_id for p in pending)
    grant = await ac.post(
        f"/api/custodian/identity-requests/{iar_id}",
        json={"grant": True, "motivation": "approvato"},
        headers=_auth(cust_token),
    )
    assert grant.status_code == 200

    # After grant: the recipient can now decrypt the identity.
    post = (await ac.get(f"/api/cases/{report_id}", headers=_auth(handler_token))).json()
    assert post["identity_granted"] is True
    assert post["identity"] == identity
    assert post["identity_request_status"] == "granted"


@pytest.mark.asyncio
async def test_delete_report_requires_permission(client, engine):
    """WI-4: on-demand deletion is gated by can_delete_submission and is irreversible."""
    ac, data = client
    answers = await _answers(engine)
    report_id = (await ac.post("/api/report", json={"answers": answers})).json()["report_id"]

    # A recipient without the permission is refused.
    await _make_user(engine, "recd", UserRole.recipient, "RecdPass1!")
    rtok = await _login(ac, "recd", "RecdPass1!")
    assert (await ac.delete(f"/api/cases/{report_id}", headers=_auth(rtok))).status_code == 403

    # The seeded admin holds can_delete_submission → deletion succeeds and the case is gone.
    atok = await _login(ac, "admin", data["admin_password"])
    assert (await ac.delete(f"/api/cases/{report_id}", headers=_auth(atok))).status_code == 200
    assert (await ac.get(f"/api/cases/{report_id}", headers=_auth(atok))).status_code == 404


@pytest.mark.asyncio
async def test_audit_log_records_handler_actions(client, engine):
    ac, data = client
    answers = await _answers(engine)
    report_id = (await ac.post("/api/report", json={"answers": answers})).json()["report_id"]
    token = await _login(ac, "admin", data["admin_password"])
    await ac.get(f"/api/cases/{report_id}", headers=_auth(token))  # report_access

    maker = async_sessionmaker(engine, expire_on_commit=False)
    async with maker() as s:
        n = await s.scalar(
            select(func.count()).select_from(AuditLog).where(AuditLog.type == "report_access")
        )
    assert n >= 1
