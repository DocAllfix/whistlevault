"""Fase 7 verification: mail queue, new-report notification, retention, sweep."""

import os
import time

import pytest
from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import async_sessionmaker
from sqlalchemy.orm import selectinload

from app.auth.sessions import Session, store
from app.core.config import get_settings
from app.db.base import utcnow
from app.db.models import AppUser, Mail, Questionnaire, Report, ReportFile, Step
from app.jobs import tasks
from app.notifications import service as notifications


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
        str(f.id): ("Corruzione" if f.type == "select" else "testo")
        for step in q.steps
        for f in step.fields
        if f.required
    }


@pytest.mark.asyncio
async def test_mail_queue_flush(client, engine, monkeypatch):
    ac, _ = client
    maker = async_sessionmaker(engine, expire_on_commit=False)

    async with maker() as s:
        await notifications.enqueue(
            s, tenant_id=1, address="ufficio@example.org", subject="Test", body="Corpo"
        )
        await s.commit()

    sent_to = []

    async def fake_send(*, to, subject, body):
        sent_to.append(to)

    monkeypatch.setattr("app.notifications.mailer.send", fake_send)

    async with maker() as s:
        n = await tasks.run_notifications(s)
    assert n == 1
    assert sent_to == ["ufficio@example.org"]

    async with maker() as s:
        remaining = await s.scalar(select(func.count()).select_from(Mail).where(Mail.sent.is_(False)))
    assert remaining == 0


@pytest.mark.asyncio
async def test_new_report_enqueues_generic_notification(client, engine):
    ac, _ = client
    maker = async_sessionmaker(engine, expire_on_commit=False)
    # Give the recipient (seeded admin) an email address.
    async with maker() as s:
        await s.execute(update(AppUser).where(AppUser.username == "admin").values(mail_address="rpct@example.org"))
        await s.commit()

    answers = await _answers(engine)
    await ac.post("/api/report", json={"answers": answers})

    async with maker() as s:
        mail = await s.scalar(select(Mail).where(Mail.address == "rpct@example.org"))
    assert mail is not None
    # Privacy: the notification must not leak report content.
    assert "testo" not in mail.body
    assert "Corruzione" not in mail.body


@pytest.mark.asyncio
async def test_retention_deletes_expired_report_and_files(client, engine):
    ac, _ = client
    answers = await _answers(engine)
    submit = (await ac.post("/api/report", json={"answers": answers})).json()
    await ac.post(
        "/api/report/me/files",
        files={"file": ("x.txt", b"data", "text/plain")},
        headers=_auth(submit["token"]),
    )

    maker = async_sessionmaker(engine, expire_on_commit=False)
    async with maker() as s:
        report = await s.get(Report, __import__("uuid").UUID(submit["report_id"]))
        rf = await s.scalar(select(ReportFile).where(ReportFile.report_id == report.id))
        ref_path = os.path.join(get_settings().files_path, rf.reference_id)
        assert os.path.exists(ref_path)
        report.expiration_date = utcnow().replace(year=2000)
        await s.commit()

    async with maker() as s:
        deleted = await tasks.run_retention(s)
    assert deleted >= 1

    async with maker() as s:
        gone = await s.get(Report, __import__("uuid").UUID(submit["report_id"]))
    assert gone is None
    assert not os.path.exists(ref_path)  # encrypted blob removed from disk


def test_session_sweep_removes_expired():
    token = "expired-token"
    store._sessions[token] = Session(kind="user", tenant_id=1, role="admin", expires_at=time.time() - 10)
    removed = tasks.run_session_sweep()
    assert removed >= 1
    assert store.get(token) is None
