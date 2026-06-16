"""ORM models for the whistleblowing platform.

Portable types: native UUID/JSONB/ENUM on PostgreSQL, graceful fallbacks on
SQLite (used for fast tests). Privacy invariants are enforced by ABSENCE:
there is deliberately no IP / user-agent / device column anywhere.
Fields marked [ENC] hold app-level ciphertext (libsodium); the DB never sees
plaintext.
"""

import uuid
from datetime import datetime

from sqlalchemy import (
    JSON,
    BigInteger,
    Boolean,
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    Text,
    Uuid,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin, utcnow
from app.db.enums import AuthorKind, CommentVisibility, IARStatus, UserRole

# JSONB on PostgreSQL, plain JSON elsewhere.
JSONType = JSON().with_variant(JSONB, "postgresql")


def _uuid_pk() -> Mapped[uuid.UUID]:
    return mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)


# ---------------------------------------------------------------------------
# Tenant — one organization. Single-tenant deployments use only id=1.
# ---------------------------------------------------------------------------
class Tenant(TimestampMixin, Base):
    __tablename__ = "tenant"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    label: Mapped[str] = mapped_column(Text, default="", nullable=False)
    active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    # Branding / localized texts (logo, colors, intro, policy links).
    settings: Mapped[dict] = mapped_column(JSONType, default=dict, nullable=False)


# ---------------------------------------------------------------------------
# AppUser — internal handlers (admin / recipient / custodian / analyst).
# ---------------------------------------------------------------------------
class AppUser(TimestampMixin, Base):
    __tablename__ = "app_user"
    __table_args__ = ()

    id: Mapped[uuid.UUID] = _uuid_pk()
    tenant_id: Mapped[int] = mapped_column(
        ForeignKey("tenant.id", ondelete="CASCADE"), nullable=False, index=True
    )

    username: Mapped[str] = mapped_column(Text, nullable=False)
    salt: Mapped[str] = mapped_column(Text, default="", nullable=False)
    password_hash: Mapped[str] = mapped_column(Text, default="", nullable=False)
    role: Mapped[UserRole] = mapped_column(
        Enum(UserRole, name="user_role"), default=UserRole.recipient, nullable=False
    )
    enabled: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    name: Mapped[str] = mapped_column(Text, default="", nullable=False)
    public_name: Mapped[str] = mapped_column(Text, default="", nullable=False)
    mail_address: Mapped[str] = mapped_column(Text, default="", nullable=False)  # staff email
    language: Mapped[str] = mapped_column(Text, default="it", nullable=False)

    last_login: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    password_change_needed: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    password_change_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    two_factor_secret: Mapped[str] = mapped_column(Text, default="", nullable=False)
    accepted_privacy_policy: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    # Crypto material (opaque to the DB).
    crypto_pub_key: Mapped[str] = mapped_column(Text, default="", nullable=False)
    crypto_prv_key: Mapped[str] = mapped_column(Text, default="", nullable=False)
    crypto_rec_key: Mapped[str] = mapped_column(Text, default="", nullable=False)
    crypto_escrow_prv_key: Mapped[str] = mapped_column(Text, default="", nullable=False)

    # Granular permissions (least privilege).
    can_delete_submission: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    can_postpone_expiration: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    can_grant_access_to_reports: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    can_redact_information: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    can_mask_information: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    can_reopen_reports: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    can_edit_general_settings: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)


# ---------------------------------------------------------------------------
# Dynamic questionnaire engine: questionnaire -> step -> field -> option
# ---------------------------------------------------------------------------
class Questionnaire(Base):
    __tablename__ = "questionnaire"

    id: Mapped[uuid.UUID] = _uuid_pk()
    tenant_id: Mapped[int] = mapped_column(
        ForeignKey("tenant.id", ondelete="CASCADE"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(Text, default="", nullable=False)

    steps: Mapped[list["Step"]] = relationship(
        back_populates="questionnaire", cascade="all, delete-orphan", order_by="Step.order"
    )


class Step(Base):
    __tablename__ = "step"

    id: Mapped[uuid.UUID] = _uuid_pk()
    questionnaire_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("questionnaire.id", ondelete="CASCADE"), nullable=False, index=True
    )
    label: Mapped[dict] = mapped_column(JSONType, default=dict, nullable=False)
    description: Mapped[dict] = mapped_column(JSONType, default=dict, nullable=False)
    order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    questionnaire: Mapped[Questionnaire] = relationship(back_populates="steps")
    fields: Mapped[list["Field"]] = relationship(
        back_populates="step", cascade="all, delete-orphan", order_by="Field.order"
    )


class Field(Base):
    __tablename__ = "field"

    id: Mapped[uuid.UUID] = _uuid_pk()
    step_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("step.id", ondelete="CASCADE"), nullable=False, index=True
    )
    label: Mapped[dict] = mapped_column(JSONType, default=dict, nullable=False)
    hint: Mapped[dict] = mapped_column(JSONType, default=dict, nullable=False)
    type: Mapped[str] = mapped_column(Text, default="text", nullable=False)
    required: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    step: Mapped[Step] = relationship(back_populates="fields")
    options: Mapped[list["FieldOption"]] = relationship(
        back_populates="field", cascade="all, delete-orphan", order_by="FieldOption.order"
    )


class FieldOption(Base):
    __tablename__ = "field_option"

    id: Mapped[uuid.UUID] = _uuid_pk()
    field_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("field.id", ondelete="CASCADE"), nullable=False, index=True
    )
    label: Mapped[dict] = mapped_column(JSONType, default=dict, nullable=False)
    order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    field: Mapped[Field] = relationship(back_populates="options")


# ---------------------------------------------------------------------------
# Configurable workflow states (ISO 37002).
# ---------------------------------------------------------------------------
class SubmissionStatus(Base):
    __tablename__ = "submission_status"

    id: Mapped[uuid.UUID] = _uuid_pk()
    tenant_id: Mapped[int] = mapped_column(
        ForeignKey("tenant.id", ondelete="CASCADE"), nullable=False, index=True
    )
    label: Mapped[dict] = mapped_column(JSONType, default=dict, nullable=False)
    order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    system_defined: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    substatuses: Mapped[list["SubmissionSubStatus"]] = relationship(
        back_populates="status", cascade="all, delete-orphan", order_by="SubmissionSubStatus.order"
    )


class SubmissionSubStatus(Base):
    __tablename__ = "submission_substatus"

    id: Mapped[uuid.UUID] = _uuid_pk()
    status_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("submission_status.id", ondelete="CASCADE"), nullable=False, index=True
    )
    label: Mapped[dict] = mapped_column(JSONType, default=dict, nullable=False)
    order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    status: Mapped[SubmissionStatus] = relationship(back_populates="substatuses")


# ---------------------------------------------------------------------------
# Context — a reporting channel (e.g. "Anticorruzione").
# ---------------------------------------------------------------------------
class Context(Base):
    __tablename__ = "context"

    id: Mapped[uuid.UUID] = _uuid_pk()
    tenant_id: Mapped[int] = mapped_column(
        ForeignKey("tenant.id", ondelete="CASCADE"), nullable=False, index=True
    )
    name: Mapped[dict] = mapped_column(JSONType, default=dict, nullable=False)
    description: Mapped[dict] = mapped_column(JSONType, default=dict, nullable=False)
    questionnaire_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("questionnaire.id"))
    tip_ttl_days: Mapped[int] = mapped_column(Integer, default=90, nullable=False)  # retention
    tip_reminder_days: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    allow_recipient_selection: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    select_all_recipients: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    hidden: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)


class ContextRecipient(Base):
    __tablename__ = "context_recipient"

    context_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("context.id", ondelete="CASCADE"), primary_key=True
    )
    recipient_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("app_user.id", ondelete="CASCADE"), primary_key=True
    )
    order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)


# ---------------------------------------------------------------------------
# Report — the submission. NO IP / user-agent. Only non-identifying flags.
# ---------------------------------------------------------------------------
class Report(Base):
    __tablename__ = "report"
    __table_args__ = ()

    id: Mapped[uuid.UUID] = _uuid_pk()
    tenant_id: Mapped[int] = mapped_column(
        ForeignKey("tenant.id", ondelete="CASCADE"), nullable=False, index=True
    )
    context_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("context.id"), nullable=False, index=True)
    progressive: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, server_default=func.now(), nullable=False
    )
    last_access: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, server_default=func.now(), nullable=False
    )

    status_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("submission_status.id"), index=True
    )
    substatus_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("submission_substatus.id"))
    label: Mapped[str] = mapped_column(Text, default="", nullable=False)
    important: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    score: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    receipt_hash: Mapped[str] = mapped_column(Text, nullable=False)  # hash of the 16-digit receipt
    receipt_salt: Mapped[str] = mapped_column(Text, default="", nullable=False)  # KDF salt for receipt
    access_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    # True when the whistleblower chose to provide their identity (it is then
    # encrypted to a SEPARATE key, not readable by recipients until released).
    enable_whistleblower_identity: Mapped[bool] = mapped_column(
        Boolean, default=False, nullable=False
    )
    # Cryptographic identity isolation (delayed identity disclosure):
    identity_pub_key: Mapped[str] = mapped_column(Text, default="", nullable=False)
    encrypted_identity: Mapped[str] = mapped_column(Text, default="", nullable=False)  # [ENC]
    # identity private key wrapped per custodian: {custodian_id: sealed_prv}
    identity_custodian_keys: Mapped[dict] = mapped_column(JSONType, default=dict, nullable=False)

    expiration_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), index=True)
    reminder_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    tor: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    mobile: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    # Per-report keypair.
    crypto_pub_key: Mapped[str] = mapped_column(Text, default="", nullable=False)
    crypto_prv_key: Mapped[str] = mapped_column(Text, default="", nullable=False)
    crypto_tip_pub_key: Mapped[str] = mapped_column(Text, default="", nullable=False)
    crypto_tip_prv_key: Mapped[str] = mapped_column(Text, default="", nullable=False)


class ReportAnswer(Base):
    __tablename__ = "report_answer"

    report_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("report.id", ondelete="CASCADE"), primary_key=True
    )
    questionnaire_hash: Mapped[str] = mapped_column(Text, primary_key=True)
    answers: Mapped[dict] = mapped_column(JSONType, default=dict, nullable=False)  # [ENC]
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, server_default=func.now(), nullable=False
    )


class RecipientReport(Base):
    __tablename__ = "recipient_report"

    id: Mapped[uuid.UUID] = _uuid_pk()
    report_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("report.id", ondelete="CASCADE"), nullable=False, index=True
    )
    recipient_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("app_user.id", ondelete="CASCADE"), nullable=False, index=True
    )
    access_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    last_access: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    new: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    enable_notifications: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    # report tip private key wrapped with this recipient's public key
    wrapped_tip_prv_key: Mapped[str] = mapped_column(Text, default="", nullable=False)
    # identity private key wrapped for this recipient, set only when a custodian
    # grants identity access (delayed identity disclosure).
    wrapped_identity_prv_key: Mapped[str] = mapped_column(Text, default="", nullable=False)


class Comment(Base):
    __tablename__ = "comment"

    id: Mapped[uuid.UUID] = _uuid_pk()
    report_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("report.id", ondelete="CASCADE"), nullable=False, index=True
    )
    author_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("app_user.id", ondelete="SET NULL")
    )  # NULL = whistleblower
    author_kind: Mapped[AuthorKind] = mapped_column(
        Enum(AuthorKind, name="author_kind"), default=AuthorKind.whistleblower, nullable=False
    )
    content: Mapped[str] = mapped_column(Text, nullable=False)  # [ENC]
    visibility: Mapped[CommentVisibility] = mapped_column(
        Enum(CommentVisibility, name="comment_visibility"),
        default=CommentVisibility.public,
        nullable=False,
    )
    new: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, server_default=func.now(), nullable=False
    )


class ReportFile(Base):
    __tablename__ = "report_file"

    id: Mapped[uuid.UUID] = _uuid_pk()
    report_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("report.id", ondelete="CASCADE"), nullable=False, index=True
    )
    author_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("app_user.id", ondelete="SET NULL")
    )
    author_kind: Mapped[AuthorKind] = mapped_column(
        Enum(AuthorKind, name="author_kind"), default=AuthorKind.whistleblower, nullable=False
    )
    name: Mapped[str] = mapped_column(Text, default="", nullable=False)  # [ENC] original filename
    content_type: Mapped[str] = mapped_column(Text, default="", nullable=False)
    size: Mapped[int] = mapped_column(BigInteger, default=0, nullable=False)
    reference_id: Mapped[str] = mapped_column(Text, default="", nullable=False)  # storage pointer
    visibility: Mapped[CommentVisibility] = mapped_column(
        Enum(CommentVisibility, name="comment_visibility"),
        default=CommentVisibility.public,
        nullable=False,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, server_default=func.now(), nullable=False
    )


# ---------------------------------------------------------------------------
# Delayed identity disclosure.
# ---------------------------------------------------------------------------
class IdentityAccessRequest(Base):
    __tablename__ = "identity_access_request"

    id: Mapped[uuid.UUID] = _uuid_pk()
    report_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("report.id", ondelete="CASCADE"), nullable=False, index=True
    )
    request_user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("app_user.id"), nullable=False)
    request_date: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, server_default=func.now(), nullable=False
    )
    request_motivation: Mapped[str] = mapped_column(Text, default="", nullable=False)
    status: Mapped[IARStatus] = mapped_column(
        Enum(IARStatus, name="iar_status"), default=IARStatus.pending, nullable=False
    )
    reply_user_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("app_user.id"))
    reply_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    reply_motivation: Mapped[str] = mapped_column(Text, default="", nullable=False)


class IdentityAccessRequestCustodian(Base):
    __tablename__ = "identity_access_request_custodian"

    iar_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("identity_access_request.id", ondelete="CASCADE"), primary_key=True
    )
    custodian_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("app_user.id", ondelete="CASCADE"), primary_key=True
    )
    wrapped_tip_prv_key: Mapped[str] = mapped_column(Text, default="", nullable=False)


class Redaction(Base):
    __tablename__ = "redaction"

    id: Mapped[uuid.UUID] = _uuid_pk()
    report_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("report.id", ondelete="CASCADE"), nullable=False, index=True
    )
    reference_id: Mapped[str] = mapped_column(Text, default="", nullable=False)
    entry: Mapped[str] = mapped_column(Text, default="0", nullable=False)
    temporary_redaction: Mapped[dict] = mapped_column(JSONType, default=dict, nullable=False)
    permanent_redaction: Mapped[dict] = mapped_column(JSONType, default=dict, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, server_default=func.now(), nullable=False
    )


# ---------------------------------------------------------------------------
# Mail — outbound notification queue. Bodies are generic: NEVER report content.
# ---------------------------------------------------------------------------
class Mail(Base):
    __tablename__ = "mail"

    id: Mapped[uuid.UUID] = _uuid_pk()
    tenant_id: Mapped[int] = mapped_column(
        ForeignKey("tenant.id", ondelete="CASCADE"), nullable=False, index=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, server_default=func.now(), nullable=False
    )
    address: Mapped[str] = mapped_column(Text, nullable=False)
    subject: Mapped[str] = mapped_column(Text, nullable=False)
    body: Mapped[str] = mapped_column(Text, nullable=False)
    sent: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False, index=True)
    attempts: Mapped[int] = mapped_column(Integer, default=0, nullable=False)


# ---------------------------------------------------------------------------
# Audit log — handler actions only. NEVER whistleblower IP/UA/content.
# ---------------------------------------------------------------------------
class AuditLog(Base):
    __tablename__ = "audit_log"

    id: Mapped[int] = mapped_column(
        BigInteger().with_variant(Integer, "sqlite"), primary_key=True, autoincrement=True
    )
    tenant_id: Mapped[int] = mapped_column(
        ForeignKey("tenant.id", ondelete="CASCADE"), nullable=False
    )
    occurred_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, server_default=func.now(), nullable=False, index=True
    )
    type: Mapped[str] = mapped_column(Text, default="", nullable=False)
    user_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("app_user.id", ondelete="SET NULL"))
    object_id: Mapped[uuid.UUID | None] = mapped_column(Uuid(as_uuid=True))
    data: Mapped[dict] = mapped_column(JSONType, default=dict, nullable=False)
