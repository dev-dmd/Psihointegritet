"""Add `internal_users.is_superadmin` — the platform operator flag (D-051).

A **new** revision, never an edit to `20260729_0005`: `railway.json`'s
`preDeployCommand: "alembic upgrade head"` means 0005 is already applied on
every deployed Railway environment (it shipped with commit `fa4589c`), so
editing it in place would leave those environments permanently inconsistent
with the migration history.

Why a column and not a Clerk metadata claim: rules §10.3 — "do not make
long-lived domain authorization depend on editable Clerk metadata". The
frontend reads `isSuperadmin` from Clerk `publicMetadata` today, which D-026
records as a conscious, temporary deviation; the backend does not inherit
that deviation. Granting backend superadmin is an explicit
`provision_staff.py --superadmin` step against PostgreSQL, which is also
what makes it auditable.

Additive and safe to run against live data: every existing row defaults to
`false`, so nobody gains access from the migration itself.

Revision ID: 20260730_0006
Revises: 20260729_0005
Create Date: 2026-07-30
"""

import sqlalchemy as sa
from alembic import op

revision: str = "20260730_0006"
down_revision: str | None = "20260729_0005"
branch_labels: str | None = None
depends_on: str | None = None


def upgrade() -> None:
    op.add_column(
        "internal_users",
        sa.Column(
            "is_superadmin",
            sa.Boolean(),
            nullable=False,
            server_default=sa.false(),
        ),
    )


def downgrade() -> None:
    op.drop_column("internal_users", "is_superadmin")
