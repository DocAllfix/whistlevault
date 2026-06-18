"""tenant per-domain routing columns (multi-tenant Host resolution)

Adds tenant.public_domain / tenant.backoffice_domain used by
app.core.tenancy.resolve_tenant_id. Idempotent: on a fresh database the baseline
0001 (create_all from current metadata) already creates these columns, so this
revision skips them; on an already-provisioned database it adds them.

Revision ID: 0002_tenant_domains
Revises: 0001_initial
Create Date: 2026-06-18
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0002_tenant_domains"
down_revision: Union[str, None] = "0001_initial"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    insp = sa.inspect(bind)
    cols = {c["name"] for c in insp.get_columns("tenant")}
    idx = {i["name"] for i in insp.get_indexes("tenant")}
    if "public_domain" not in cols:
        op.add_column("tenant", sa.Column("public_domain", sa.Text(), nullable=False, server_default=""))
    if "backoffice_domain" not in cols:
        op.add_column("tenant", sa.Column("backoffice_domain", sa.Text(), nullable=False, server_default=""))
    if "ix_tenant_public_domain" not in idx:
        op.create_index("ix_tenant_public_domain", "tenant", ["public_domain"])
    if "ix_tenant_backoffice_domain" not in idx:
        op.create_index("ix_tenant_backoffice_domain", "tenant", ["backoffice_domain"])


def downgrade() -> None:
    op.drop_index("ix_tenant_backoffice_domain", table_name="tenant")
    op.drop_index("ix_tenant_public_domain", table_name="tenant")
    op.drop_column("tenant", "backoffice_domain")
    op.drop_column("tenant", "public_domain")
