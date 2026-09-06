"""20260809_0024_exception_note_visibility

Internal note and per-record client visibility on availability exceptions (D-072).

`note` is free text for the internal detail ("Konferencija · Beograd") and is
**never** shown to a client — only the controlled `reason_code` label and the
period may be public.

`client_visible` defaults to **false** so nothing becomes public by accident.
The UI pre-checks it for annual leave, because a client benefits from knowing
the therapist is away for a while and has not stopped working.

Revision ID: cbecea5ab37d
Revises: 98f6a4ad7ca4
Create Date: 2026-08-09 20:26:16.163906

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "cbecea5ab37d"
down_revision: str | Sequence[str] | None = "98f6a4ad7ca4"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "availability_exceptions",
        sa.Column("note", sa.String(length=200), nullable=True),
    )
    op.add_column(
        "availability_exceptions",
        sa.Column(
            "client_visible",
            sa.Boolean(),
            server_default="false",
            nullable=False,
        ),
    )


def downgrade() -> None:
    op.drop_column("availability_exceptions", "client_visible")
    op.drop_column("availability_exceptions", "note")
