"""Add canonical Kompas taxonomy routes and immutable aliases.

Revision ID: 20260731_0012
Revises: 20260731_0011
Create Date: 2026-07-31
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20260731_0012"
down_revision: str | None = "20260731_0011"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

ROUTE_KIND = sa.Enum(
    "oblast",
    "tema",
    name="taxonomyroutekind",
    native_enum=False,
    length=16,
)


def upgrade() -> None:
    op.create_table(
        "taxonomy_term_routes",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("organization_id", sa.Uuid(), nullable=False),
        sa.Column("term_id", sa.Uuid(), nullable=False),
        sa.Column("locale", sa.String(length=16), nullable=False),
        sa.Column("route_kind", ROUTE_KIND, nullable=False),
        sa.Column("slug", sa.String(length=160), nullable=False),
        sa.Column("is_canonical", sa.Boolean(), server_default=sa.text("true"), nullable=False),
        sa.Column("lock_version", sa.Integer(), server_default="1", nullable=False),
        sa.Column("created_by_user_id", sa.Uuid(), nullable=True),
        sa.Column("updated_by_user_id", sa.Uuid(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column("superseded_at", sa.DateTime(timezone=True), nullable=True),
        sa.CheckConstraint(
            "(is_canonical AND superseded_at IS NULL) OR "
            "(NOT is_canonical AND superseded_at IS NOT NULL)",
            name="ck_taxonomy_term_routes_taxonomy_route_canonical_state",
        ),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["term_id"], ["taxonomy_terms.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["created_by_user_id"], ["internal_users.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["updated_by_user_id"], ["internal_users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_taxonomy_term_routes_organization_id",
        "taxonomy_term_routes",
        ["organization_id"],
    )
    op.create_index("ix_taxonomy_term_routes_term_id", "taxonomy_term_routes", ["term_id"])
    op.create_index(
        "uq_tax_route_path",
        "taxonomy_term_routes",
        ["organization_id", "locale", "route_kind", "slug"],
        unique=True,
    )
    op.create_index(
        "uq_tax_route_canonical",
        "taxonomy_term_routes",
        ["term_id", "locale"],
        unique=True,
        postgresql_where=sa.text("is_canonical"),
    )


def downgrade() -> None:
    op.drop_index("uq_tax_route_canonical", table_name="taxonomy_term_routes")
    op.drop_index("uq_tax_route_path", table_name="taxonomy_term_routes")
    op.drop_index("ix_taxonomy_term_routes_term_id", table_name="taxonomy_term_routes")
    op.drop_index("ix_taxonomy_term_routes_organization_id", table_name="taxonomy_term_routes")
    op.drop_table("taxonomy_term_routes")
