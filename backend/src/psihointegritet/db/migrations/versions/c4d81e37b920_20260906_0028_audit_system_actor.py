"""Allow `system` as an audit actor kind (D-078 extension, PDC-0A).

`organization_audit_events.actor_kind` accepted only `operator` and `member`,
both of which describe a signed-in person. Organization bootstrap has no such
person, so the largest event the platform has — a tenant being created — had
nowhere to be recorded.

The alternative was an audit bypass for provisioning, or a fabricated actor
with a null user id. Both are worse: the first leaves tenant creation with no
trail, the second puts a fake human in one. `system` says plainly that a
controlled platform process acted, and `actor_user_id` is null from the start
rather than because someone was deleted.

Data-only in effect: the constraint widens, so every existing row still
satisfies it and none are rewritten.

Revision ID: c4d81e37b920
Revises: f1a7c9d2e4b6
Create Date: 2026-09-06 05:10:00
"""

from collections.abc import Sequence

from alembic import op

revision: str = "c4d81e37b920"
down_revision: str | Sequence[str] | None = "f1a7c9d2e4b6"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

_TABLE = "organization_audit_events"
#: The **declared** name, not the one PostgreSQL holds. `NAMING_CONVENTION` in
#: `db/base.py` expands `ck` to `ck_%(table_name)s_%(constraint_name)s`, and
#: Alembic applies that convention to `drop_constraint` as well as to
#: `create_check_constraint` — so passing the already-expanded
#: `ck_organization_audit_events_actor_kind_supported` gets expanded a second
#: time into a truncated name that does not exist.
_CONSTRAINT = "actor_kind_supported"


def upgrade() -> None:
    op.drop_constraint(_CONSTRAINT, _TABLE, type_="check")
    op.create_check_constraint(
        _CONSTRAINT,
        _TABLE,
        "actor_kind IN ('operator', 'member', 'system')",
    )


def downgrade() -> None:
    # Rows written by a platform process cannot satisfy the narrower constraint,
    # and silently deleting audit records to make a schema step succeed would
    # defeat the point of an append-only table. Fail loudly instead: an operator
    # who genuinely wants to go back must decide what happens to those rows.
    op.execute(
        """
        DO $$
        BEGIN
            IF EXISTS (SELECT 1 FROM organization_audit_events WHERE actor_kind = 'system') THEN
                RAISE EXCEPTION
                    'Cannot downgrade: organization_audit_events still holds system-actor rows. '
                    'Decide what happens to them before narrowing actor_kind_supported.';
            END IF;
        END $$;
        """
    )
    op.drop_constraint(_CONSTRAINT, _TABLE, type_="check")
    op.create_check_constraint(
        _CONSTRAINT,
        _TABLE,
        "actor_kind IN ('operator', 'member')",
    )
