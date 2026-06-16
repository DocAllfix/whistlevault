"""Whistleblower-facing API: submit a report, re-enter, read, comment, attach."""

from fastapi import APIRouter, Depends, File, HTTPException, Response, UploadFile, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.deps import SESSION_COOKIE, require_whistleblower
from app.auth.sessions import Session, store
from app.core.config import get_settings
from app.db.base import get_session
from app.db.models import Context
from app.reports import service
from app.reports.schemas import CommentRequest, CreateReportRequest, CreateReportResponse

router = APIRouter(prefix="/api/report", tags=["whistleblower"])

DEFAULT_TENANT_ID = 1


def _set_cookie(response: Response, token: str) -> None:
    response.set_cookie(
        SESSION_COOKIE,
        token,
        httponly=True,
        secure=get_settings().is_production,
        samesite="strict",
        max_age=get_settings().session_ttl_minutes * 60,
    )


@router.post("", response_model=CreateReportResponse)
async def submit_report(
    body: CreateReportRequest, response: Response, db: AsyncSession = Depends(get_session)
) -> CreateReportResponse:
    context_id = body.context_id
    if context_id is None:
        context_id = await db.scalar(
            select(Context.id)
            .where(Context.tenant_id == DEFAULT_TENANT_ID, Context.hidden.is_(False))
            .order_by(Context.order)
            .limit(1)
        )
        if context_id is None:
            raise HTTPException(status_code=400, detail="No reporting channel available")

    try:
        report, receipt, report_prv = await service.create_report(
            db, tenant_id=DEFAULT_TENANT_ID, context_id=context_id, answers=body.answers
        )
    except service.ValidationError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))

    session = Session(
        kind="whistleblower",
        tenant_id=DEFAULT_TENANT_ID,
        role="whistleblower",
        report_id=str(report.id),
        report_key=report_prv,
    )
    token = store.create(session)
    _set_cookie(response, token)
    return CreateReportResponse(report_id=str(report.id), receipt=receipt, token=token)


@router.get("/me")
async def my_report(
    session: Session = Depends(require_whistleblower), db: AsyncSession = Depends(get_session)
) -> dict:
    return await service.get_whistleblower_view(db, session)


@router.post("/me/comments")
async def add_comment(
    body: CommentRequest,
    session: Session = Depends(require_whistleblower),
    db: AsyncSession = Depends(get_session),
) -> dict:
    if not body.content.strip():
        raise HTTPException(status_code=400, detail="Empty comment")
    await service.add_whistleblower_comment(db, session, body.content)
    return {"status": "ok"}


@router.post("/me/files")
async def upload_file(
    file: UploadFile = File(...),
    session: Session = Depends(require_whistleblower),
    db: AsyncSession = Depends(get_session),
) -> dict:
    content = await file.read()
    if len(content) > get_settings().max_upload_bytes:
        raise HTTPException(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail="File too large")
    file_id = await service.add_whistleblower_file(
        db,
        session,
        filename=file.filename or "attachment",
        content_type=file.content_type or "application/octet-stream",
        content=content,
    )
    return {"file_id": file_id}
