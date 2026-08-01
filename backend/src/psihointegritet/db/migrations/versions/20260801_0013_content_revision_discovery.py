"""Attach controlled Kompas metadata to CMS revisions.

Revision ID: 20260801_0013
Revises: 20260731_0012
Create Date: 2026-08-01
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20260801_0013"
down_revision: str | None = "20260731_0012"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

CONTENT_TAXONOMY_ROLE = sa.Enum(
    "topic_group",
    "topic",
    "audience",
    "content_goal",
    name="contenttaxonomyrole",
    native_enum=False,
    length=32,
)


def upgrade() -> None:
    op.create_table(
        "content_revision_taxonomy_terms",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("revision_id", sa.Uuid(), nullable=False),
        sa.Column("term_id", sa.Uuid(), nullable=False),
        sa.Column("role", CONTENT_TAXONOMY_ROLE, nullable=False),
        sa.ForeignKeyConstraint(["revision_id"], ["content_revisions.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["term_id"], ["taxonomy_terms.id"], ondelete="RESTRICT"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "revision_id", "term_id", "role", name="uq_content_revision_taxonomy_term"
        ),
    )
    op.create_index(
        "ix_content_revision_taxonomy_terms_revision_id",
        "content_revision_taxonomy_terms",
        ["revision_id"],
    )
    op.create_index(
        "ix_content_revision_taxonomy_terms_term_id",
        "content_revision_taxonomy_terms",
        ["term_id"],
    )
    op.create_table(
        "content_revision_discovery",
        sa.Column("revision_id", sa.Uuid(), nullable=False),
        sa.Column("journey_intent_term_id", sa.Uuid(), nullable=True),
        sa.Column("content_format_term_id", sa.Uuid(), nullable=True),
        sa.Column("access_level_term_id", sa.Uuid(), nullable=True),
        sa.ForeignKeyConstraint(["revision_id"], ["content_revisions.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(
            ["journey_intent_term_id"], ["taxonomy_terms.id"], ondelete="RESTRICT"
        ),
        sa.ForeignKeyConstraint(
            ["content_format_term_id"], ["taxonomy_terms.id"], ondelete="RESTRICT"
        ),
        sa.ForeignKeyConstraint(
            ["access_level_term_id"], ["taxonomy_terms.id"], ondelete="RESTRICT"
        ),
        sa.PrimaryKeyConstraint("revision_id"),
    )


def downgrade() -> None:
    op.drop_table("content_revision_discovery")
    op.drop_index(
        "ix_content_revision_taxonomy_terms_term_id", table_name="content_revision_taxonomy_terms"
    )
    op.drop_index(
        "ix_content_revision_taxonomy_terms_revision_id",
        table_name="content_revision_taxonomy_terms",
    )
    op.drop_table("content_revision_taxonomy_terms")
