"""R6 verification: per-event notifications (comment, expiry) + template override."""

import uuid as uuidlib

import pytest
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import async_sessionmaker

from app.db.models import AppUser, Mail, Report
from app.jobs import tasks
from app.notifications import service as notifications
from tests.test_cases import _answers, _auth, _login


def _h(t):
    return {"Authorization": f"Bearer {t}"}


async def _set_admin_mail(engine, address="rpct@example.org"):
    maker = async_sessionmaker(engine, expire_on_commit=False)
    async with maker() as s:
        await s.execute(update(AppUser).where(AppUser.username == "admin").values(mail_address=address))
        await s.commit()


@pytest.mark.asyncio
async def test_new_comment_notifies_recipients(client, engine):
    ac, _ = client
    await _set_admin_mail(engine)
    answers = await _answers(engine)
    submit = (await ac.post("/api/report", json={"answers": answers})).json()
    await ac.post("/api/report/me/comments", json={"content": "ciao riservato"}, headers=_h(submit["token"]))

    maker = async_sessionmaker(engine, expire_on_commit=False)
    async with maker() as s:
        mails = (await s.scalars(select(Mail))).all()
    subjects = [m.subject for m in mails]
    assert notifications.DEFAULT_TEMPLATES["new_comment"][0] in subjects
    assert all("ciao riservato" not in m.body for m in mails)  # content never leaks


@pytest.mark.asyncio
async def test_reminder_job_notifies_once(client, engine):
    ac, data = client
    await _set_admin_mail(engine)
    tok = await _login(ac, "admin", data["admin_password"])
    ctx_id = (await ac.get("/api/admin/contexts", headers=_h(tok))).json()[0]["id"]
    await ac.patch(f"/api/admin/contexts/{ctx_id}", json={"tip_reminder_days": 1000}, headers=_h(tok))

    answers = await _answers(engine)
    await ac.post("/api/report", json={"answers": answers})

    maker = async_sessionmaker(engine, expire_on_commit=False)
    async with maker() as s:
        n = await tasks.run_reminders(s)
    assert n >= 1
    async with maker() as s:
        assert notifications.DEFAULT_TEMPLATES["expiring"][0] in [m.subject for m in (await s.scalars(select(Mail))).all()]
    # Not re-sent on a second run.
    async with maker() as s:
        assert await tasks.run_reminders(s) == 0


@pytest.mark.asyncio
async def test_template_override(client, engine):
    ac, data = client
    tok = await _login(ac, "admin", data["admin_password"])
    await ac.put(
        "/api/admin/settings",
        json={"settings": {"mail_templates": {"new_report": {"subject": "X-CUSTOM", "body": "corpo generico"}}}},
        headers=_h(tok),
    )
    await _set_admin_mail(engine)
    answers = await _answers(engine)
    await ac.post("/api/report", json={"answers": answers})

    maker = async_sessionmaker(engine, expire_on_commit=False)
    async with maker() as s:
        subjects = [m.subject for m in (await s.scalars(select(Mail))).all()]
    assert "X-CUSTOM" in subjects
