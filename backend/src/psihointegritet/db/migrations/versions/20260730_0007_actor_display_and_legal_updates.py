"""Add staff display names and legal-revision update attribution.

Revision ID: 20260730_0007
Revises: 20260730_0006
Create Date: 2026-07-30
"""

import sqlalchemy as sa
from alembic import op

revision: str = "20260730_0007"
down_revision: str | None = "20260730_0006"
branch_labels: str | None = None
depends_on: str | None = None


def upgrade() -> None:
    op.add_column(
        "internal_users",
        sa.Column("display_name", sa.String(length=160), nullable=True),
    )
    op.add_column(
        "legal_document_revisions",
        sa.Column("updated_by_user_id", sa.Uuid(), nullable=True),
    )
    op.create_foreign_key(
        "fk_legal_revision_updated_by_user",
        "legal_document_revisions",
        "internal_users",
        ["updated_by_user_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.add_column(
        "legal_document_revisions",
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )


def downgrade() -> None:
    op.drop_column("legal_document_revisions", "updated_at")
    op.drop_constraint(
        "fk_legal_revision_updated_by_user",
        "legal_document_revisions",
        type_="foreignkey",
    )
    op.drop_column("legal_document_revisions", "updated_by_user_id")
    op.drop_column("internal_users", "display_name")
