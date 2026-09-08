"""Tables for the PDC auth engine (D-083, AUTH-1).

Five tables and one column. Nothing reads them yet — the engine, the routes and
the UI arrive in later steps — so this migration is additive and has no effect
on a running deployment.

Two identity kinds, kept apart on purpose:

- ``platform_credentials`` hangs off ``internal_users``. One person, one login,
  membership deciding which organizations they work in — a therapist at two
  practices still signs in once.
- ``tenant_clients`` belongs to exactly one organization. The same email at two
  tenants is two unrelated accounts, so one tenant learns nothing about another
  tenant's clients. That is a privacy property, not a schema convenience.

The boundary is enforced three times, and each layer catches what the one above
it could miss:

1. ``uq_tenant_clients_org_email`` — identity is ``(organization_id, email)``,
   never the address alone.
2. ``fk_tenant_client_credentials_client`` is **composite**
   (ADR-023 §5.2): a client id can only carry credentials belonging to the same
   organization, so a bug cannot pair them across tenants.
3. ``ck_auth_sessions_subject`` — a tenant-client session with no organization
   is not rejected at runtime, it is unwritable. That is what stops a future
   defect from producing a "global client session", which is the exact failure
   the Marysoll cookie-collision report describes.

``normalized_email`` is plain text rather than ``citext``. The column already
promises a value the application lowercased and trimmed; case-insensitive
comparison on top of that is a second, weaker guarantee — and ``CREATE
EXTENSION`` needs privileges the migration role is due to lose when ADR-023 §4
splits the database roles.

Token columns hold a SHA-256 hex digest, never the token. A dump of these tables
is not a set of usable sessions or live reset links.

``internal_users.legacy_clerk_id`` keeps the old provider subject so the cutover
is auditable while ``external_auth_id`` becomes a PDC value. It is dropped once
every account has signed in with a password of its own.

Revision ID: 9fad3f7e8e54
Revises: c4d81e37b920
Create Date: 2026-09-08 02:22:56
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "9fad3f7e8e54"
down_revision: str | Sequence[str] | None = "c4d81e37b920"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "platform_credentials",
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("normalized_email", sa.String(length=320), nullable=False),
        sa.Column("password_hash", sa.Text(), nullable=True),
        sa.Column("email_verified_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("password_changed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("failed_attempts", sa.Integer(), server_default="0", nullable=False),
        sa.Column("locked_until", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["internal_users.id"],
            name=op.f("fk_platform_credentials_user_id_internal_users"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("user_id", name=op.f("pk_platform_credentials")),
        sa.UniqueConstraint("normalized_email", name="uq_platform_credentials_email"),
    )
    op.create_table(
        "tenant_clients",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("organization_id", sa.Uuid(), nullable=False),
        sa.Column("normalized_email", sa.String(length=320), nullable=False),
        sa.Column("display_name", sa.String(length=160), nullable=True),
        sa.Column(
            "status",
            sa.Enum(
                "active",
                "invited",
                "suspended",
                name="tenantclientstatus",
                native_enum=False,
                length=32,
            ),
            server_default="active",
            nullable=False,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["organization_id"],
            ["organizations.id"],
            name=op.f("fk_tenant_clients_organization_id_organizations"),
            ondelete="RESTRICT",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_tenant_clients")),
        sa.UniqueConstraint("id", "organization_id", name="uq_tenant_clients_id_org"),
        sa.UniqueConstraint(
            "organization_id", "normalized_email", name="uq_tenant_clients_org_email"
        ),
    )
    op.create_index(
        op.f("ix_tenant_clients_organization_id"),
        "tenant_clients",
        ["organization_id"],
        unique=False,
    )
    op.create_table(
        "auth_sessions",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column(
            "kind",
            sa.Enum("platform", "tenant_client", name="sessionkind", native_enum=False, length=32),
            nullable=False,
        ),
        sa.Column("user_id", sa.Uuid(), nullable=True),
        sa.Column("client_id", sa.Uuid(), nullable=True),
        sa.Column("organization_id", sa.Uuid(), nullable=True),
        sa.Column("token_hash", sa.String(length=64), nullable=False),
        sa.Column(
            "issued_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False
        ),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("user_agent", sa.String(length=400), nullable=True),
        sa.CheckConstraint(
            "(kind = 'platform' AND user_id IS NOT NULL AND client_id IS NULL AND organization_id IS NULL) OR (kind = 'tenant_client' AND client_id IS NOT NULL AND user_id IS NULL AND organization_id IS NOT NULL)",
            name=op.f("ck_auth_sessions_subject"),
        ),
        sa.ForeignKeyConstraint(
            ["client_id"],
            ["tenant_clients.id"],
            name=op.f("fk_auth_sessions_client_id_tenant_clients"),
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["organization_id"],
            ["organizations.id"],
            name=op.f("fk_auth_sessions_organization_id_organizations"),
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["internal_users.id"],
            name=op.f("fk_auth_sessions_user_id_internal_users"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_auth_sessions")),
        sa.UniqueConstraint("token_hash", name="uq_auth_sessions_token_hash"),
    )
    op.create_table(
        "auth_tokens",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column(
            "purpose",
            sa.Enum(
                "email_verification",
                "password_reset",
                name="tokenpurpose",
                native_enum=False,
                length=32,
            ),
            nullable=False,
        ),
        sa.Column(
            "kind",
            sa.Enum("platform", "tenant_client", name="sessionkind", native_enum=False, length=32),
            nullable=False,
        ),
        sa.Column("user_id", sa.Uuid(), nullable=True),
        sa.Column("client_id", sa.Uuid(), nullable=True),
        sa.Column("organization_id", sa.Uuid(), nullable=True),
        sa.Column("token_hash", sa.String(length=64), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("consumed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.CheckConstraint(
            "(kind = 'platform' AND user_id IS NOT NULL AND client_id IS NULL AND organization_id IS NULL) OR (kind = 'tenant_client' AND client_id IS NOT NULL AND user_id IS NULL AND organization_id IS NOT NULL)",
            name=op.f("ck_auth_tokens_subject"),
        ),
        sa.ForeignKeyConstraint(
            ["client_id"],
            ["tenant_clients.id"],
            name=op.f("fk_auth_tokens_client_id_tenant_clients"),
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["organization_id"],
            ["organizations.id"],
            name=op.f("fk_auth_tokens_organization_id_organizations"),
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["internal_users.id"],
            name=op.f("fk_auth_tokens_user_id_internal_users"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_auth_tokens")),
        sa.UniqueConstraint("token_hash", name="uq_auth_tokens_token_hash"),
    )
    op.create_table(
        "tenant_client_credentials",
        sa.Column("client_id", sa.Uuid(), nullable=False),
        sa.Column("organization_id", sa.Uuid(), nullable=False),
        sa.Column("password_hash", sa.Text(), nullable=False),
        sa.Column("email_verified_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("password_changed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("failed_attempts", sa.Integer(), server_default="0", nullable=False),
        sa.Column("locked_until", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["client_id", "organization_id"],
            ["tenant_clients.id", "tenant_clients.organization_id"],
            name="fk_tenant_client_credentials_client",
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("client_id", name=op.f("pk_tenant_client_credentials")),
    )
    op.add_column(
        "internal_users", sa.Column("legacy_clerk_id", sa.String(length=191), nullable=True)
    )


def downgrade() -> None:
    op.drop_column("internal_users", "legacy_clerk_id")
    op.drop_table("tenant_client_credentials")
    op.drop_table("auth_tokens")
    op.drop_table("auth_sessions")
    op.drop_index(op.f("ix_tenant_clients_organization_id"), table_name="tenant_clients")
    op.drop_table("tenant_clients")
    op.drop_table("platform_credentials")
