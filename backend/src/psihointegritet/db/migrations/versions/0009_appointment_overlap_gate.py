"""Booking Integrity Gate — DB-level appointment overlap protection.

The Python-side `is_available()` check (domain.py) stays for fast slot
display and UX, but it only ever sees whatever the current request already
loaded — two concurrent confirmations of overlapping requests both pass it.
PostgreSQL becomes the final authority via an EXCLUDE constraint: only one of
two racing INSERTs for the same organization+therapist+overlapping interval
can commit, and the loser gets a normal, catchable `23P01` error instead of
silently creating a double-booking.

`'[)'` (start inclusive, end exclusive) means a 10:00-11:00 appointment does
not conflict with an immediately-following 11:00-12:00 one — back-to-back
slots are allowed, only true overlaps are rejected.

`cancelled` appointments are excluded from the guarded status set: a
cancelled appointment no longer occupies the calendar, so the same slot must
be bookable again.

Preflight aborts instead of silently repairing: which of two existing
overlapping appointments to keep (cancel, reschedule, contact the client) is
an operational decision, not something a migration should guess.
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "0009"
down_revision: str | None = "0008"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

_GUARDED_STATUSES = ("confirmed", "completed", "no_show")
_RANGE_CHECK_NAME = "ck_appointments_valid_time_range"
_EXCLUDE_NAME = "appointments_no_therapist_overlap"


def upgrade() -> None:
    conn = op.get_bind()
    op.execute("CREATE EXTENSION IF NOT EXISTS btree_gist")

    overlaps = conn.execute(
        sa.text(
            """
            SELECT a1.id AS id_a, a2.id AS id_b,
                   a1.organization_id, a1.therapist_profile_id,
                   a1.start_time AS start_a, a1.end_time AS end_a,
                   a2.start_time AS start_b, a2.end_time AS end_b
            FROM appointments a1
            JOIN appointments a2
              ON a1.organization_id = a2.organization_id
             AND a1.therapist_profile_id = a2.therapist_profile_id
             AND a1.id < a2.id
             AND a1.status = ANY(:statuses)
             AND a2.status = ANY(:statuses)
             AND tstzrange(a1.start_time, a1.end_time, '[)')
                 && tstzrange(a2.start_time, a2.end_time, '[)')
            """
        ),
        {"statuses": list(_GUARDED_STATUSES)},
    ).fetchall()
    if overlaps:
        report = "\n".join(
            f"  org={row.organization_id} therapist={row.therapist_profile_id}: "
            f"appointment {row.id_a} [{row.start_a}, {row.end_a}) overlaps "
            f"appointment {row.id_b} [{row.start_b}, {row.end_b})"
            for row in overlaps
        )
        raise RuntimeError(
            f"Aborting: {len(overlaps)} existing overlapping appointment pair(s) found "
            "among confirmed/completed/no_show appointments. Resolve manually (cancel, "
            "reschedule, or contact the client for one side of each pair) before "
            f"re-running this migration:\n{report}"
        )

    op.create_check_constraint(
        op.f(_RANGE_CHECK_NAME),
        "appointments",
        "end_time > start_time",
    )
    op.execute(
        f"""
        ALTER TABLE appointments
        ADD CONSTRAINT {_EXCLUDE_NAME}
        EXCLUDE USING gist (
            organization_id WITH =,
            therapist_profile_id WITH =,
            tstzrange(start_time, end_time, '[)') WITH &&
        )
        WHERE (status IN {_GUARDED_STATUSES!r})
        DEFERRABLE INITIALLY IMMEDIATE
        """
    )


def downgrade() -> None:
    op.execute(f"ALTER TABLE appointments DROP CONSTRAINT {_EXCLUDE_NAME}")
    op.drop_constraint(op.f(_RANGE_CHECK_NAME), "appointments", type_="check")
