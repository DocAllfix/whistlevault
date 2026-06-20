"""Provision N neutral demo tenants (isolated environments) for sales testing.

Each tenant gets its OWN domains, admin credentials, escrow and the default
questionnaire — a fully isolated environment (data + crypto). Idempotent: a
tenant already present (matched by backoffice_domain) is skipped, so re-running
never duplicates. Prints and writes a link <-> credentials table.

This is a DEMO helper (branch `demo-sales`); production stays on `main`.

Usage (inside the api container):
    WB_DEMO_BASE_DOMAIN=wbapp.dedyn.io WB_DEMO_COUNT=10 \
    python scripts/provision_demo.py
"""

import asyncio
import os
import secrets

from sqlalchemy import select, text

from app.auth import escrow
from app.db.base import get_sessionmaker
from app.db.models import AppUser, Tenant
from app.db.seed import (
    _seed_admin,
    _seed_default_context,
    _seed_default_questionnaire,
    _seed_statuses,
)

BASE = os.environ.get("WB_DEMO_BASE_DOMAIN", "wbapp.dedyn.io")
COUNT = int(os.environ.get("WB_DEMO_COUNT", "10"))
CRED_FILE = os.environ.get("WB_DEMO_CRED_FILE", "/data/demo-credentials.txt")


async def _provision_one(session, n: int) -> dict | None:
    backoffice_domain = f"wbappdemo{n}.{BASE}"
    public_domain = f"wbappdemo{n}-segnalazioni.{BASE}"
    existing = await session.scalar(
        select(Tenant).where(Tenant.backoffice_domain == backoffice_domain)
    )
    if existing:
        return None  # idempotent: already provisioned

    tenant = Tenant(
        label=f"WBApp Demo {n}",
        active=True,
        public_domain=public_domain,
        backoffice_domain=backoffice_domain,
    )
    session.add(tenant)
    await session.flush()

    admin = await _seed_admin(session, tenant.id)
    await _seed_statuses(session, tenant.id)
    questionnaire = await _seed_default_questionnaire(session, tenant.id)
    await _seed_default_context(session, questionnaire, admin, tenant.id)

    password = secrets.token_hex(8)  # 16 hex chars, friction-free demo login
    recovery = escrow.init_escrow(tenant, admin, password)  # sets password_change_needed=False
    await session.commit()

    return {
        "n": n,
        "label": tenant.label,
        "gestione": f"https://{backoffice_domain}",
        "segnalazioni": f"https://{public_domain}",
        "username": "admin",
        "password": password,
        "recovery": recovery,
    }


def _format(rows: list[dict]) -> str:
    lines = ["# Demo WBApp — link e credenziali (riservato)", ""]
    for r in rows:
        lines += [
            f"## {r['label']}",
            f"  Segnalazioni (pubblico): {r['segnalazioni']}",
            f"  Gestione (backoffice):   {r['gestione']}",
            f"  Utente:    {r['username']}",
            f"  Password:  {r['password']}",
            f"  Recovery:  {r['recovery']}",
            "",
        ]
    return "\n".join(lines)


async def main() -> None:
    rows: list[dict] = []
    async with get_sessionmaker()() as session:
        # The default tenant is seeded with an explicit id=1, which does NOT advance
        # the Postgres id sequence; sync it so auto-id inserts don't collide.
        if session.bind.dialect.name == "postgresql":
            await session.execute(
                text(
                    "SELECT setval(pg_get_serial_sequence('tenant','id'), "
                    "(SELECT COALESCE(MAX(id), 1) FROM tenant))"
                )
            )
            await session.commit()
        for n in range(1, COUNT + 1):
            r = await _provision_one(session, n)
            if r:
                rows.append(r)

        # Keep the demo clean: the inert default tenant (id=1, no domains) must not
        # interfere with host-based tenant resolution.
        default = await session.get(Tenant, 1)
        if default and not default.public_domain and not default.backoffice_domain and default.active:
            default.active = False
            await session.commit()

    if not rows:
        print("Nessun nuovo tenant creato (gia presenti). Niente da fare.")
        return

    report = _format(rows)
    print(report)
    try:
        with open(CRED_FILE, "w", encoding="utf-8") as fh:
            fh.write(report)
        print(f"\n[ok] Credenziali salvate in {CRED_FILE}")
    except OSError as exc:
        print(f"\n[warn] Impossibile scrivere {CRED_FILE}: {exc}")


if __name__ == "__main__":
    asyncio.run(main())
