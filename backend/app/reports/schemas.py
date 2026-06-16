"""Request/response models for the whistleblower API."""

import uuid
from typing import Any

from pydantic import BaseModel


class CreateReportRequest(BaseModel):
    context_id: uuid.UUID | None = None
    answers: dict[str, Any] = {}


class CreateReportResponse(BaseModel):
    report_id: str
    receipt: str
    token: str


class CommentRequest(BaseModel):
    content: str
