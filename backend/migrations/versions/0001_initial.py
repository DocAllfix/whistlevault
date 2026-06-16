"""initial baseline schema

Baseline migration: creates the full schema from the ORM metadata against the
bound connection, so dialect-specific types (JSONB/ENUM/uuid on PostgreSQL) are
rendered correctly. Subsequent schema changes use normal autogenerate revisions.

Revision ID: 0001_initial
Revises:
Create Date: 2026-06-16
"""
from typing import Sequence, Union

from alembic import op

from app.db.base import Base
import app.db.models  # noqa: F401  (register metadata)

revision: str = "0001_initial"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    Base.metadata.create_all(bind=op.get_bind())


def downgrade() -> None:
    Base.metadata.drop_all(bind=op.get_bind())
