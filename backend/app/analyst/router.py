"""Analyst API: aggregate statistics (no content / PII)."""

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.analyst import service
from app.auth.deps import require_roles
from app.auth.sessions import Session
from app.db.base import get_session

router = APIRouter(prefix="/api/analyst", tags=["analyst"])
_analyst = require_roles("analyst", "admin")


@router.get("/stats")
async def stats(
    session: Session = Depends(_analyst), db: AsyncSession = Depends(get_session)
) -> dict:
    return await service.compute_stats(db, session)
