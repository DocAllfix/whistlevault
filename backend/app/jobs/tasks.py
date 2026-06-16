"""Background task bodies. Pure functions over a session, so they are unit-testable
independently of the scheduler.
"""

from datetime import timedelta, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.sessions import store
from app.db.base import utcnow
from app.db.models import Context, Mail, Report, ReportFile
from app.files import storage
from app.notifications import mailer
from app.notifications import service as notifications

MAX_ATTEMPTS = 5


async def run_notifications(db: AsyncSession) -> int:
    """Flush the outbound mail queue. Returns the number of mails sent."""
    pending = (
        await db.scalars(
            select(Mail).where(Mail.sent.is_(False), Mail.attempts < MAX_ATTEMPTS).limit(100)
        )
    ).all()
    sent = 0
    for mail in pending:
        mail.attempts += 1
        try:
            await mailer.send(to=mail.address, subject=mail.subject, body=mail.body)
            mail.sent = True
            sent += 1
        except Exception:
            # Leave unsent; will be retried until MAX_ATTEMPTS.
            pass
    await db.commit()
    return sent


async def run_retention(db: AsyncSession) -> int:
    """Delete reports past their expiration date (privacy retention). Returns count."""
    now = utcnow()
    expired = (
        await db.scalars(
            select(Report).where(Report.expiration_date.is_not(None), Report.expiration_date < now)
        )
    ).all()
    count = 0
    for report in expired:
        files = (
            await db.scalars(select(ReportFile).where(ReportFile.report_id == report.id))
        ).all()
        for f in files:
            if f.reference_id:
                storage.delete(f.reference_id)
        await db.delete(report)  # cascades to answers/comments/files/recipient links
        count += 1
    await db.commit()
    return count


async def run_reminders(db: AsyncSession) -> int:
    """Notify recipients of reports approaching their retention expiry (once)."""
    now = utcnow()
    rows = (
        await db.execute(
            select(Report, Context.tip_reminder_days)
            .join(Context, Context.id == Report.context_id)
            .where(
                Report.expiration_date.is_not(None),
                Report.reminder_date.is_(None),
                Context.tip_reminder_days > 0,
            )
        )
    ).all()
    count = 0
    for report, reminder_days in rows:
        exp = report.expiration_date
        if exp.tzinfo is None:  # SQLite returns naive datetimes
            exp = exp.replace(tzinfo=timezone.utc)
        if exp <= now + timedelta(days=reminder_days):
            await notifications.notify_recipients(
                db, tenant_id=report.tenant_id, context_id=report.context_id, event="expiring"
            )
            report.reminder_date = now
            count += 1
    await db.commit()
    return count


def run_session_sweep() -> int:
    """Drop expired in-memory sessions."""
    return store.sweep()
