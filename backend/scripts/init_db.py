"""Initialize the database schema and seed defaults (dev/bootstrap helper).

Usage:
    WB_DATABASE_URL=... python scripts/init_db.py
"""

import asyncio
import os

from sqlalchemy import select

from app.auth import escrow
from app.db.base import Base, get_engine, get_sessionmaker
from app.db.models import AppUser, Tenant
from app.db.seed import seed


async def main() -> None:
    async with get_engine().begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    async with get_sessionmaker()() as session:
        await seed(session)
        # Provision the initial admin password (required for first login).
        admin_password = os.environ.get("WB_ADMIN_PASSWORD")
        if admin_password:
            admin = await session.scalar(select(AppUser).where(AppUser.username == "admin"))
            if admin and not admin.password_hash:
                tenant = await session.get(Tenant, admin.tenant_id)
                escrow.init_escrow(tenant, admin, admin_password)
                await session.commit()
                print("Admin credentials provisioned + tenant escrow bootstrapped.")
    print("Database initialized and seeded.")


if __name__ == "__main__":
    asyncio.run(main())
