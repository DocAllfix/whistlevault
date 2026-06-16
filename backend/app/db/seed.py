"""Idempotent seed: default tenant, admin, workflow statuses, default questionnaire.

Real admin credentials/crypto are provisioned in the auth phase; here we create
the records so the platform is usable out of the box.
"""

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.enums import UserRole
from app.db.models import (
    AppUser,
    Context,
    ContextRecipient,
    Field,
    FieldOption,
    Questionnaire,
    Step,
    SubmissionStatus,
    Tenant,
)

DEFAULT_TENANT_ID = 1


async def seed(session: AsyncSession) -> None:
    await _seed_tenant(session)
    admin = await _seed_admin(session)
    await _seed_statuses(session)
    questionnaire = await _seed_default_questionnaire(session)
    await _seed_default_context(session, questionnaire, admin)
    await session.commit()


async def _seed_tenant(session: AsyncSession) -> Tenant:
    tenant = await session.get(Tenant, DEFAULT_TENANT_ID)
    if tenant is None:
        tenant = Tenant(id=DEFAULT_TENANT_ID, label="Default organization", active=True)
        session.add(tenant)
        await session.flush()
    return tenant


async def _seed_admin(session: AsyncSession) -> AppUser:
    existing = await session.scalar(
        select(AppUser).where(
            AppUser.tenant_id == DEFAULT_TENANT_ID, AppUser.username == "admin"
        )
    )
    if existing:
        return existing
    admin = AppUser(
        tenant_id=DEFAULT_TENANT_ID,
        username="admin",
        role=UserRole.admin,
        name="Administrator",
        language="it",
        password_change_needed=True,
        can_delete_submission=True,
        can_grant_access_to_reports=True,
        can_redact_information=True,
        can_edit_general_settings=True,
    )
    session.add(admin)
    await session.flush()
    return admin


async def _seed_statuses(session: AsyncSession) -> None:
    existing = await session.scalar(
        select(SubmissionStatus.id).where(SubmissionStatus.tenant_id == DEFAULT_TENANT_ID)
    )
    if existing:
        return
    defaults = [
        ({"it": "Nuova", "en": "New"}, 0),
        ({"it": "In gestione", "en": "Opened"}, 1),
        ({"it": "Chiusa", "en": "Closed"}, 2),
    ]
    for label, order in defaults:
        session.add(
            SubmissionStatus(
                tenant_id=DEFAULT_TENANT_ID, label=label, order=order, system_defined=True
            )
        )


async def _seed_default_questionnaire(session: AsyncSession) -> Questionnaire:
    existing = await session.scalar(
        select(Questionnaire).where(
            Questionnaire.tenant_id == DEFAULT_TENANT_ID, Questionnaire.name == "default"
        )
    )
    if existing:
        return existing

    q = Questionnaire(tenant_id=DEFAULT_TENANT_ID, name="default")
    step = Step(
        label={"it": "Segnalazione", "en": "Report"},
        description={"it": "Descrivi l'accaduto.", "en": "Describe what happened."},
        order=0,
    )
    category = Field(
        label={"it": "Categoria", "en": "Category"},
        type="select",
        required=True,
        order=0,
        options=[
            FieldOption(label={"it": "Corruzione", "en": "Corruption"}, order=0),
            FieldOption(label={"it": "Frode", "en": "Fraud"}, order=1),
            FieldOption(label={"it": "Sicurezza sul lavoro", "en": "Workplace safety"}, order=2),
            FieldOption(label={"it": "Privacy / dati", "en": "Privacy / data"}, order=3),
            FieldOption(label={"it": "Altro", "en": "Other"}, order=4),
        ],
    )
    description = Field(
        label={"it": "Descrizione", "en": "Description"},
        hint={
            "it": "Cosa è successo, quando, chi è coinvolto.",
            "en": "What happened, when, who is involved.",
        },
        type="textarea",
        required=True,
        order=1,
    )
    when = Field(
        label={"it": "Data dell'accaduto", "en": "Date of the event"},
        type="date",
        required=False,
        order=2,
    )
    evidence = Field(
        label={"it": "Allegati (facoltativi)", "en": "Attachments (optional)"},
        type="file",
        required=False,
        order=3,
    )
    step.fields = [category, description, when, evidence]
    q.steps = [step]
    session.add(q)
    await session.flush()
    return q


async def _seed_default_context(
    session: AsyncSession, questionnaire: Questionnaire, admin: AppUser
) -> None:
    existing = await session.scalar(
        select(Context.id).where(Context.tenant_id == DEFAULT_TENANT_ID)
    )
    if existing:
        return
    context = Context(
        tenant_id=DEFAULT_TENANT_ID,
        name={"it": "Canale generale", "en": "General channel"},
        description={
            "it": "Canale interno di segnalazione.",
            "en": "Internal reporting channel.",
        },
        questionnaire_id=questionnaire.id,
        tip_ttl_days=90,
    )
    session.add(context)
    await session.flush()
    # By default the admin is also a recipient so reports are never orphaned.
    session.add(ContextRecipient(context_id=context.id, recipient_id=admin.id, order=0))
