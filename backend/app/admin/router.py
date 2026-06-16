"""Admin API: users, contexts, questionnaires, statuses, settings, audit log."""

import uuid

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.admin import schemas, service
from app.auth.deps import require_roles
from app.auth.sessions import Session
from app.db.base import get_session

router = APIRouter(prefix="/api/admin", tags=["admin"])
_admin = require_roles("admin")


# Users
@router.post("/users")
async def create_user(body: schemas.UserCreate, s: Session = Depends(_admin), db: AsyncSession = Depends(get_session)):
    return await service.create_user(db, s, body)


@router.get("/users")
async def list_users(s: Session = Depends(_admin), db: AsyncSession = Depends(get_session)):
    return await service.list_users(db, s)


@router.patch("/users/{user_id}")
async def update_user(user_id: uuid.UUID, body: schemas.UserUpdate, s: Session = Depends(_admin), db: AsyncSession = Depends(get_session)):
    return await service.update_user(db, s, user_id, body)


@router.post("/users/{user_id}/password")
async def reset_password(user_id: uuid.UUID, body: schemas.PasswordReset, s: Session = Depends(_admin), db: AsyncSession = Depends(get_session)):
    await service.reset_password(db, s, user_id, body.password)
    return {"status": "ok"}


@router.delete("/users/{user_id}")
async def delete_user(user_id: uuid.UUID, s: Session = Depends(_admin), db: AsyncSession = Depends(get_session)):
    await service.delete_user(db, s, user_id)
    return {"status": "ok"}


# Contexts
@router.post("/contexts")
async def create_context(body: schemas.ContextCreate, s: Session = Depends(_admin), db: AsyncSession = Depends(get_session)):
    return await service.create_context(db, s, body)


@router.get("/contexts")
async def list_contexts(s: Session = Depends(_admin), db: AsyncSession = Depends(get_session)):
    return await service.list_contexts(db, s)


@router.patch("/contexts/{context_id}")
async def update_context(context_id: uuid.UUID, body: schemas.ContextUpdate, s: Session = Depends(_admin), db: AsyncSession = Depends(get_session)):
    return await service.update_context(db, s, context_id, body)


@router.delete("/contexts/{context_id}")
async def delete_context(context_id: uuid.UUID, s: Session = Depends(_admin), db: AsyncSession = Depends(get_session)):
    await service.delete_context(db, s, context_id)
    return {"status": "ok"}


# Questionnaires (editable)
@router.post("/questionnaires")
async def create_questionnaire(body: schemas.QuestionnaireIn, s: Session = Depends(_admin), db: AsyncSession = Depends(get_session)):
    return await service.create_questionnaire(db, s, body)


@router.get("/questionnaires")
async def list_questionnaires(s: Session = Depends(_admin), db: AsyncSession = Depends(get_session)):
    return await service.list_questionnaires(db, s)


@router.get("/questionnaires/{qid}")
async def get_questionnaire(qid: uuid.UUID, s: Session = Depends(_admin), db: AsyncSession = Depends(get_session)):
    return await service.get_questionnaire(db, s, qid)


@router.put("/questionnaires/{qid}")
async def update_questionnaire(qid: uuid.UUID, body: schemas.QuestionnaireIn, s: Session = Depends(_admin), db: AsyncSession = Depends(get_session)):
    return await service.update_questionnaire(db, s, qid, body)


@router.delete("/questionnaires/{qid}")
async def delete_questionnaire(qid: uuid.UUID, s: Session = Depends(_admin), db: AsyncSession = Depends(get_session)):
    await service.delete_questionnaire(db, s, qid)
    return {"status": "ok"}


# Statuses
@router.get("/statuses")
async def list_statuses(s: Session = Depends(_admin), db: AsyncSession = Depends(get_session)):
    return await service.list_statuses(db, s)


@router.post("/statuses")
async def create_status(body: schemas.StatusCreate, s: Session = Depends(_admin), db: AsyncSession = Depends(get_session)):
    return await service.create_status(db, s, body)


@router.delete("/statuses/{status_id}")
async def delete_status(status_id: uuid.UUID, s: Session = Depends(_admin), db: AsyncSession = Depends(get_session)):
    await service.delete_status(db, s, status_id)
    return {"status": "ok"}


# Settings / branding
@router.get("/settings")
async def get_settings(s: Session = Depends(_admin), db: AsyncSession = Depends(get_session)):
    return await service.get_settings(db, s)


@router.put("/settings")
async def update_settings(body: schemas.SettingsUpdate, s: Session = Depends(_admin), db: AsyncSession = Depends(get_session)):
    return await service.update_settings(db, s, body.settings)


# Audit log
@router.get("/audit-log")
async def audit_log(limit: int = Query(100, ge=1, le=500), s: Session = Depends(_admin), db: AsyncSession = Depends(get_session)):
    return await service.list_audit(db, s, limit)
