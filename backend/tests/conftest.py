"""Shared test fixtures: in-memory DB, seeded data, HTTP client with overrides."""

import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from sqlalchemy.pool import StaticPool

from app import crypto
from app.auth import escrow
from app.core import ratelimit
from app.db.base import Base, get_session
from app.db.models import AppUser, Context, Report, Tenant
from app.db.seed import seed
from app.main import app

ADMIN_PASSWORD = "AdminPass123!"


@pytest_asyncio.fixture
async def engine():
    eng = create_async_engine(
        "sqlite+aiosqlite:///:memory:",
        poolclass=StaticPool,
        connect_args={"check_same_thread": False},
    )
    async with eng.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield eng
    await eng.dispose()


@pytest_asyncio.fixture
async def seeded(engine):
    """Seed defaults, provision the admin password, and create one report."""
    maker = async_sessionmaker(engine, expire_on_commit=False)
    async with maker() as s:
        await seed(s)
        admin = await s.scalar(select(AppUser).where(AppUser.username == "admin"))
        tenant = await s.get(Tenant, admin.tenant_id)
        escrow.init_escrow(tenant, admin, ADMIN_PASSWORD)

        ctx = await s.scalar(select(Context))
        report_pub, report_prv = crypto.generate_keypair()
        receipt = crypto.generate_receipt()
        salt = crypto.new_salt()
        report = Report(
            tenant_id=1,
            context_id=ctx.id,
            receipt_hash=crypto.hash_receipt(receipt),
            receipt_salt=salt,
            crypto_pub_key=report_pub,
            crypto_prv_key=crypto.wrap_report_key_for_secret(report_prv, receipt, salt),
        )
        s.add(report)
        await s.commit()
    return {"receipt": receipt, "admin_password": ADMIN_PASSWORD}


@pytest_asyncio.fixture
async def client(engine, seeded):
    maker = async_sessionmaker(engine, expire_on_commit=False)

    async def override_get_session():
        async with maker() as s:
            yield s

    app.dependency_overrides[get_session] = override_get_session
    ratelimit.reset()
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac, seeded
    app.dependency_overrides.clear()
