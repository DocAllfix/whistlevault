"""Public, unauthenticated API consumed by the whistleblower frontend."""

import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.admin.serializers import serialize_questionnaire
from app.db.base import get_session
from app.db.models import Context, Field, Questionnaire, Step, Tenant

router = APIRouter(prefix="/api/public", tags=["public"])

DEFAULT_TENANT_ID = 1


@router.get("")
async def public_config(db: AsyncSession = Depends(get_session)) -> dict:
    tenant = await db.get(Tenant, DEFAULT_TENANT_ID)
    contexts = (
        await db.scalars(
            select(Context)
            .where(Context.tenant_id == DEFAULT_TENANT_ID, Context.hidden.is_(False))
            .order_by(Context.order)
        )
    ).all()
    return {
        "branding": tenant.settings if tenant else {},
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
async def public_context(context_id: uuid.UUID, db: AsyncSession = Depends(get_session)) -> dict:
    ctx = await db.get(Context, context_id)
    if ctx is None or ctx.tenant_id != DEFAULT_TENANT_ID or ctx.hidden:
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
