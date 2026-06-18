"""Case-management API for handlers (recipient/admin) and custodian."""

import re
import uuid
from urllib.parse import quote

from fastapi import APIRouter, Depends, Query, Response
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.deps import require_roles
from app.auth.sessions import Session
from app.cases import service
from app.cases.schemas import (
    AccessRequest,
    HandlerCommentRequest,
    IdentityRequestCreate,
    IdentityRequestResolve,
    PostponeRequest,
    RedactionCreate,
    StatusChangeRequest,
)
from app.db.base import get_session

router = APIRouter(prefix="/api/cases", tags=["cases"])
custodian_router = APIRouter(prefix="/api/custodian", tags=["custodian"])

_handler = require_roles("recipient", "admin")
_custodian = require_roles("custodian")


def _content_disposition(name: str) -> str:
    """Safe Content-Disposition for an untrusted (whistleblower-supplied) filename.

    Strips CR/LF/control characters (header injection, M3) and emits both an
    ASCII fallback and an RFC 5987 percent-encoded ``filename*`` for full Unicode.
    """
    ascii_fallback = re.sub(r"[^\x20-\x7e]", "_", name).replace('"', "").replace("\\", "_").strip()
    ascii_fallback = ascii_fallback or "attachment"
    return f"attachment; filename=\"{ascii_fallback}\"; filename*=UTF-8''{quote(name, safe='')}"


@router.get("")
async def list_cases(
    status_id: uuid.UUID | None = Query(None),
    context_id: uuid.UUID | None = Query(None),
    session: Session = Depends(_handler),
    db: AsyncSession = Depends(get_session),
) -> list[dict]:
    return await service.list_cases(db, session, status_id=status_id, context_id=context_id)


@router.get("/{report_id}")
async def case_detail(
    report_id: uuid.UUID,
    session: Session = Depends(_handler),
    db: AsyncSession = Depends(get_session),
) -> dict:
    return await service.get_detail(db, session, report_id)


@router.post("/{report_id}/comments")
async def add_comment(
    report_id: uuid.UUID,
    body: HandlerCommentRequest,
    session: Session = Depends(_handler),
    db: AsyncSession = Depends(get_session),
) -> dict:
    await service.add_comment(db, session, report_id, body.content, body.visibility)
    return {"status": "ok"}


@router.post("/{report_id}/status")
async def change_status(
    report_id: uuid.UUID,
    body: StatusChangeRequest,
    session: Session = Depends(_handler),
    db: AsyncSession = Depends(get_session),
) -> dict:
    await service.change_status(db, session, report_id, body.status_id, body.substatus_id)
    return {"status": "ok"}


@router.get("/{report_id}/files/{file_id}")
async def download_file(
    report_id: uuid.UUID,
    file_id: uuid.UUID,
    session: Session = Depends(_handler),
    db: AsyncSession = Depends(get_session),
) -> Response:
    name, content_type, content = await service.get_file(db, session, report_id, file_id)
    # M6: never trust the client-declared content_type for an attachment served to
    # a handler — force a non-executable type and rely on Content-Disposition.
    return Response(
        content=content,
        media_type="application/octet-stream",
        headers={"Content-Disposition": _content_disposition(name)},
    )


@router.get("/{report_id}/export")
async def export_case(
    report_id: uuid.UUID,
    session: Session = Depends(_handler),
    db: AsyncSession = Depends(get_session),
) -> Response:
    name, content = await service.export_report(db, session, report_id)
    return Response(
        content=content,
        media_type="application/zip",
        headers={"Content-Disposition": _content_disposition(name)},
    )


@router.post("/{report_id}/postpone")
async def postpone(
    report_id: uuid.UUID,
    body: PostponeRequest,
    session: Session = Depends(_handler),
    db: AsyncSession = Depends(get_session),
) -> dict:
    await service.postpone(db, session, report_id, body.days)
    return {"status": "ok"}


@router.post("/{report_id}/grant")
async def grant_access(
    report_id: uuid.UUID,
    body: AccessRequest,
    session: Session = Depends(_handler),
    db: AsyncSession = Depends(get_session),
) -> dict:
    await service.grant_access(db, session, report_id, body.user_id)
    return {"status": "ok"}


@router.post("/{report_id}/transfer")
async def transfer_access(
    report_id: uuid.UUID,
    body: AccessRequest,
    session: Session = Depends(_handler),
    db: AsyncSession = Depends(get_session),
) -> dict:
    await service.transfer_access(db, session, report_id, body.user_id)
    return {"status": "ok"}


@router.post("/{report_id}/revoke")
async def revoke_access(
    report_id: uuid.UUID,
    body: AccessRequest,
    session: Session = Depends(_handler),
    db: AsyncSession = Depends(get_session),
) -> dict:
    await service.revoke_access(db, session, report_id, body.user_id)
    return {"status": "ok"}


@router.post("/{report_id}/redactions")
async def create_redaction(
    report_id: uuid.UUID,
    body: RedactionCreate,
    session: Session = Depends(_handler),
    db: AsyncSession = Depends(get_session),
) -> dict:
    await service.create_redaction(db, session, report_id, body.reference, body.mask, body.permanent)
    return {"status": "ok"}


@router.delete("/{report_id}/redactions/{redaction_id}")
async def delete_redaction(
    report_id: uuid.UUID,
    redaction_id: uuid.UUID,
    session: Session = Depends(_handler),
    db: AsyncSession = Depends(get_session),
) -> dict:
    await service.delete_redaction(db, session, report_id, redaction_id)
    return {"status": "ok"}


@router.post("/{report_id}/identity-requests")
async def request_identity(
    report_id: uuid.UUID,
    body: IdentityRequestCreate,
    session: Session = Depends(_handler),
    db: AsyncSession = Depends(get_session),
) -> dict:
    iar_id = await service.create_identity_request(db, session, report_id, body.motivation)
    return {"identity_request_id": iar_id}


# --- Custodian endpoints ----------------------------------------------------
@custodian_router.get("/identity-requests")
async def pending_identity_requests(
    session: Session = Depends(_custodian),
    db: AsyncSession = Depends(get_session),
) -> list[dict]:
    return await service.list_pending_identity_requests(db, session)


@custodian_router.post("/identity-requests/{iar_id}")
async def resolve_identity_request(
    iar_id: uuid.UUID,
    body: IdentityRequestResolve,
    session: Session = Depends(_custodian),
    db: AsyncSession = Depends(get_session),
) -> dict:
    await service.resolve_identity_request(db, session, iar_id, body.grant, body.motivation)
    return {"status": "granted" if body.grant else "denied"}
