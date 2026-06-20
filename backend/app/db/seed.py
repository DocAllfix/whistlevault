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


async def _seed_admin(
    session: AsyncSession, tenant_id: int = DEFAULT_TENANT_ID, username: str = "admin"
) -> AppUser:
    existing = await session.scalar(
        select(AppUser).where(
            AppUser.tenant_id == tenant_id, AppUser.username == username
        )
    )
    if existing:
        return existing
    admin = AppUser(
        tenant_id=tenant_id,
        username=username,
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


async def _seed_statuses(session: AsyncSession, tenant_id: int = DEFAULT_TENANT_ID) -> None:
    existing = await session.scalar(
        select(SubmissionStatus.id).where(SubmissionStatus.tenant_id == tenant_id)
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
                tenant_id=tenant_id, label=label, order=order, system_defined=True
            )
        )


async def _seed_default_questionnaire(
    session: AsyncSession, tenant_id: int = DEFAULT_TENANT_ID
) -> Questionnaire:
    existing = await session.scalar(
        select(Questionnaire).where(
            Questionnaire.tenant_id == tenant_id, Questionnaire.name == "default"
        )
    )
    if existing:
        return existing

    q = Questionnaire(tenant_id=tenant_id, name="default")

    # --- Step 1: tipo e gravità (con scoring di rischio) ---
    s1 = Step(
        label={"it": "Tipo di segnalazione", "en": "Type of report"},
        description={"it": "Inquadra la segnalazione.", "en": "Classify the report."},
        order=0,
    )
    categoria = Field(
        key="categoria",
        label={"it": "Categoria", "en": "Category"},
        type="select",
        required=True,
        order=0,
        options=[
            FieldOption(label={"it": "Corruzione", "en": "Corruption"}, score=5, order=0),
            FieldOption(label={"it": "Frode", "en": "Fraud"}, score=5, order=1),
            FieldOption(label={"it": "Molestie / discriminazione", "en": "Harassment / discrimination"}, score=4, order=2),
            FieldOption(label={"it": "Sicurezza sul lavoro", "en": "Workplace safety"}, score=3, order=3),
            FieldOption(label={"it": "Privacy / dati", "en": "Privacy / data"}, score=3, order=4),
            FieldOption(label={"it": "Ambiente", "en": "Environment"}, score=3, order=5),
            FieldOption(label={"it": "Altro", "en": "Other"}, score=1, order=6),
        ],
    )
    gravita = Field(
        key="gravita",
        label={"it": "Gravità percepita", "en": "Perceived severity"},
        type="select",
        required=True,
        order=1,
        options=[
            FieldOption(label={"it": "Bassa", "en": "Low"}, score=0, order=0),
            FieldOption(label={"it": "Media", "en": "Medium"}, score=2, order=1),
            FieldOption(label={"it": "Alta", "en": "High"}, score=5, order=2),
        ],
    )
    s1.fields = [categoria, gravita]

    # --- Step 2: dettagli (con un campo CONDIZIONALE) ---
    s2 = Step(
        label={"it": "Dettagli", "en": "Details"},
        description={"it": "Racconta cosa è successo.", "en": "Describe what happened."},
        order=1,
    )
    descrizione = Field(
        key="descrizione",
        label={"it": "Descrizione", "en": "Description"},
        hint={
            "it": "Cosa è successo, quando, chi è coinvolto.",
            "en": "What happened, when, who is involved.",
        },
        type="textarea",
        required=True,
        order=0,
    )
    quando = Field(
        key="quando",
        label={"it": "Data dell'accaduto", "en": "Date of the event"},
        type="date",
        required=False,
        order=1,
    )
    dove = Field(
        key="dove",
        label={"it": "Luogo / reparto", "en": "Place / department"},
        type="text",
        required=False,
        order=2,
    )
    # Compare solo se la Categoria selezionata è "Corruzione" (logica condizionale).
    apicali = Field(
        key="figure_apicali",
        label={
            "it": "Sono coinvolte figure apicali o dirigenti?",
            "en": "Are senior managers/executives involved?",
        },
        type="select",
        required=False,
        order=3,
        trigger_field_key="categoria",
        trigger_value="Corruzione",
        options=[
            FieldOption(label={"it": "Sì", "en": "Yes"}, score=3, order=0),
            FieldOption(label={"it": "No", "en": "No"}, score=0, order=1),
        ],
    )
    s2.fields = [descrizione, quando, dove, apicali]

    # --- Step 3: prove e allegati (file + registrazione vocale) ---
    s3 = Step(
        label={"it": "Prove e allegati", "en": "Evidence and attachments"},
        description={
            "it": "Aggiungi documenti o una segnalazione vocale (facoltativi).",
            "en": "Add documents or a voice report (optional).",
        },
        order=2,
    )
    prove = Field(
        key="prove",
        label={"it": "Elementi a supporto", "en": "Supporting elements"},
        hint={"it": "Riferimenti, testimoni, documenti…", "en": "References, witnesses, documents…"},
        type="textarea",
        required=False,
        order=0,
    )
    allegati = Field(
        key="allegati",
        label={"it": "Allegati (facoltativi)", "en": "Attachments (optional)"},
        type="file",
        required=False,
        order=1,
    )
    vocale = Field(
        key="vocale",
        label={"it": "Segnalazione vocale (facoltativa)", "en": "Voice report (optional)"},
        hint={"it": "Puoi registrare un messaggio audio.", "en": "You can record an audio message."},
        type="voice",
        required=False,
        order=2,
    )
    s3.fields = [prove, allegati, vocale]

    q.steps = [s1, s2, s3]
    session.add(q)
    await session.flush()
    return q


async def _seed_default_context(
    session: AsyncSession,
    questionnaire: Questionnaire,
    admin: AppUser,
    tenant_id: int = DEFAULT_TENANT_ID,
) -> None:
    existing = await session.scalar(
        select(Context.id).where(Context.tenant_id == tenant_id)
    )
    if existing:
        return
    context = Context(
        tenant_id=tenant_id,
        name={"it": "Canale generale", "en": "General channel"},
        description={
            "it": "Canale interno di segnalazione.",
            "en": "Internal reporting channel.",
        },
        questionnaire_id=questionnaire.id,
        tip_ttl_days=90,
        # Soglie di rischio: una segnalazione con score >= 8 è marcata "importante".
        score_threshold_medium=4,
        score_threshold_high=8,
    )
    session.add(context)
    await session.flush()
    # By default the admin is also a recipient so reports are never orphaned.
    session.add(ContextRecipient(context_id=context.id, recipient_id=admin.id, order=0))
