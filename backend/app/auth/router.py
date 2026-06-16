"""Authentication endpoints: handler login, whistleblower receipt, logout."""

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app import crypto
from app.auth import passwords, totp
from app.auth.deps import SESSION_COOKIE, _extract_token, get_current_session
from app.auth.sessions import Session, store
from app.core import ratelimit
from app.core.config import get_settings
from app.db.base import get_session
from app.db.models import AppUser, Report

router = APIRouter(prefix="/api/auth", tags=["auth"])

DEFAULT_TENANT_ID = 1
_PERMISSION_FLAGS = (
    "can_delete_submission",
    "can_postpone_expiration",
    "can_grant_access_to_reports",
    "can_redact_information",
    "can_mask_information",
    "can_reopen_reports",
    "can_edit_general_settings",
)


class LoginRequest(BaseModel):
    username: str
    password: str
    totp_code: str | None = None


class ReceiptRequest(BaseModel):
    receipt: str


def _set_cookie(response: Response, token: str) -> None:
    response.set_cookie(
        SESSION_COOKIE,
        token,
        httponly=True,
        secure=get_settings().is_production,
        samesite="strict",
        max_age=get_settings().session_ttl_minutes * 60,
    )


@router.post("/login")
async def login(
    body: LoginRequest, response: Response, db: AsyncSession = Depends(get_session)
) -> dict:
    if not ratelimit.allow(f"login:{body.username}", limit=5, window_seconds=60):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail="Too many attempts"
        )

    user = await db.scalar(
        select(AppUser).where(
            AppUser.tenant_id == DEFAULT_TENANT_ID,
            AppUser.username == body.username,
            AppUser.enabled.is_(True),
        )
    )
    invalid = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials"
    )
    if user is None:
        passwords.waste_time()  # equalize timing to mitigate username enumeration
        raise invalid

    private_key = passwords.authenticate(user, body.password)
    if private_key is None:
        raise invalid

    if user.two_factor_secret and not totp.verify(user.two_factor_secret, body.totp_code or ""):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or missing 2FA code"
        )

    session = Session(
        kind="user",
        tenant_id=user.tenant_id,
        role=user.role.value,
        user_id=str(user.id),
        private_key=private_key,
        permissions={flag: getattr(user, flag) for flag in _PERMISSION_FLAGS},
    )
    token = store.create(session)
    _set_cookie(response, token)
    return {
        "token": token,
        "role": user.role.value,
        "password_change_needed": user.password_change_needed,
    }


@router.post("/receipt")
async def receipt_auth(
    body: ReceiptRequest, response: Response, db: AsyncSession = Depends(get_session)
) -> dict:
    if not ratelimit.allow(f"receipt:{body.receipt}", limit=5, window_seconds=60):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail="Too many attempts"
        )

    report = await db.scalar(
        select(Report).where(Report.receipt_hash == crypto.hash_receipt(body.receipt))
    )
    invalid = HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid receipt")
    if report is None:
        raise invalid
    try:
        report_key = crypto.unwrap_report_key_with_secret(
            report.crypto_prv_key, body.receipt, report.receipt_salt
        )
    except Exception:
        raise invalid

    session = Session(
        kind="whistleblower",
        tenant_id=report.tenant_id,
        role="whistleblower",
        report_id=str(report.id),
        report_key=report_key,
    )
    token = store.create(session)
    _set_cookie(response, token)
    return {"token": token, "report_id": str(report.id)}


@router.post("/logout")
async def logout(
    request: Request, response: Response, session: Session = Depends(get_current_session)
) -> dict:
    store.delete(_extract_token(request))
    response.delete_cookie(SESSION_COOKIE)
    return {"status": "logged_out"}


@router.get("/me")
async def me(session: Session = Depends(get_current_session)) -> dict:
    return {
        "kind": session.kind,
        "role": session.role,
        "user_id": session.user_id,
        "report_id": session.report_id,
        "permissions": session.permissions,
    }
