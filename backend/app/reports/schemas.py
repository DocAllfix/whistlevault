"""Request/response models for the whistleblower API."""

import uuid
from typing import Any

from pydantic import BaseModel


class CreateReportRequest(BaseModel):
    context_id: uuid.UUID | None = None
    answers: dict[str, Any] = {}
    # Optional, voluntary identity. Encrypted to a separate key; never readable
    # by recipients until a custodian grants access.
    identity: dict[str, Any] | None = None
    # Zero-knowledge return channel: if the client supplies a public key derived
    # from its (client-generated) receipt, the server seals the report key to it
    # and never sees the receipt nor decrypts on re-entry.
    wb_pub: str | None = None


class CreateReportResponse(BaseModel):
    report_id: str
    receipt: str
    token: str


class CommentRequest(BaseModel):
    content: str
