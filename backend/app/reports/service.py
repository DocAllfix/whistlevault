"""Report lifecycle service: submission, decrypted view, comments, attachments."""

import json
import uuid
from datetime import timedelta

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app import crypto
from app.auth.sessions import Session
from app.db.base import utcnow
from app.db.enums import AuthorKind, CommentVisibility, UserRole
from app.db.models import (
    AppUser,
    Comment,
    Context,
    ContextRecipient,
    Field,
    Questionnaire,
    RecipientReport,
    Report,
    ReportAnswer,
    ReportFile,
    Step,
    SubmissionStatus,
)
from app.files import storage


class ValidationError(Exception):
    """Raised when submitted answers do not satisfy the questionnaire."""


async def _load_questionnaire(db: AsyncSession, questionnaire_id) -> Questionnaire | None:
    return await db.scalar(
        select(Questionnaire)
        .where(Questionnaire.id == questionnaire_id)
        .options(
            selectinload(Questionnaire.steps).selectinload(Step.fields).selectinload(Field.options)
        )
    )


def _compute_score(questionnaire: Questionnaire, answers: dict) -> int:
    """Sum the score of the chosen options (select/multiselect) → risk score."""
    total = 0
    for step in questionnaire.steps:
        for field in step.fields:
            if field.type not in ("select", "multiselect"):
                continue
            value = answers.get(str(field.id))
            if value is None:
                continue
            chosen = set(value if isinstance(value, list) else [value])
            for opt in field.options:
                if set(opt.label.values()) & chosen:
                    total += opt.score
    return total


def _validate_answers(questionnaire: Questionnaire, answers: dict) -> None:
    fields = [f for step in questionnaire.steps for f in step.fields]
    field_ids = {str(f.id) for f in fields}
    unknown = set(answers) - field_ids
    if unknown:
        raise ValidationError(f"Unknown fields: {sorted(unknown)}")

    by_key = {f.key: f for f in fields if f.key}

    def is_active(field) -> bool:
        # A conditional field is active only when its trigger condition is met.
        if not field.trigger_field_key:
            return True
        trigger = by_key.get(field.trigger_field_key)
        if trigger is None:
            return True
        value = answers.get(str(trigger.id))
        if isinstance(value, list):
            return field.trigger_value in value
        return value == field.trigger_value

    for field in fields:
        if field.required and is_active(field):
            value = answers.get(str(field.id))
            if value in (None, "", [], {}):
                raise ValidationError(f"Missing required field: {field.id}")


async def create_report(
    db: AsyncSession,
    *,
    tenant_id: int,
    context_id: uuid.UUID,
    answers: dict,
    identity: dict | None = None,
    wb_pub: str | None = None,
) -> tuple[Report, str | None, str | None]:
    context = await db.get(Context, context_id)
    if context is None or context.tenant_id != tenant_id:
        raise ValidationError("Invalid context")

    questionnaire = await _load_questionnaire(db, context.questionnaire_id)
    if questionnaire is None:
        raise ValidationError("Context has no questionnaire")
    _validate_answers(questionnaire, answers)
    score = _compute_score(questionnaire, answers)

    report_pub, report_prv = crypto.generate_keypair()

    if wb_pub:
        # Zero-knowledge: seal the report key to the client receipt-derived public
        # key. The server never sees the receipt and cannot decrypt on re-entry.
        receipt = None
        session_prv = None
        receipt_hash = crypto.hash_receipt(wb_pub)
        receipt_salt = ""
        wrapped_prv = crypto.wrap_report_key_for_recipient(report_prv, wb_pub)
    else:
        # Legacy: server-side receipt key derivation.
        receipt = crypto.generate_receipt()
        session_prv = report_prv
        receipt_salt = crypto.new_salt()
        receipt_hash = crypto.hash_receipt(receipt)
        wrapped_prv = crypto.wrap_report_key_for_secret(report_prv, receipt, receipt_salt)

    default_status = await db.scalar(
        select(SubmissionStatus)
        .where(SubmissionStatus.tenant_id == tenant_id)
        .order_by(SubmissionStatus.order)
        .limit(1)
    )
    max_progressive = await db.scalar(
        select(func.coalesce(func.max(Report.progressive), 0)).where(Report.tenant_id == tenant_id)
    )

    report = Report(
        tenant_id=tenant_id,
        context_id=context_id,
        progressive=(max_progressive or 0) + 1,
        status_id=default_status.id if default_status else None,
        score=score,
        important=bool(context.score_threshold_high and score >= context.score_threshold_high),
        receipt_hash=receipt_hash,
        receipt_salt=receipt_salt,
        crypto_pub_key=report_pub,
        crypto_prv_key=wrapped_prv,
        expiration_date=utcnow() + timedelta(days=context.tip_ttl_days),
    )
    db.add(report)
    await db.flush()

    enc_answers = crypto.encrypt_content(report_pub, json.dumps(answers))
    db.add(
        ReportAnswer(
            report_id=report.id,
            questionnaire_hash=questionnaire.id.hex,
            answers={"ciphertext": enc_answers},
        )
    )

    # Optional identity: encrypted to a SEPARATE key, wrapped only for custodians.
    # Recipients hold the report key, which cannot open this. Released only on
    # custodian grant (delayed identity disclosure).
    if identity:
        id_pub, id_prv = crypto.generate_keypair()
        report.identity_pub_key = id_pub
        report.encrypted_identity = crypto.encrypt_content(id_pub, json.dumps(identity))
        report.enable_whistleblower_identity = True
        custodians = (
            await db.scalars(
                select(AppUser).where(
                    AppUser.tenant_id == tenant_id,
                    AppUser.role == UserRole.custodian,
                    AppUser.enabled.is_(True),
                )
            )
        ).all()
        report.identity_custodian_keys = {
            str(c.id): crypto.wrap_report_key_for_recipient(id_prv, c.crypto_pub_key)
            for c in custodians
            if c.crypto_pub_key
        }

    recipient_ids = (
        await db.scalars(
            select(AppUser)
            .join(ContextRecipient, ContextRecipient.recipient_id == AppUser.id)
            .where(ContextRecipient.context_id == context_id)
        )
    ).all()
    for recipient in recipient_ids:
        wrapped = (
            crypto.wrap_report_key_for_recipient(report_prv, recipient.crypto_pub_key)
            if recipient.crypto_pub_key
            else ""
        )
        db.add(
            RecipientReport(
                report_id=report.id, recipient_id=recipient.id, wrapped_tip_prv_key=wrapped
            )
        )

    from app.notifications import service as notifications

    await notifications.notify_new_report(db, tenant_id=tenant_id, context_id=context_id)

    await db.commit()
    return report, receipt, session_prv


async def get_report_for_session(db: AsyncSession, session: Session) -> Report:
    report = await db.get(Report, uuid.UUID(session.report_id))
    if report is None:
        raise ValidationError("Report not found")
    return report


async def get_whistleblower_view(db: AsyncSession, session: Session) -> dict:
    report = await get_report_for_session(db, session)
    answer_row = await db.scalar(select(ReportAnswer).where(ReportAnswer.report_id == report.id))
    comments = (
        await db.scalars(
            select(Comment)
            .where(Comment.report_id == report.id, Comment.visibility == CommentVisibility.public)
            .order_by(Comment.created_at)
        )
    ).all()
    files = (
        await db.scalars(
            select(ReportFile)
            .where(ReportFile.report_id == report.id, ReportFile.visibility == CommentVisibility.public)
            .order_by(ReportFile.created_at)
        )
    ).all()

    base = {
        "report_id": str(report.id),
        "progressive": report.progressive,
        "status_id": str(report.status_id) if report.status_id else None,
        "created_at": report.created_at.isoformat(),
    }

    if not session.report_key:
        # Zero-knowledge: the server holds no key for this report → return
        # ciphertext for client-side decryption (it never decrypts here).
        base.update(
            {
                "zk": True,
                "sealed_report_prv": report.crypto_prv_key,
                "report_pub": report.crypto_pub_key,
                "answers_ct": answer_row.answers.get("ciphertext", "") if answer_row else "",
                "comments": [
                    {
                        "id": str(c.id),
                        "author_kind": c.author_kind.value,
                        "content_ct": c.content,
                        "created_at": c.created_at.isoformat(),
                    }
                    for c in comments
                ],
                "files": [
                    {
                        "id": str(f.id),
                        "name_ct": f.name,
                        "content_type": f.content_type,
                        "size": f.size,
                        "author_kind": f.author_kind.value,
                    }
                    for f in files
                ],
            }
        )
        return base

    # Legacy: server-side decryption (the session holds the report key).
    base.update(
        {
            "zk": False,
            "answers": json.loads(crypto.decrypt_content(session.report_key, answer_row.answers["ciphertext"]))
            if answer_row
            else {},
            "comments": [
                {
                    "id": str(c.id),
                    "author_kind": c.author_kind.value,
                    "content": crypto.decrypt_content(session.report_key, c.content),
                    "created_at": c.created_at.isoformat(),
                }
                for c in comments
            ],
            "files": [
                {
                    "id": str(f.id),
                    "name": crypto.decrypt_content(session.report_key, f.name) if f.name else "",
                    "content_type": f.content_type,
                    "size": f.size,
                    "author_kind": f.author_kind.value,
                }
                for f in files
            ],
        }
    )
    return base


async def add_whistleblower_comment(db: AsyncSession, session: Session, content: str) -> None:
    report = await get_report_for_session(db, session)
    db.add(
        Comment(
            report_id=report.id,
            author_id=None,
            author_kind=AuthorKind.whistleblower,
            content=crypto.encrypt_content(report.crypto_pub_key, content),
            visibility=CommentVisibility.public,
        )
    )
    report.updated_at = utcnow()

    from app.notifications import service as notifications

    await notifications.notify_recipients(
        db, tenant_id=report.tenant_id, context_id=report.context_id, event="new_comment"
    )
    await db.commit()


async def add_whistleblower_file(
    db: AsyncSession, session: Session, *, filename: str, content_type: str, content: bytes
) -> str:
    report = await get_report_for_session(db, session)
    reference_id = storage.store_encrypted(report.crypto_pub_key, content, tenant_id=report.tenant_id)
    rf = ReportFile(
        report_id=report.id,
        author_id=None,
        author_kind=AuthorKind.whistleblower,
        name=crypto.encrypt_content(report.crypto_pub_key, filename),
        content_type=content_type,
        size=len(content),
        reference_id=reference_id,
        visibility=CommentVisibility.public,
    )
    db.add(rf)
    report.updated_at = utcnow()
    await db.commit()
    return str(rf.id)
