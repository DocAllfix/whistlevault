"""Public, unauthenticated API consumed by the whistleblower frontend."""

import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.admin.serializers import serialize_questionnaire
from app.core import ratelimit
from app.core.tenancy import resolve_tenant_id
from app.db.base import get_session
from app.db.models import Context, Field, Questionnaire, Step, Tenant
from app.notifications import service as notifications

router = APIRouter(prefix="/api/public", tags=["public"])


class SignupRequest(BaseModel):
    organization: str
    email: str


@router.post("/signup")
async def signup(
    body: SignupRequest,
    db: AsyncSession = Depends(get_session),
    tenant_id: int = Depends(resolve_tenant_id),
) -> dict:
    """Lightweight 'request access' for prospective clients. Always returns ok.

    The notification is sent ONLY to the tenant owner's configured address
    (settings.signup_notify_email), never to the user-supplied email — so the
    endpoint cannot be abused to relay/bomb arbitrary addresses (M9).
    """
    if not ratelimit.allow(f"signup:{body.email}", limit=3, window_seconds=3600):
        raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail="Too many requests")
    tenant = await db.get(Tenant, tenant_id)
    notify = (tenant.settings or {}).get("signup_notify_email") if tenant else None
    if notify:
        await notifications.enqueue(
            db,
            tenant_id=tenant_id,
            address=notify,
            subject="Nuova richiesta di attivazione",
            body=f"Richiesta di attivazione da: {body.organization} <{body.email}>",
        )
        await db.commit()
    return {"status": "ok"}


@router.get("")
async def public_config(
    db: AsyncSession = Depends(get_session),
    tenant_id: int = Depends(resolve_tenant_id),
) -> dict:
    tenant = await db.get(Tenant, tenant_id)
    contexts = (
        await db.scalars(
            select(Context)
            .where(Context.tenant_id == tenant_id, Context.hidden.is_(False))
            .order_by(Context.order)
        )
    ).all()
    return {
        "branding": (tenant.settings.get("branding", {}) if tenant else {}),
        "contexts": [
            {
                "id": str(c.id),
                "name": c.name,
                "description": c.description,
                "questionnaire_id": str(c.questionnaire_id) if c.questionnaire_id else None,
            }
            for c in contexts
        ],
    }


@router.get("/contexts/{context_id}")
async def public_context(
    context_id: uuid.UUID,
    db: AsyncSession = Depends(get_session),
    tenant_id: int = Depends(resolve_tenant_id),
) -> dict:
    ctx = await db.get(Context, context_id)
    if ctx is None or ctx.tenant_id != tenant_id or ctx.hidden:
        raise HTTPException(status_code=404, detail="Channel not found")
    questionnaire = None
    if ctx.questionnaire_id:
        q = await db.scalar(
            select(Questionnaire)
            .where(Questionnaire.id == ctx.questionnaire_id)
            .options(
                selectinload(Questionnaire.steps)
                .selectinload(Step.fields)
                .selectinload(Field.options)
            )
        )
        if q:
            questionnaire = serialize_questionnaire(q)
    return {
        "id": str(ctx.id),
        "name": ctx.name,
        "description": ctx.description,
        "questionnaire": questionnaire,
    }
