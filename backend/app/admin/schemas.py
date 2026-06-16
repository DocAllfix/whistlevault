"""Admin API request models."""

import uuid
from typing import Any

from pydantic import BaseModel


class UserCreate(BaseModel):
    username: str
    password: str
    role: str = "recipient"
    name: str = ""
    mail_address: str = ""


class UserUpdate(BaseModel):
    enabled: bool | None = None
    role: str | None = None
    name: str | None = None
    mail_address: str | None = None
    permissions: dict[str, bool] | None = None


class PasswordReset(BaseModel):
    password: str


class ContextCreate(BaseModel):
    name: dict[str, str]
    description: dict[str, str] = {}
    questionnaire_id: uuid.UUID | None = None
    tip_ttl_days: int = 90
    recipient_ids: list[uuid.UUID] = []
    hidden: bool = False
    order: int = 0


class ContextUpdate(BaseModel):
    name: dict[str, str] | None = None
    description: dict[str, str] | None = None
    questionnaire_id: uuid.UUID | None = None
    tip_ttl_days: int | None = None
    recipient_ids: list[uuid.UUID] | None = None
    hidden: bool | None = None
    order: int | None = None


class FieldOptionIn(BaseModel):
    label: dict[str, str] = {}
    order: int = 0


class FieldIn(BaseModel):
    label: dict[str, str] = {}
    hint: dict[str, str] = {}
    type: str = "text"
    required: bool = False
    order: int = 0
    options: list[FieldOptionIn] = []


class StepIn(BaseModel):
    label: dict[str, str] = {}
    description: dict[str, str] = {}
    order: int = 0
    fields: list[FieldIn] = []


class QuestionnaireIn(BaseModel):
    name: str
    steps: list[StepIn] = []


class StatusCreate(BaseModel):
    label: dict[str, str]
    order: int = 0


class SettingsUpdate(BaseModel):
    settings: dict[str, Any]
