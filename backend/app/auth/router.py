"""Authentication endpoints: handler login, whistleblower receipt, logout, 2FA."""

import hashlib
import secrets
import uuid
from datetime import timedelta, timezone

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
from app.db.base import get_session, utcnow
from app.db.models import AppUser, Report
from app.notifications import service as notifications

RESET_TTL_MINUTES = 60

router = APIRouter(prefix="/api/auth", tags=["auth"])

DEFAULT_TENANT_ID = 1
_PERMISSION_FLAGS = (
    "can_delete_submission",
    "can_postpone_expiration",
    "can_grant_access_to_reports",
    "can_transfer_access_to_reports",
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


class TwoFAConfirm(BaseModel):
    secret: str
    code: str


class TwoFADisable(BaseModel):
    code: str


class ForgotRequest(BaseModel):
    username: str


class ResetRequest(BaseModel):
    token: str
    new_password: str


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

    if user.two_factor_secret:
        code = (body.totp_code or "").strip()
        if not totp.verify(user.two_factor_secret, code):
            # Fall back to a one-time recovery code (consumed on use).
            h = totp.hash_code(code)
            if code and h in (user.two_factor_recovery or []):
                user.two_factor_recovery = [x for x in user.two_factor_recovery if x != h]
                await db.commit()
            else:
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


@router.post("/password/forgot")
async def password_forgot(
    body: ForgotRequest, db: AsyncSession = Depends(get_session)
) -> dict:
    """Email a reset token if the account exists. Always returns ok (no enumeration)."""
    if not ratelimit.allow(f"forgot:{body.username}", limit=5, window_seconds=300):
        raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail="Too many attempts")
    user = await db.scalar(
        select(AppUser).where(
            AppUser.tenant_id == DEFAULT_TENANT_ID,
            AppUser.username == body.username,
            AppUser.enabled.is_(True),
        )
    )
    if user and user.mail_address:
        token = secrets.token_urlsafe(32)
        user.reset_token_hash = hashlib.sha256(token.encode("utf-8")).hexdigest()
        user.reset_token_expires = utcnow() + timedelta(minutes=RESET_TTL_MINUTES)
        await notifications.enqueue(
            db,
            tenant_id=user.tenant_id,
            address=user.mail_address,
            subject="Reimposta la password",
            body=(
                f"Per reimpostare la password inserisci questo codice (valido {RESET_TTL_MINUTES} minuti):\n"
                f"{token}\n"
                "Se non hai richiesto il reset, ignora questa email."
            ),
        )
        await db.commit()
    return {"status": "ok"}


@router.post("/password/reset")
async def password_reset(body: ResetRequest, db: AsyncSession = Depends(get_session)) -> dict:
    invalid = HTTPException(status_code=400, detail="Token non valido o scaduto")
    if not body.token:
        raise invalid
    h = hashlib.sha256(body.token.encode("utf-8")).hexdigest()
    user = await db.scalar(select(AppUser).where(AppUser.reset_token_hash == h))
    if user is None:
        raise invalid
    exp = user.reset_token_expires
    if exp is not None and exp.tzinfo is None:
        exp = exp.replace(tzinfo=timezone.utc)
    if exp is None or exp < utcnow():
        raise invalid
    passwords.provision_credentials(user, body.new_password)
    user.reset_token_hash = ""
    user.reset_token_expires = None
    await db.commit()
    return {"status": "ok"}


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


def _require_user(session: Session) -> None:
    if session.kind != "user" or not session.user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")


@router.post("/2fa/init")
async def twofa_init(
    session: Session = Depends(get_current_session), db: AsyncSession = Depends(get_session)
) -> dict:
    """Generate a candidate secret + otpauth URI (for QR). Not yet active."""
    _require_user(session)
    user = await db.get(AppUser, uuid.UUID(session.user_id))
    secret = totp.generate_secret()
    return {"secret": secret, "otpauth_uri": totp.provisioning_uri(secret, user.username)}


@router.post("/2fa/confirm")
async def twofa_confirm(
    body: TwoFAConfirm,
    session: Session = Depends(get_current_session),
    db: AsyncSession = Depends(get_session),
) -> dict:
    """Verify the first code, then activate 2FA and return one-time recovery codes."""
    _require_user(session)
    if not totp.verify(body.secret, body.code):
        raise HTTPException(status_code=400, detail="Invalid code")
    user = await db.get(AppUser, uuid.UUID(session.user_id))
    codes, hashes = totp.generate_recovery_codes()
    user.two_factor_secret = body.secret
    user.two_factor_recovery = hashes
    await db.commit()
    return {"status": "enabled", "recovery_codes": codes}


@router.post("/2fa/disable")
async def twofa_disable(
    body: TwoFADisable,
    session: Session = Depends(get_current_session),
    db: AsyncSession = Depends(get_session),
) -> dict:
    _require_user(session)
    user = await db.get(AppUser, uuid.UUID(session.user_id))
    if not user.two_factor_secret:
        return {"status": "already_disabled"}
    code = body.code.strip()
    ok = totp.verify(user.two_factor_secret, code) or totp.hash_code(code) in (
        user.two_factor_recovery or []
    )
    if not ok:
        raise HTTPException(status_code=400, detail="Invalid code")
    user.two_factor_secret = ""
    user.two_factor_recovery = []
    await db.commit()
    return {"status": "disabled"}
