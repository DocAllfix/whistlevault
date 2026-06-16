"""Request models for the case-management API."""

import uuid

from pydantic import BaseModel


class HandlerCommentRequest(BaseModel):
    content: str
    visibility: str = "public"  # public | internal | personal


class StatusChangeRequest(BaseModel):
    status_id: uuid.UUID
    substatus_id: uuid.UUID | None = None


class PostponeRequest(BaseModel):
    days: int


class IdentityRequestCreate(BaseModel):
    motivation: str = ""


class IdentityRequestResolve(BaseModel):
    grant: bool
    motivation: str = ""
