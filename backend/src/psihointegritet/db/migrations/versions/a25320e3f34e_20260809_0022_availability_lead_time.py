"""20260809_0022_availability_lead_time

Minimum booking notice, per therapist.

CTO decision 2026-08-09: a free slot may only be booked a configurable number
of hours ahead, and the setting lives on the therapist's availability profile —
never on the organisation. One therapist wanting two days of notice must not
impose that on the rest of the team.

Default 24. Existing rows get it from the server default, so no backfill is
needed and no therapist silently ends up with zero notice.

Revision ID: a25320e3f34e
Revises: 20260810_0022
Create Date: 2026-08-09 05:28:50.777207

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "a25320e3f34e"
down_revision: str | Sequence[str] | None = "20260810_0022"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "availability_profiles",
        sa.Column(
            "min_lead_time_hours",
            sa.Integer(),
            server_default="24",
            nullable=False,
        ),
    )


def downgrade() -> None:
    op.drop_column("availability_profiles", "min_lead_time_hours")
