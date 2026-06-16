"""Notification queueing. Bodies are intentionally content-free (privacy).

Per-event templates can be overridden per tenant via `tenant.settings["mail_templates"]`
= {event: {"subject": "...", "body": "..."}}; otherwise the defaults below are used.
NEVER include report content in a notification.
"""

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import AppUser, ContextRecipient, Mail, Tenant

DEFAULT_TEMPLATES: dict[str, tuple[str, str]] = {
    "new_report": (
        "Nuova segnalazione ricevuta",
        "È stata ricevuta una nuova segnalazione sul canale di whistleblowing.\n"
        "Accedi alla piattaforma per visualizzarla. Per riservatezza nessun dettaglio è incluso.",
    ),
    "new_comment": (
        "Nuovo messaggio su una segnalazione",
        "È stato aggiunto un nuovo messaggio a una segnalazione.\n"
        "Accedi alla piattaforma per leggerlo. Per riservatezza nessun dettaglio è incluso.",
    ),
    "expiring": (
        "Segnalazione in scadenza",
        "Una segnalazione sta per raggiungere la scadenza di conservazione.\n"
        "Accedi alla piattaforma per gestirla. Per riservatezza nessun dettaglio è incluso.",
    ),
}


def _resolve_template(tenant: Tenant | None, event: str) -> tuple[str, str]:
    overrides = (tenant.settings or {}).get("mail_templates", {}) if tenant else {}
    tmpl = overrides.get(event)
    if isinstance(tmpl, dict) and tmpl.get("subject") and tmpl.get("body"):
        return tmpl["subject"], tmpl["body"]
    return DEFAULT_TEMPLATES[event]


async def enqueue(db: AsyncSession, *, tenant_id: int, address: str, subject: str, body: str) -> None:
    if not address:
        return
    db.add(Mail(tenant_id=tenant_id, address=address, subject=subject, body=body))


async def notify_recipients(db: AsyncSession, *, tenant_id: int, context_id, event: str) -> None:
    """Queue a generic, content-free email for each recipient of a context."""
    tenant = await db.get(Tenant, tenant_id)
    subject, body = _resolve_template(tenant, event)
    recipients = (
        await db.scalars(
            select(AppUser)
            .join(ContextRecipient, ContextRecipient.recipient_id == AppUser.id)
            .where(ContextRecipient.context_id == context_id, AppUser.enabled.is_(True))
        )
    ).all()
    for r in recipients:
        if r.mail_address:
            await enqueue(db, tenant_id=tenant_id, address=r.mail_address, subject=subject, body=body)


async def notify_new_report(db: AsyncSession, *, tenant_id: int, context_id) -> None:
    await notify_recipients(db, tenant_id=tenant_id, context_id=context_id, event="new_report")
