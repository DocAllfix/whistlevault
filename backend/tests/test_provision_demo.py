"""Demo provisioning must create fully ISOLATED tenants: own domains, own admin,
own escrow keypair, own questionnaire. Idempotent on re-run."""

import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import async_sessionmaker

from app.db.models import AppUser, Questionnaire, Tenant
from scripts.provision_demo import _provision_one


@pytest.mark.asyncio
async def test_provision_creates_isolated_tenants(engine):
    maker = async_sessionmaker(engine, expire_on_commit=False)
    async with maker() as s:
        r1 = await _provision_one(s, 1)
        r2 = await _provision_one(s, 2)
        again = await _provision_one(s, 1)  # idempotent

    assert r1 and r2
    assert again is None, "re-provisioning lo stesso tenant non duplica"
    assert r1["password"] != r2["password"], "credenziali distinte per ambiente"
    assert r1["gestione"] != r2["gestione"]

    async with maker() as s:
        tenants = (await s.scalars(select(Tenant))).all()
        admins = (await s.scalars(select(AppUser))).all()
        qs = (await s.scalars(select(Questionnaire).where(Questionnaire.name == "default"))).all()

    t1 = next(t for t in tenants if t.label == "WBApp Demo 1")
    t2 = next(t for t in tenants if t.label == "WBApp Demo 2")
    # distinct host-based routing
    assert t1.backoffice_domain == "wbappdemo1.wbapp.dedyn.io"
    assert t1.public_domain == "wbappdemo1-segnalazioni.wbapp.dedyn.io"
    assert t2.backoffice_domain == "wbappdemo2.wbapp.dedyn.io"
    assert t1.id != t2.id
    # one admin per tenant, friction-free (no forced password change)
    a1 = next(a for a in admins if a.tenant_id == t1.id)
    a2 = next(a for a in admins if a.tenant_id == t2.id)
    assert a1.id != a2.id
    assert a1.username == "admin1" and a2.username == "admin2"
    assert a1.password_change_needed is False and a2.password_change_needed is False
    # isolation at the crypto level: each tenant has its OWN escrow keypair
    assert t1.escrow_pub and t2.escrow_pub and t1.escrow_pub != t2.escrow_pub
    # per-tenant brand name surfaced to the UI via /api/public
    assert (t1.settings or {}).get("branding", {}).get("name") == "WBApp Demo 1"
    assert (t2.settings or {}).get("branding", {}).get("name") == "WBApp Demo 2"
    # each tenant has its own default questionnaire
    q_tenants = {q.tenant_id for q in qs}
    assert {t1.id, t2.id} <= q_tenants
