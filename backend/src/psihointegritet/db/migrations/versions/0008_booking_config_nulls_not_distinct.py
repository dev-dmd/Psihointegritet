"""Booking Integrity Gate — service_booking_configs NULLS NOT DISTINCT.

PostgreSQL's default UNIQUE constraint treats NULL != NULL, so two configs for
the same organization/service/therapist/format with location_id IS NULL (the
common "no specific location" case) are never caught as duplicates. That let
`upsert_booking_config` silently insert a second active row instead of
updating the first one whenever a service was offered without a fixed
location — the whole point of the constraint was defeated for exactly the
scope that matters most.

Requires PostgreSQL 15+ (`UNIQUE NULLS NOT DISTINCT`); this project runs 18.4.

Preflight aborts instead of silently repairing: which duplicate to keep is a
product/data decision, not something a migration should guess.
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "0008"
down_revision: str | None = "0007"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

CONSTRAINT_NAME = "uq_booking_config_offer"
_SCOPE_COLUMNS = ("organization_id", "service_id", "therapist_profile_id", "format", "location_id")


def upgrade() -> None:
    conn = op.get_bind()
    duplicates = conn.execute(
        sa.text(
            """
            SELECT organization_id, service_id, therapist_profile_id, format, location_id,
                   array_agg(id ORDER BY created_at) AS config_ids
            FROM service_booking_configs
            GROUP BY organization_id, service_id, therapist_profile_id, format, location_id
            HAVING count(*) > 1
            """
        )
    ).fetchall()
    if duplicates:
        report = "\n".join(
            f"  organization={row.organization_id} service={row.service_id} "
            f"therapist={row.therapist_profile_id} format={row.format!r} "
            f"location={row.location_id} -> config ids {list(row.config_ids)}"
            for row in duplicates
        )
        raise RuntimeError(
            f"Aborting: {len(duplicates)} duplicate service_booking_configs scope(s) "
            "already exist under NULLS-NOT-DISTINCT semantics. Resolve these manually "
            "(decide which row to keep per scope) before re-running this migration:\n"
            f"{report}"
        )

    nulls_not_distinct = conn.scalar(
        sa.text(
            """
            SELECT i.indnullsnotdistinct
            FROM pg_constraint AS c
            JOIN pg_index AS i ON i.indexrelid = c.conindid
            WHERE c.conrelid = 'service_booking_configs'::regclass
              AND c.conname = :constraint_name
            """
        ),
        {"constraint_name": CONSTRAINT_NAME},
    )
    if nulls_not_distinct is True:
        # Recovery path: the physical 0008 constraint survived an accidental
        # alembic_version rewind to 3bb47763bb91.
        return
    if nulls_not_distinct is not None:
        op.drop_constraint(CONSTRAINT_NAME, "service_booking_configs", type_="unique")
    op.create_unique_constraint(
        CONSTRAINT_NAME,
        "service_booking_configs",
        list(_SCOPE_COLUMNS),
        postgresql_nulls_not_distinct=True,
    )


def downgrade() -> None:
    op.drop_constraint(CONSTRAINT_NAME, "service_booking_configs", type_="unique")
    op.create_unique_constraint(
        CONSTRAINT_NAME,
        "service_booking_configs",
        list(_SCOPE_COLUMNS),
    )
