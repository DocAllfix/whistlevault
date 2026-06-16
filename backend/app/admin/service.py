"""Admin service: users, contexts, questionnaires, statuses, settings, audit."""

import uuid

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app import audit
from app.admin import schemas
from app.admin.serializers import serialize_context, serialize_questionnaire, serialize_user
from app.auth import escrow, passwords
from app.auth.sessions import Session
from app.cases.service import CaseError, CaseForbidden, CaseNotFound
from app.db.enums import UserRole
from app.db.models import (
    AppUser,
    AuditLog,
    Context,
    ContextRecipient,
    Field,
    FieldOption,
    Questionnaire,
    Step,
    SubmissionStatus,
    Tenant,
)


def _role(value: str) -> UserRole:
    try:
        return UserRole(value)
    except ValueError:
        raise CaseError(f"Invalid role: {value}")


# --- Users -----------------------------------------------------------------
async def create_user(db: AsyncSession, session: Session, body: schemas.UserCreate) -> dict:
    role = _role(body.role)
    exists = await db.scalar(
        select(AppUser.id).where(
            AppUser.tenant_id == session.tenant_id, AppUser.username == body.username
        )
    )
    if exists:
        raise CaseError("Username already exists")
    user = AppUser(
        tenant_id=session.tenant_id,
        username=body.username,
        role=role,
        name=body.name,
        mail_address=body.mail_address,
    )
    tenant = await db.get(Tenant, session.tenant_id)
    escrow_pub = tenant.escrow_pub if tenant else ""
    recovery_key = passwords.provision_credentials(user, body.password, escrow_pub=escrow_pub or None)
    user.password_change_needed = True  # force change on first login
    db.add(user)
    await db.flush()

    # A new admin gets escrow access (re-wrap the escrow private key for them).
    if role == UserRole.admin and escrow_pub and session.private_key:
        acting = await db.get(AppUser, uuid.UUID(session.user_id))
        escrow_prv = escrow.unlock_escrow_prv(acting, session.private_key) if acting else None
        if escrow_prv:
            escrow.grant_escrow_to_admin(escrow_prv, user)

    await audit.log(
        db, tenant_id=session.tenant_id, type="user_create", user_id=session.user_id, object_id=user.id
    )
    await db.commit()
    return {**serialize_user(user), "recovery_key": recovery_key}


async def recover_user_account(
    db: AsyncSession, session: Session, user_id: uuid.UUID, new_password: str
) -> str:
    """Admin escrow recovery: reset a user's password preserving their report access."""
    acting = await db.get(AppUser, uuid.UUID(session.user_id))
    escrow_prv = escrow.unlock_escrow_prv(acting, session.private_key) if acting else None
    if escrow_prv is None:
        raise CaseForbidden("Escrow non disponibile per questo amministratore")
    target = await db.get(AppUser, user_id)
    if target is None or target.tenant_id != session.tenant_id:
        raise CaseNotFound("User not found")
    new_recovery = escrow.recover_user(escrow_prv, target, new_password)
    if new_recovery is None:
        raise CaseError("Recupero escrow non disponibile per questo utente")
    await audit.log(
        db, tenant_id=session.tenant_id, type="escrow_recovery", user_id=session.user_id, object_id=target.id
    )
    await db.commit()
    return new_recovery


async def list_users(db: AsyncSession, session: Session) -> list[dict]:
    users = (
        await db.scalars(select(AppUser).where(AppUser.tenant_id == session.tenant_id))
    ).all()
    return [serialize_user(u) for u in users]


async def update_user(
    db: AsyncSession, session: Session, user_id: uuid.UUID, body: schemas.UserUpdate
) -> dict:
    user = await db.get(AppUser, user_id)
    if user is None or user.tenant_id != session.tenant_id:
        raise CaseNotFound("User not found")
    if body.enabled is not None:
        user.enabled = body.enabled
    if body.role is not None:
        user.role = _role(body.role)
    if body.name is not None:
        user.name = body.name
    if body.mail_address is not None:
        user.mail_address = body.mail_address
    if body.permissions is not None:
        for flag, value in body.permissions.items():
            if hasattr(user, flag) and flag.startswith("can_"):
                setattr(user, flag, bool(value))
    await audit.log(
        db, tenant_id=session.tenant_id, type="user_update", user_id=session.user_id, object_id=user.id
    )
    await db.commit()
    return serialize_user(user)


async def reset_password(
    db: AsyncSession, session: Session, user_id: uuid.UUID, password: str
) -> str:
    user = await db.get(AppUser, user_id)
    if user is None or user.tenant_id != session.tenant_id:
        raise CaseNotFound("User not found")
    # Admin-forced reset generates a fresh keypair (the user loses access to reports
    # encrypted before the reset). The user can avoid this by self-resetting with their
    # recovery key. Returns the new recovery key to hand to the user.
    recovery_key = passwords.provision_credentials(user, password)
    await audit.log(
        db, tenant_id=session.tenant_id, type="password_reset", user_id=session.user_id, object_id=user.id
    )
    await db.commit()
    return recovery_key


async def delete_user(db: AsyncSession, session: Session, user_id: uuid.UUID) -> None:
    user = await db.get(AppUser, user_id)
    if user is None or user.tenant_id != session.tenant_id:
        raise CaseNotFound("User not found")
    if str(user.id) == session.user_id:
        raise CaseError("Cannot delete your own account")
    await db.delete(user)
    await audit.log(
        db, tenant_id=session.tenant_id, type="user_delete", user_id=session.user_id, object_id=user_id
    )
    await db.commit()


# --- Contexts ---------------------------------------------------------------
async def _recipient_ids(db: AsyncSession, context_id: uuid.UUID) -> list[str]:
    ids = (
        await db.scalars(
            select(ContextRecipient.recipient_id).where(ContextRecipient.context_id == context_id)
        )
    ).all()
    return [str(i) for i in ids]


async def _set_recipients(db: AsyncSession, context_id: uuid.UUID, recipient_ids: list[uuid.UUID]) -> None:
    await db.execute(delete(ContextRecipient).where(ContextRecipient.context_id == context_id))
    for order, rid in enumerate(recipient_ids):
        db.add(ContextRecipient(context_id=context_id, recipient_id=rid, order=order))


async def create_context(db: AsyncSession, session: Session, body: schemas.ContextCreate) -> dict:
    ctx = Context(
        tenant_id=session.tenant_id,
        name=body.name,
        description=body.description,
        questionnaire_id=body.questionnaire_id,
        tip_ttl_days=body.tip_ttl_days,
        tip_reminder_days=body.tip_reminder_days,
        score_threshold_medium=body.score_threshold_medium,
        score_threshold_high=body.score_threshold_high,
        hidden=body.hidden,
        order=body.order,
    )
    db.add(ctx)
    await db.flush()
    await _set_recipients(db, ctx.id, body.recipient_ids)
    await audit.log(
        db, tenant_id=session.tenant_id, type="context_create", user_id=session.user_id, object_id=ctx.id
    )
    await db.commit()
    return serialize_context(ctx, [str(i) for i in body.recipient_ids])


async def list_contexts(db: AsyncSession, session: Session) -> list[dict]:
    contexts = (
        await db.scalars(
            select(Context).where(Context.tenant_id == session.tenant_id).order_by(Context.order)
        )
    ).all()
    return [serialize_context(c, await _recipient_ids(db, c.id)) for c in contexts]


async def update_context(
    db: AsyncSession, session: Session, context_id: uuid.UUID, body: schemas.ContextUpdate
) -> dict:
    ctx = await db.get(Context, context_id)
    if ctx is None or ctx.tenant_id != session.tenant_id:
        raise CaseNotFound("Context not found")
    for attr in (
        "name", "description", "questionnaire_id", "tip_ttl_days", "tip_reminder_days",
        "score_threshold_medium", "score_threshold_high", "hidden", "order",
    ):
        value = getattr(body, attr)
        if value is not None:
            setattr(ctx, attr, value)
    if body.recipient_ids is not None:
        await _set_recipients(db, ctx.id, body.recipient_ids)
    await audit.log(
        db, tenant_id=session.tenant_id, type="context_update", user_id=session.user_id, object_id=ctx.id
    )
    await db.commit()
    return serialize_context(ctx, await _recipient_ids(db, ctx.id))


async def delete_context(db: AsyncSession, session: Session, context_id: uuid.UUID) -> None:
    ctx = await db.get(Context, context_id)
    if ctx is None or ctx.tenant_id != session.tenant_id:
        raise CaseNotFound("Context not found")
    await db.delete(ctx)
    await audit.log(
        db, tenant_id=session.tenant_id, type="context_delete", user_id=session.user_id, object_id=context_id
    )
    await db.commit()


# --- Questionnaires (editable) ---------------------------------------------
async def _load_questionnaire(db: AsyncSession, qid: uuid.UUID) -> Questionnaire | None:
    return await db.scalar(
        select(Questionnaire)
        .where(Questionnaire.id == qid)
        .options(selectinload(Questionnaire.steps).selectinload(Step.fields).selectinload(Field.options))
    )


def _build_steps(q: Questionnaire, steps: list[schemas.StepIn]) -> None:
    q.steps = [
        Step(
            label=s.label,
            description=s.description,
            order=s.order,
            fields=[
                Field(
                    label=f.label,
                    hint=f.hint,
                    type=f.type,
                    required=f.required,
                    order=f.order,
                    key=f.key or f"f_{uuid.uuid4().hex[:8]}",
                    trigger_field_key=f.trigger_field_key,
                    trigger_value=f.trigger_value,
                    options=[
                        FieldOption(label=o.label, order=o.order, score=o.score) for o in f.options
                    ],
                )
                for f in s.fields
            ],
        )
        for s in steps
    ]


async def create_questionnaire(db: AsyncSession, session: Session, body: schemas.QuestionnaireIn) -> dict:
    q = Questionnaire(tenant_id=session.tenant_id, name=body.name)
    _build_steps(q, body.steps)
    db.add(q)
    await db.flush()
    await audit.log(
        db, tenant_id=session.tenant_id, type="questionnaire_create", user_id=session.user_id, object_id=q.id
    )
    await db.commit()
    fresh = await _load_questionnaire(db, q.id)
    return serialize_questionnaire(fresh)


async def list_questionnaires(db: AsyncSession, session: Session) -> list[dict]:
    qs = (
        await db.scalars(
            select(Questionnaire)
            .where(Questionnaire.tenant_id == session.tenant_id)
            .options(selectinload(Questionnaire.steps).selectinload(Step.fields).selectinload(Field.options))
        )
    ).all()
    return [serialize_questionnaire(q) for q in qs]


async def get_questionnaire(db: AsyncSession, session: Session, qid: uuid.UUID) -> dict:
    q = await _load_questionnaire(db, qid)
    if q is None or q.tenant_id != session.tenant_id:
        raise CaseNotFound("Questionnaire not found")
    return serialize_questionnaire(q)


async def update_questionnaire(
    db: AsyncSession, session: Session, qid: uuid.UUID, body: schemas.QuestionnaireIn
) -> dict:
    q = await _load_questionnaire(db, qid)
    if q is None or q.tenant_id != session.tenant_id:
        raise CaseNotFound("Questionnaire not found")
    q.name = body.name
    _build_steps(q, body.steps)  # replaces steps (cascade delete-orphan removes old)
    await audit.log(
        db, tenant_id=session.tenant_id, type="questionnaire_update", user_id=session.user_id, object_id=q.id
    )
    await db.commit()
    fresh = await _load_questionnaire(db, q.id)
    return serialize_questionnaire(fresh)


async def delete_questionnaire(db: AsyncSession, session: Session, qid: uuid.UUID) -> None:
    q = await db.get(Questionnaire, qid)
    if q is None or q.tenant_id != session.tenant_id:
        raise CaseNotFound("Questionnaire not found")
    await db.delete(q)
    await db.commit()


# --- Statuses ---------------------------------------------------------------
async def list_statuses(db: AsyncSession, session: Session) -> list[dict]:
    rows = (
        await db.scalars(
            select(SubmissionStatus)
            .where(SubmissionStatus.tenant_id == session.tenant_id)
            .order_by(SubmissionStatus.order)
        )
    ).all()
    return [
        {"id": str(s.id), "label": s.label, "order": s.order, "system_defined": s.system_defined}
        for s in rows
    ]


async def create_status(db: AsyncSession, session: Session, body: schemas.StatusCreate) -> dict:
    status = SubmissionStatus(tenant_id=session.tenant_id, label=body.label, order=body.order)
    db.add(status)
    await db.commit()
    return {"id": str(status.id), "label": status.label, "order": status.order}


async def delete_status(db: AsyncSession, session: Session, status_id: uuid.UUID) -> None:
    status = await db.get(SubmissionStatus, status_id)
    if status is None or status.tenant_id != session.tenant_id:
        raise CaseNotFound("Status not found")
    if status.system_defined:
        raise CaseError("Cannot delete a system-defined status")
    await db.delete(status)
    await db.commit()


# --- Settings / branding ----------------------------------------------------
async def get_settings(db: AsyncSession, session: Session) -> dict:
    tenant = await db.get(Tenant, session.tenant_id)
    return tenant.settings if tenant else {}


async def update_settings(db: AsyncSession, session: Session, settings: dict) -> dict:
    tenant = await db.get(Tenant, session.tenant_id)
    if tenant is None:
        raise CaseNotFound("Tenant not found")
    tenant.settings = settings
    await audit.log(
        db, tenant_id=session.tenant_id, type="settings_update", user_id=session.user_id
    )
    await db.commit()
    return tenant.settings


# --- Audit log view ---------------------------------------------------------
async def list_audit(db: AsyncSession, session: Session, limit: int = 100) -> list[dict]:
    rows = (
        await db.scalars(
            select(AuditLog)
            .where(AuditLog.tenant_id == session.tenant_id)
            .order_by(AuditLog.occurred_at.desc())
            .limit(min(limit, 500))
        )
    ).all()
    return [
        {
            "id": r.id,
            "occurred_at": r.occurred_at.isoformat(),
            "type": r.type,
            "user_id": str(r.user_id) if r.user_id else None,
            "object_id": str(r.object_id) if r.object_id else None,
            "data": r.data,
        }
        for r in rows
    ]
