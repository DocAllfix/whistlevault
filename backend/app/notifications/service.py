"""Notification queueing. Bodies are intentionally content-free (privacy)."""

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import AppUser, ContextRecipient, Mail

NEW_REPORT_SUBJECT = "Nuova segnalazione ricevuta"
NEW_REPORT_BODY = (
    "È stata ricevuta una nuova segnalazione sul canale di whistleblowing.\n"
    "Accedi alla piattaforma per visualizzarla. Per motivi di riservatezza "
    "nessun dettaglio è incluso in questa email."
)


async def enqueue(db: AsyncSession, *, tenant_id: int, address: str, subject: str, body: str) -> None:
    if not address:
        return
    db.add(Mail(tenant_id=tenant_id, address=address, subject=subject, body=body))


async def notify_new_report(db: AsyncSession, *, tenant_id: int, context_id) -> None:
    """Queue a generic 'new report' email to each recipient with an address."""
    recipients = (
        await db.scalars(
            select(AppUser)
            .join(ContextRecipient, ContextRecipient.recipient_id == AppUser.id)
            .where(ContextRecipient.context_id == context_id, AppUser.enabled.is_(True))
        )
    ).all()
    for r in recipients:
        if r.mail_address:
            await enqueue(
                db,
                tenant_id=tenant_id,
                address=r.mail_address,
                subject=NEW_REPORT_SUBJECT,
                body=NEW_REPORT_BODY,
            )
