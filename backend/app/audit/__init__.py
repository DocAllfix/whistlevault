"""Audit logging — handler actions only.

NEVER record whistleblower IP / user-agent / report content here: only who did
what to which object, and when. The caller is responsible for committing.
"""

import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import AuditLog


async def log(
    db: AsyncSession,
    *,
    tenant_id: int,
    type: str,
    user_id: str | uuid.UUID | None = None,
    object_id: str | uuid.UUID | None = None,
    data: dict | None = None,
) -> None:
    db.add(
        AuditLog(
            tenant_id=tenant_id,
            type=type,
            user_id=uuid.UUID(str(user_id)) if user_id else None,
            object_id=uuid.UUID(str(object_id)) if object_id else None,
            data=data or {},
        )
    )
