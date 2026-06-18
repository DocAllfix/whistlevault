"""Tenant resolution for the multi-tenant production deployment.

The tenant is resolved from the request **Host header** — each tenant has its
own public/backoffice subdomain (e.g. ``acme.whistlevault.it`` /
``acme-gestione.whistlevault.it``). This replaces the previously hardcoded
``DEFAULT_TENANT_ID = 1`` that, on a shared multi-tenant host, would have routed
every submission and login to tenant 1 (cross-tenant collapse).

Backward compatible with single-tenant (one VPS per client) deployments: when
exactly one active tenant exists, it is used regardless of the host, so existing
isolated instances keep working without per-tenant domain configuration.
"""

from fastapi import Depends, HTTPException, Request
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.base import get_session
from app.db.models import Tenant


async def resolve_tenant_id(
    request: Request, db: AsyncSession = Depends(get_session)
) -> int:
    """Resolve the active tenant id from the Host header (or the sole tenant)."""
    host = (request.headers.get("host") or "").split(":")[0].strip().lower()
    if host:
        tid = await db.scalar(
            select(Tenant.id).where(
                or_(Tenant.public_domain == host, Tenant.backoffice_domain == host),
                Tenant.active.is_(True),
            )
        )
        if tid is not None:
            return tid
    # Single-tenant fallback: exactly one active tenant → use it.
    ids = (await db.scalars(select(Tenant.id).where(Tenant.active.is_(True)).limit(2))).all()
    if len(ids) == 1:
        return ids[0]
    raise HTTPException(status_code=404, detail="Unknown tenant")
