"""20260811_0026_organization_locales

Language belongs to the organization (D-077, ADR-026), and every change to it
carries a visible author (D-078).

Two things a reviewer should check, because neither is visible to
`alembic check`:

1. **The asymmetry is deliberate.** The existing row is backfilled to `sr-Latn`
   while the `server_default` is `en`. Every *future* organization therefore
   starts at the platform default, and the only tenant that exists today keeps
   the language its users actually read. A wrong `server_default` here would be
   silent — the test that catches it inserts a bare `Organization` and asserts
   `en`.

2. **`actor_kind` is not descriptive.** It separates "the platform intervened"
   from "someone on my team changed it", which is the question the audit table
   was created to answer. Without it a superadmin correcting an organization's
   language is indistinguishable from that organization's own admin doing it.

Revision ID: e4a91c62d8f7
Revises: d1c7a4e90b52
Create Date: 2026-08-11 20:14:52.331907

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "e4a91c62d8f7"
down_revision: str | Sequence[str] | None = "d1c7a4e90b52"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

PLATFORM_DEFAULT_LOCALE = "en"
FOUNDING_TENANT_LOCALE = "sr-Latn"
SUPPORTED = "'en', 'sr-Latn'"


def upgrade() -> None:
    # 1 — add nullable, so the table is never briefly wrong.
    op.add_column("organizations", sa.Column("ui_locale", sa.String(length=16), nullable=True))
    op.add_column(
        "organizations",
        sa.Column("default_content_locale", sa.String(length=16), nullable=True),
    )

    # 2 — backfill every existing organization to Serbian. Safe as one statement:
    # the table holds a single row, and any row that exists today predates the
    # platform default and is therefore Serbian by definition.
    op.execute(
        sa.text(
            "UPDATE organizations "
            "SET ui_locale = :locale, default_content_locale = :locale "
            "WHERE ui_locale IS NULL"
        ).bindparams(locale=FOUNDING_TENANT_LOCALE)
    )

    # 3 — only now NOT NULL, and only now the platform default.
    for column in ("ui_locale", "default_content_locale"):
        op.alter_column(
            "organizations",
            column,
            existing_type=sa.String(length=16),
            nullable=False,
            server_default=PLATFORM_DEFAULT_LOCALE,
        )

    # 4 — fail closed on an unsupported locale.
    op.create_check_constraint(
        "ui_locale_supported",
        "organizations",
        f"ui_locale IN ({SUPPORTED})",
    )
    op.create_check_constraint(
        "default_content_locale_supported",
        "organizations",
        f"default_content_locale IN ({SUPPORTED})",
    )

    op.create_table(
        "organization_audit_events",
        sa.Column("id", sa.Uuid(as_uuid=True), nullable=False),
        sa.Column("organization_id", sa.Uuid(as_uuid=True), nullable=False),
        sa.Column("actor_user_id", sa.Uuid(as_uuid=True), nullable=True),
        sa.Column("actor_kind", sa.String(length=16), nullable=False),
        sa.Column("event_type", sa.String(length=80), nullable=False),
        sa.Column("details", sa.JSON(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id", name="pk_organization_audit_events"),
        sa.ForeignKeyConstraint(
            ["organization_id"],
            ["organizations.id"],
            name="fk_organization_audit_events_organization_id_organizations",
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["actor_user_id"],
            ["internal_users.id"],
            name="fk_organization_audit_events_actor_user_id_internal_users",
            ondelete="SET NULL",
        ),
        sa.CheckConstraint(
            "actor_kind IN ('operator', 'member')",
            name="actor_kind_supported",
        ),
    )
    op.create_index(
        "ix_organization_audit_events_organization_id",
        "organization_audit_events",
        ["organization_id"],
    )


def downgrade() -> None:
    op.drop_index(
        "ix_organization_audit_events_organization_id",
        table_name="organization_audit_events",
    )
    op.drop_table("organization_audit_events")
    # Bare names on the way out too: the convention in `db/base.py` expands
    # them exactly as it did on the way in. Passing the already-resolved name
    # gets it expanded a second time and truncated, and Postgres is asked to
    # drop a constraint that never existed under that name.
    op.drop_constraint("default_content_locale_supported", "organizations", type_="check")
    op.drop_constraint("ui_locale_supported", "organizations", type_="check")
    op.drop_column("organizations", "default_content_locale")
    op.drop_column("organizations", "ui_locale")
