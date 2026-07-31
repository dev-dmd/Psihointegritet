"""Add controlled CMS links to published services and programs.

Revision ID: 20260801_0014
Revises: 20260801_0013
Create Date: 2026-08-01
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20260801_0014"
down_revision: str | None = "20260801_0013"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "content_revision_relations",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("revision_id", sa.Uuid(), nullable=False),
        sa.Column("target_entry_id", sa.Uuid(), nullable=False),
        sa.ForeignKeyConstraint(["revision_id"], ["content_revisions.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["target_entry_id"], ["content_entries.id"], ondelete="RESTRICT"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("revision_id", "target_entry_id", name="uq_content_revision_relation"),
    )
    op.create_index("ix_content_revision_relations_revision_id", "content_revision_relations", ["revision_id"])
    op.create_index("ix_content_revision_relations_target_entry_id", "content_revision_relations", ["target_entry_id"])


def downgrade() -> None:
    op.drop_index("ix_content_revision_relations_target_entry_id", table_name="content_revision_relations")
    op.drop_index("ix_content_revision_relations_revision_id", table_name="content_revision_relations")
    op.drop_table("content_revision_relations")
