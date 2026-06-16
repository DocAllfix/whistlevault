"""Fase 1 verification: schema creates, seed populates, relationships load."""

import pytest
import pytest_asyncio
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from sqlalchemy.orm import selectinload
from sqlalchemy.pool import StaticPool

from app.db.base import Base
from app.db.enums import UserRole
from app.db.models import (
    AppUser,
    Context,
    ContextRecipient,
    Field,
    Questionnaire,
    Step,
    SubmissionStatus,
)
from app.db.seed import seed


@pytest_asyncio.fixture
async def session():
    engine = create_async_engine(
        "sqlite+aiosqlite:///:memory:",
        poolclass=StaticPool,
        connect_args={"check_same_thread": False},
    )
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    maker = async_sessionmaker(engine, expire_on_commit=False)
    async with maker() as s:
        yield s
    await engine.dispose()


@pytest.mark.asyncio
async def test_seed_creates_expected_data(session):
    await seed(session)

    # Admin user
    admin = await session.scalar(select(AppUser).where(AppUser.username == "admin"))
    assert admin is not None
    assert admin.role == UserRole.admin
    assert admin.tenant_id == 1

    # Three default workflow statuses
    n_status = await session.scalar(select(func.count()).select_from(SubmissionStatus))
    assert n_status == 3

    # Default questionnaire with one step and four fields (eager-loaded for isolation)
    q = await session.scalar(
        select(Questionnaire)
        .where(Questionnaire.name == "default")
        .options(selectinload(Questionnaire.steps).selectinload(Step.fields).selectinload(Field.options))
    )
    assert q is not None
    assert len(q.steps) == 1
    assert len(q.steps[0].fields) == 4

    # The 'category' select field has options
    category = next(f for f in q.steps[0].fields if f.type == "select")
    assert len(category.options) == 5

    # Default context linked to questionnaire, admin is a recipient
    ctx = await session.scalar(select(Context))
    assert ctx.questionnaire_id == q.id
    link = await session.scalar(
        select(ContextRecipient).where(ContextRecipient.context_id == ctx.id)
    )
    assert link.recipient_id == admin.id


@pytest.mark.asyncio
async def test_seed_is_idempotent(session):
    await seed(session)
    await seed(session)  # second run must not duplicate
    n_status = await session.scalar(select(func.count()).select_from(SubmissionStatus))
    assert n_status == 3
    n_admin = await session.scalar(
        select(func.count()).select_from(AppUser).where(AppUser.username == "admin")
    )
    assert n_admin == 1
