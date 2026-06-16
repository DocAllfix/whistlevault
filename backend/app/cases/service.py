"""Case-management service for handlers (recipient / custodian).

Access is crypto-enforced: a handler can decrypt a report only by unwrapping the
report key with their own private key (held in the session). A handler with no
assignment to a report cannot read it.
"""

import json
import uuid
from datetime import timedelta

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app import audit, crypto
from app.auth.sessions import Session
from app.db.base import utcnow
from app.db.enums import AuthorKind, CommentVisibility, IARStatus, UserRole
from app.db.models import (
    AppUser,
    Comment,
    IdentityAccessRequest,
    IdentityAccessRequestCustodian,
    RecipientReport,
    Redaction,
    Report,
    ReportAnswer,
    ReportFile,
    SubmissionStatus,
)
from app.files import storage


class CaseError(Exception):
    """Bad request (400)."""


class CaseNotFound(Exception):
    """404."""


class CaseForbidden(Exception):
    """403."""


def _uid(session: Session) -> uuid.UUID:
    return uuid.UUID(session.user_id)


def _mask_text(text: str, masks: list[str]) -> str:
    for m in masks:
        if m:
            text = text.replace(m, "■" * max(4, len(m)))
    return text


async def _link(db: AsyncSession, report_id: uuid.UUID, user_id: uuid.UUID) -> RecipientReport | None:
    return await db.scalar(
        select(RecipientReport).where(
            RecipientReport.report_id == report_id, RecipientReport.recipient_id == user_id
        )
    )


async def _report_key(db: AsyncSession, session: Session, report: Report) -> str:
    link = await _link(db, report.id, _uid(session))
    if link is None or not link.wrapped_tip_prv_key:
        raise CaseForbidden("Not assigned to this report")
    return crypto.unwrap_report_key_with_private(link.wrapped_tip_prv_key, session.private_key)


async def list_cases(
    db: AsyncSession,
    session: Session,
    *,
    status_id: uuid.UUID | None = None,
    context_id: uuid.UUID | None = None,
) -> list[dict]:
    stmt = (
        select(Report, RecipientReport.new)
        .join(RecipientReport, RecipientReport.report_id == Report.id)
        .where(
            RecipientReport.recipient_id == _uid(session),
            Report.tenant_id == session.tenant_id,
        )
        .order_by(Report.created_at.desc())
    )
    if status_id:
        stmt = stmt.where(Report.status_id == status_id)
    if context_id:
        stmt = stmt.where(Report.context_id == context_id)

    rows = (await db.execute(stmt)).all()
    return [
        {
            "report_id": str(r.id),
            "progressive": r.progressive,
            "status_id": str(r.status_id) if r.status_id else None,
            "context_id": str(r.context_id),
            "important": r.important,
            "label": r.label,
            "new": is_new,
            "created_at": r.created_at.isoformat(),
            "updated_at": r.updated_at.isoformat(),
            "expiration_date": r.expiration_date.isoformat() if r.expiration_date else None,
        }
        for r, is_new in rows
    ]


async def _get_report(db: AsyncSession, session: Session, report_id: uuid.UUID) -> Report:
    report = await db.get(Report, report_id)
    if report is None or report.tenant_id != session.tenant_id:
        raise CaseNotFound("Report not found")
    return report


async def get_detail(db: AsyncSession, session: Session, report_id: uuid.UUID) -> dict:
    report = await _get_report(db, session, report_id)
    report_key = await _report_key(db, session, report)

    answer_row = await db.scalar(select(ReportAnswer).where(ReportAnswer.report_id == report.id))
    answers = (
        json.loads(crypto.decrypt_content(report_key, answer_row.answers["ciphertext"]))
        if answer_row
        else {}
    )

    # Visibility: public + internal + own personal notes.
    comments = (
        await db.scalars(
            select(Comment).where(Comment.report_id == report.id).order_by(Comment.created_at)
        )
    ).all()
    visible = []
    for c in comments:
        if c.visibility == CommentVisibility.personal and (
            c.author_id is None or c.author_id != _uid(session)
        ):
            continue
        visible.append(
            {
                "id": str(c.id),
                "author_kind": c.author_kind.value,
                "visibility": c.visibility.value,
                "content": crypto.decrypt_content(report_key, c.content),
                "created_at": c.created_at.isoformat(),
            }
        )

    files = (
        await db.scalars(
            select(ReportFile).where(ReportFile.report_id == report.id).order_by(ReportFile.created_at)
        )
    ).all()
    file_view = [
        {
            "id": str(f.id),
            "name": crypto.decrypt_content(report_key, f.name) if f.name else "",
            "content_type": f.content_type,
            "size": f.size,
            "author_kind": f.author_kind.value,
            "visibility": f.visibility.value,
        }
        for f in files
    ]

    iar = await db.scalar(
        select(IdentityAccessRequest)
        .where(IdentityAccessRequest.report_id == report.id)
        .order_by(IdentityAccessRequest.request_date.desc())
        .limit(1)
    )

    # Mark accessed.
    link = await _link(db, report.id, _uid(session))
    now = utcnow()
    if link:
        link.new = False
        link.access_date = link.access_date or now
        link.last_access = now
    report.last_access = now
    report.access_count += 1

    # Identity: cryptographically readable ONLY if this recipient was granted
    # access (i.e. holds a wrapped identity key). Otherwise it stays sealed.
    identity = None
    if link and link.wrapped_identity_prv_key and report.encrypted_identity:
        id_prv = crypto.unwrap_report_key_with_private(
            link.wrapped_identity_prv_key, session.private_key
        )
        identity = json.loads(crypto.decrypt_content(id_prv, report.encrypted_identity))

    # Apply temporary (reversible) redactions to the rendered view.
    redactions = (
        await db.scalars(select(Redaction).where(Redaction.report_id == report.id))
    ).all()
    answer_masks: list[str] = []
    comment_masks: dict[str, list[str]] = {}
    for r in redactions:
        masks = (r.temporary_redaction or {}).get("mask", [])
        if not masks:
            continue
        if r.reference_id == "answers":
            answer_masks.extend(masks)
        else:
            comment_masks.setdefault(r.reference_id, []).extend(masks)
    if answer_masks:
        answers = {
            k: (_mask_text(v, answer_masks) if isinstance(v, str) else v) for k, v in answers.items()
        }
    if comment_masks:
        for c in visible:
            if c["id"] in comment_masks:
                c["content"] = _mask_text(c["content"], comment_masks[c["id"]])

    await audit.log(
        db, tenant_id=session.tenant_id, type="report_access", user_id=session.user_id, object_id=report.id
    )
    await db.commit()

    return {
        "report_id": str(report.id),
        "progressive": report.progressive,
        "status_id": str(report.status_id) if report.status_id else None,
        "substatus_id": str(report.substatus_id) if report.substatus_id else None,
        "important": report.important,
        "label": report.label,
        "created_at": report.created_at.isoformat(),
        "expiration_date": report.expiration_date.isoformat() if report.expiration_date else None,
        "identity_available": report.enable_whistleblower_identity,
        "identity_granted": identity is not None,
        "identity": identity,
        "identity_request_status": iar.status.value if iar else None,
        "answers": answers,
        "comments": visible,
        "files": file_view,
    }


async def add_comment(
    db: AsyncSession, session: Session, report_id: uuid.UUID, content: str, visibility: str
) -> None:
    report = await _get_report(db, session, report_id)
    report_key = await _report_key(db, session, report)  # ensures assignment
    try:
        vis = CommentVisibility(visibility)
    except ValueError:
        raise CaseError("Invalid visibility")
    # Encrypt to the report public key so the whistleblower (public) and other
    # recipients can read it back.
    db.add(
        Comment(
            report_id=report.id,
            author_id=_uid(session),
            author_kind=AuthorKind.recipient,
            content=crypto.encrypt_content(report.crypto_pub_key, content),
            visibility=vis,
        )
    )
    report.updated_at = utcnow()
    _ = report_key  # decryption capability already verified
    await audit.log(
        db, tenant_id=session.tenant_id, type="comment_add", user_id=session.user_id, object_id=report.id
    )
    await db.commit()


async def change_status(
    db: AsyncSession,
    session: Session,
    report_id: uuid.UUID,
    status_id: uuid.UUID,
    substatus_id: uuid.UUID | None,
) -> None:
    report = await _get_report(db, session, report_id)
    await _report_key(db, session, report)  # assignment check
    status = await db.get(SubmissionStatus, status_id)
    if status is None or status.tenant_id != session.tenant_id:
        raise CaseError("Invalid status")
    report.status_id = status_id
    report.substatus_id = substatus_id
    report.updated_at = utcnow()
    await audit.log(
        db,
        tenant_id=session.tenant_id,
        type="status_change",
        user_id=session.user_id,
        object_id=report.id,
        data={"status_id": str(status_id)},
    )
    await db.commit()


async def get_file(
    db: AsyncSession, session: Session, report_id: uuid.UUID, file_id: uuid.UUID
) -> tuple[str, str, bytes]:
    report = await _get_report(db, session, report_id)
    report_key = await _report_key(db, session, report)
    rf = await db.get(ReportFile, file_id)
    if rf is None or rf.report_id != report.id:
        raise CaseNotFound("File not found")
    content = storage.load_decrypted(report_key, rf.reference_id)
    name = crypto.decrypt_content(report_key, rf.name) if rf.name else "attachment"
    await audit.log(
        db, tenant_id=session.tenant_id, type="file_download", user_id=session.user_id, object_id=report.id
    )
    await db.commit()
    return name, rf.content_type, content


async def postpone(db: AsyncSession, session: Session, report_id: uuid.UUID, days: int) -> None:
    if not session.permissions.get("can_postpone_expiration", False):
        raise CaseForbidden("Permission denied")
    if days <= 0:
        raise CaseError("Days must be positive")
    report = await _get_report(db, session, report_id)
    await _report_key(db, session, report)
    base = report.expiration_date or utcnow()
    report.expiration_date = base + timedelta(days=days)
    await audit.log(
        db,
        tenant_id=session.tenant_id,
        type="postpone_expiration",
        user_id=session.user_id,
        object_id=report.id,
        data={"days": days},
    )
    await db.commit()


# --- Delayed identity disclosure -------------------------------------------
async def create_identity_request(
    db: AsyncSession, session: Session, report_id: uuid.UUID, motivation: str
) -> str:
    report = await _get_report(db, session, report_id)
    await _report_key(db, session, report)
    iar = IdentityAccessRequest(
        report_id=report.id, request_user_id=_uid(session), request_motivation=motivation
    )
    db.add(iar)
    await db.flush()
    # Route to all custodians of the tenant.
    custodians = (
        await db.scalars(
            select(AppUser).where(
                AppUser.tenant_id == session.tenant_id, AppUser.role == UserRole.custodian
            )
        )
    ).all()
    for c in custodians:
        db.add(IdentityAccessRequestCustodian(iar_id=iar.id, custodian_id=c.id))
    await audit.log(
        db,
        tenant_id=session.tenant_id,
        type="identity_request",
        user_id=session.user_id,
        object_id=report.id,
    )
    await db.commit()
    return str(iar.id)


async def list_pending_identity_requests(db: AsyncSession, session: Session) -> list[dict]:
    rows = (
        await db.scalars(
            select(IdentityAccessRequest)
            .join(
                IdentityAccessRequestCustodian,
                IdentityAccessRequestCustodian.iar_id == IdentityAccessRequest.id,
            )
            .where(
                IdentityAccessRequestCustodian.custodian_id == _uid(session),
                IdentityAccessRequest.status == IARStatus.pending,
            )
            .order_by(IdentityAccessRequest.request_date.desc())
        )
    ).all()
    return [
        {
            "id": str(r.id),
            "report_id": str(r.report_id),
            "request_user_id": str(r.request_user_id),
            "motivation": r.request_motivation,
            "request_date": r.request_date.isoformat(),
        }
        for r in rows
    ]


async def resolve_identity_request(
    db: AsyncSession, session: Session, iar_id: uuid.UUID, grant: bool, motivation: str
) -> None:
    iar = await db.get(IdentityAccessRequest, iar_id)
    if iar is None:
        raise CaseNotFound("Request not found")
    custodian_link = await db.get(IdentityAccessRequestCustodian, (iar_id, _uid(session)))
    if custodian_link is None:
        raise CaseForbidden("Not a custodian for this request")
    if iar.status != IARStatus.pending:
        raise CaseError("Request already resolved")

    iar.status = IARStatus.granted if grant else IARStatus.denied
    iar.reply_user_id = _uid(session)
    iar.reply_date = utcnow()
    iar.reply_motivation = motivation
    if grant:
        report = await db.get(Report, iar.report_id)
        if report and report.encrypted_identity:
            # The custodian unlocks the identity key with their own key, then
            # re-wraps it for the requesting recipient so (only) they can read it.
            wrap = (report.identity_custodian_keys or {}).get(str(_uid(session)))
            if not wrap:
                raise CaseForbidden(
                    "Questo custode non può rilasciare l'identità per questa segnalazione"
                )
            id_prv = crypto.unwrap_report_key_with_private(wrap, session.private_key)
            requester_link = await _link(db, report.id, iar.request_user_id)
            requester = await db.get(AppUser, iar.request_user_id)
            if requester_link and requester and requester.crypto_pub_key:
                requester_link.wrapped_identity_prv_key = crypto.wrap_report_key_for_recipient(
                    id_prv, requester.crypto_pub_key
                )
    await audit.log(
        db,
        tenant_id=session.tenant_id,
        type="identity_resolution",
        user_id=session.user_id,
        object_id=iar.report_id,
        data={"granted": grant},
    )
    await db.commit()


# --- Redaction --------------------------------------------------------------
async def create_redaction(
    db: AsyncSession,
    session: Session,
    report_id: uuid.UUID,
    reference: str,
    mask: list[str],
    permanent: bool,
) -> None:
    if not session.permissions.get("can_redact_information", False):
        raise CaseForbidden("Permission denied")
    report = await _get_report(db, session, report_id)
    report_key = await _report_key(db, session, report)

    if permanent:
        if reference == "answers":
            row = await db.scalar(select(ReportAnswer).where(ReportAnswer.report_id == report.id))
            if row and row.answers.get("ciphertext"):
                data = json.loads(crypto.decrypt_content(report_key, row.answers["ciphertext"]))
                data = {
                    k: (_mask_text(v, mask) if isinstance(v, str) else v) for k, v in data.items()
                }
                row.answers = {
                    "ciphertext": crypto.encrypt_content(report.crypto_pub_key, json.dumps(data))
                }
        else:
            try:
                comment = await db.get(Comment, uuid.UUID(reference))
            except ValueError:
                comment = None
            if comment and comment.report_id == report.id:
                txt = crypto.decrypt_content(report_key, comment.content)
                comment.content = crypto.encrypt_content(report.crypto_pub_key, _mask_text(txt, mask))
        db.add(
            Redaction(
                report_id=report.id, reference_id=reference, entry="permanent",
                permanent_redaction={"mask": mask},
            )
        )
    else:
        db.add(
            Redaction(
                report_id=report.id, reference_id=reference, entry="temporary",
                temporary_redaction={"mask": mask},
            )
        )
    await audit.log(
        db, tenant_id=session.tenant_id, type="redaction", user_id=session.user_id,
        object_id=report.id, data={"permanent": permanent},
    )
    await db.commit()


async def delete_redaction(
    db: AsyncSession, session: Session, report_id: uuid.UUID, redaction_id: uuid.UUID
) -> None:
    if not session.permissions.get("can_redact_information", False):
        raise CaseForbidden("Permission denied")
    red = await db.get(Redaction, redaction_id)
    if red is None or red.report_id != report_id:
        raise CaseNotFound("Redaction not found")
    if red.entry == "permanent":
        raise CaseError("Cannot undo a permanent redaction")
    await db.delete(red)
    await db.commit()
