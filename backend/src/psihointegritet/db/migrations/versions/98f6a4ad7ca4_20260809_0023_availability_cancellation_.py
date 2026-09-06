"""20260809_0023_availability_cancellation_notice

Revision ID: 98f6a4ad7ca4
Revises: a25320e3f34e
Create Date: 2026-08-09 06:02:52.062918

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "98f6a4ad7ca4"
down_revision: str | Sequence[str] | None = "a25320e3f34e"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "availability_profiles",
        sa.Column(
            "cancellation_notice_hours",
            sa.Integer(),
            server_default="24",
            nullable=False,
        ),
    )


def downgrade() -> None:
    op.drop_column("availability_profiles", "cancellation_notice_hours")
