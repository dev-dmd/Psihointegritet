"""Versioned Kompas flow registry (D-058 / ADR-025).

Written by hand. It intentionally contains only the three flow lifecycle
tables and no unrelated autogenerate drift.

Revision ID: 20260803_0016
Revises: 20260802_0015
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "20260803_0016"
down_revision: str | Sequence[str] | None = "20260802_0015"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "compass_flows",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("organization_id", sa.Uuid(), nullable=False),
        sa.Column("stable_id", sa.String(length=80), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_compass_flows")),
        sa.UniqueConstraint("organization_id", "stable_id", name="uq_compass_flow_identity"),
        sa.UniqueConstraint("id", "organization_id", name="uq_compass_flow_id_organization"),
    )
    op.create_index(op.f("ix_compass_flows_organization_id"), "compass_flows", ["organization_id"])

    op.create_table(
        "compass_flow_versions",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("flow_id", sa.Uuid(), nullable=False),
        sa.Column("organization_id", sa.Uuid(), nullable=False),
        sa.Column("version", sa.Integer(), nullable=False),
        sa.Column("locale", sa.String(length=16), server_default="sr-Latn", nullable=False),
        sa.Column("definition", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("status", sa.String(length=32), server_default="draft", nullable=False),
        sa.Column("lock_version", sa.Integer(), server_default="1", nullable=False),
        sa.Column("created_by_user_id", sa.Uuid(), nullable=True),
        sa.Column("updated_by_user_id", sa.Uuid(), nullable=True),
        sa.Column("published_by_user_id", sa.Uuid(), nullable=True),
        sa.Column("archived_by_user_id", sa.Uuid(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("published_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("archived_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(
            ["flow_id", "organization_id"],
            ["compass_flows.id", "compass_flows.organization_id"],
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(["created_by_user_id"], ["internal_users.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["updated_by_user_id"], ["internal_users.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(
            ["published_by_user_id"], ["internal_users.id"], ondelete="SET NULL"
        ),
        sa.ForeignKeyConstraint(
            ["archived_by_user_id"], ["internal_users.id"], ondelete="SET NULL"
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_compass_flow_versions")),
        sa.UniqueConstraint("flow_id", "version", "locale", name="uq_compass_flow_version"),
        sa.UniqueConstraint(
            "id", "organization_id", name="uq_compass_flow_version_id_organization"
        ),
    )
    op.create_index(op.f("ix_compass_flow_versions_flow_id"), "compass_flow_versions", ["flow_id"])
    op.create_index(
        op.f("ix_compass_flow_versions_organization_id"),
        "compass_flow_versions",
        ["organization_id"],
    )
    op.create_index(op.f("ix_compass_flow_versions_status"), "compass_flow_versions", ["status"])
    op.create_index(
        "uq_compass_flow_published",
        "compass_flow_versions",
        ["flow_id", "locale"],
        unique=True,
        postgresql_where=sa.text("status = 'published'"),
    )

    op.create_table(
        "compass_flow_review_decisions",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("flow_version_id", sa.Uuid(), nullable=False),
        sa.Column("organization_id", sa.Uuid(), nullable=False),
        sa.Column("capability", sa.String(length=32), nullable=False),
        sa.Column("outcome", sa.String(length=32), nullable=False),
        sa.Column("decided_by_user_id", sa.Uuid(), nullable=True),
        sa.Column("note", sa.String(length=500), nullable=True),
        sa.Column(
            "decided_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(
            ["flow_version_id", "organization_id"],
            ["compass_flow_versions.id", "compass_flow_versions.organization_id"],
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(["decided_by_user_id"], ["internal_users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_compass_flow_review_decisions")),
        sa.UniqueConstraint(
            "flow_version_id", "capability", name="uq_compass_flow_review_capability"
        ),
    )
    op.create_index(
        op.f("ix_compass_flow_review_decisions_flow_version_id"),
        "compass_flow_review_decisions",
        ["flow_version_id"],
    )
    op.create_index(
        op.f("ix_compass_flow_review_decisions_organization_id"),
        "compass_flow_review_decisions",
        ["organization_id"],
    )


def downgrade() -> None:
    op.drop_index(
        op.f("ix_compass_flow_review_decisions_organization_id"),
        table_name="compass_flow_review_decisions",
    )
    op.drop_index(
        op.f("ix_compass_flow_review_decisions_flow_version_id"),
        table_name="compass_flow_review_decisions",
    )
    op.drop_table("compass_flow_review_decisions")
    op.drop_index("uq_compass_flow_published", table_name="compass_flow_versions")
    op.drop_index(op.f("ix_compass_flow_versions_status"), table_name="compass_flow_versions")
    op.drop_index(
        op.f("ix_compass_flow_versions_organization_id"), table_name="compass_flow_versions"
    )
    op.drop_index(op.f("ix_compass_flow_versions_flow_id"), table_name="compass_flow_versions")
    op.drop_table("compass_flow_versions")
    op.drop_index(op.f("ix_compass_flows_organization_id"), table_name="compass_flows")
    op.drop_table("compass_flows")
