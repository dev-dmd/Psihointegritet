"""Remove the legacy CMS content locale server default.

`content_entries.locale = 'sr-Latn'` predated organization locale settings. All
current application and operational write paths now supply the locale
explicitly, and the create use case resolves an omitted API value from the
verified organization's `default_content_locale`.

This is the contract step of the expand/contract rollout. It changes no rows
and adds no organization fields.

Revision ID: f1a7c9d2e4b6
Revises: e4a91c62d8f7
Create Date: 2026-08-13 23:20:00
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "f1a7c9d2e4b6"
down_revision: str | Sequence[str] | None = "e4a91c62d8f7"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.alter_column(
        "content_entries",
        "locale",
        existing_type=sa.String(length=16),
        existing_nullable=False,
        server_default=None,
    )


def downgrade() -> None:
    op.alter_column(
        "content_entries",
        "locale",
        existing_type=sa.String(length=16),
        existing_nullable=False,
        server_default="sr-Latn",
    )
