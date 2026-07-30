"""Persist the existing SeoFields shape on content revisions.

Revision ID: 20260730_0008
Revises: 20260730_0007
Create Date: 2026-07-30
"""

import sqlalchemy as sa
from alembic import op

revision: str = "20260730_0008"
down_revision: str | None = "20260730_0007"
branch_labels: str | None = None
depends_on: str | None = None


def upgrade() -> None:
    op.add_column(
        "content_revisions",
        sa.Column(
            "seo",
            sa.JSON(),
            nullable=False,
            server_default='{"title": "", "description": ""}',
        ),
    )


def downgrade() -> None:
    op.drop_column("content_revisions", "seo")
