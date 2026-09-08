"""Credentials, tenant clients and sessions for the PDC auth engine (D-083).

Two identity kinds live here, and keeping them apart is the point.

``PlatformCredential`` hangs off ``internal_users``: one person, one platform
account, membership deciding which organizations they work in. That row is
global because a therapist can work at two practices with one login.

``TenantClient`` is the opposite. A client belongs to **one** organization, and
the same email address at two tenants is two unrelated accounts with separate
passwords, verification, sessions and history. Sanja gets no signal that a
client of hers also books with Psihointegritet — which is a privacy property,
not an implementation detail.

The boundary is enforced three times over, deliberately:

1. ``UNIQUE (organization_id, normalized_email)`` — identity is the pair, never
   the email alone.
2. ``FOREIGN KEY (client_id, organization_id)`` on credentials — a composite FK
   (ADR-023 §5.2), so one tenant's client id can never acquire another
   tenant's credentials even through a bug.
3. ``ck_auth_sessions_subject`` — a tenant-client session without an
   organization is not merely rejected by the application, it is unwritable.
"""

from datetime import datetime
from enum import StrEnum
from uuid import UUID, uuid4

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    ForeignKey,
    ForeignKeyConstraint,
    Integer,
    String,
    Text,
    UniqueConstraint,
    Uuid,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column

from psihointegritet.db.base import Base

#: Imported for their mapped columns rather than by table name: referencing
#: `InternalUser.id` makes the dependency real, so these tables cannot be loaded
#: into a metadata registry that does not also hold the ones they point at.
#: Resolving a string FK against an unregistered table fails only at first use,
#: which is a confusing place to learn about an import you forgot.
from psihointegritet.modules.identity.models import InternalUser
from psihointegritet.modules.organizations.models import Organization
from psihointegritet.shared.types.sa_enum import value_enum

#: RFC 5321 caps an address at 320 characters; the same length the existing
#: `internal_users.email` column uses.
EMAIL_LENGTH = 320


class SessionKind(StrEnum):
    """Which surface a session belongs to.

    Explicit rather than derived. Marysoll shipped one cookie namespace shared
    by clients and tenant admins and documented the collision that followed; a
    guard has to be able to say which kind it accepts, and it cannot say that
    about a session that never declared one.
    """

    PLATFORM = "platform"
    TENANT_CLIENT = "tenant_client"


class TokenPurpose(StrEnum):
    """What a one-time token is for. Not a secret — the token itself is."""

    EMAIL_VERIFICATION = "email_verification"
    PASSWORD_RESET = "password_reset"  # noqa: S105 - a purpose label, not a credential


class TenantClientStatus(StrEnum):
    ACTIVE = "active"
    INVITED = "invited"
    SUSPENDED = "suspended"


class PlatformCredential(Base):
    """How a platform account signs in. One row per `internal_users` row.

    Split from `internal_users` rather than added to it, because the two answer
    different questions: `internal_users` is *who exists and what they may do*,
    read on nearly every request, while this is *what they typed*, read only
    while signing in. A password hash has no business travelling with an
    identity lookup.
    """

    __tablename__ = "platform_credentials"

    user_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey(InternalUser.id, ondelete="CASCADE"),
        primary_key=True,
    )
    #: Lowercased and trimmed by the application before it arrives. Plain text
    #: rather than `citext`: the column already promises a normalized value, so
    #: case-insensitive comparison would be a second, weaker guarantee laid over
    #: the first — and `CREATE EXTENSION` needs privileges the migration role is
    #: due to lose in the RLS work (ADR-023 §4).
    normalized_email: Mapped[str] = mapped_column(String(EMAIL_LENGTH), nullable=False)
    #: `NULL` means "account exists, password not set yet" — the state every
    #: migrated Clerk account starts in. Sign-in refuses it with the same
    #: generic message as a wrong password, so nothing is disclosed.
    password_hash: Mapped[str | None] = mapped_column(Text, nullable=True)
    email_verified_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    password_changed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    failed_attempts: Mapped[int] = mapped_column(
        Integer, nullable=False, default=0, server_default="0"
    )
    locked_until: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    __table_args__ = (UniqueConstraint("normalized_email", name="uq_platform_credentials_email"),)


class TenantClient(Base):
    """A client of one organization. Never a person on the platform.

    `ORGANIZATION_SCOPED` for RLS (ADR-023 §3), and carries the composite
    `UNIQUE (id, organization_id)` its credentials reference — the pattern §5.2
    requires so a child cannot belong to a different organization than its
    parent.
    """

    __tablename__ = "tenant_clients"

    id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid4)
    organization_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey(Organization.id, ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    normalized_email: Mapped[str] = mapped_column(String(EMAIL_LENGTH), nullable=False)
    display_name: Mapped[str | None] = mapped_column(String(160), nullable=True)
    status: Mapped[TenantClientStatus] = mapped_column(
        value_enum(TenantClientStatus, length=32),
        nullable=False,
        default=TenantClientStatus.ACTIVE,
        server_default=TenantClientStatus.ACTIVE.value,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    __table_args__ = (
        #: The identity of a client is the pair, not the address. This is the
        #: constraint that makes `ana@example.com` at two tenants two accounts.
        UniqueConstraint("organization_id", "normalized_email", name="uq_tenant_clients_org_email"),
        #: Referenced by `tenant_client_credentials`; see the class below.
        UniqueConstraint("id", "organization_id", name="uq_tenant_clients_id_org"),
    )


class TenantClientCredential(Base):
    """How a tenant's client signs in, tied to that tenant by the key itself."""

    __tablename__ = "tenant_client_credentials"

    client_id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True)
    #: Denormalized so the FK below can be composite. Redundant with the parent
    #: row by design: it is what turns "belongs to the right tenant" from an
    #: application rule into a database one.
    organization_id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), nullable=False)
    password_hash: Mapped[str] = mapped_column(Text, nullable=False)
    email_verified_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    password_changed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    failed_attempts: Mapped[int] = mapped_column(
        Integer, nullable=False, default=0, server_default="0"
    )
    locked_until: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    __table_args__ = (
        ForeignKeyConstraint(
            ["client_id", "organization_id"],
            ["tenant_clients.id", "tenant_clients.organization_id"],
            name="fk_tenant_client_credentials_client",
            ondelete="CASCADE",
        ),
    )


class AuthSession(Base):
    """An issued session. Opaque token in the cookie, hash in the row.

    The token itself is never stored: a database dump is not a set of live
    sessions. Lookup hashes the presented value and matches on that.
    """

    __tablename__ = "auth_sessions"

    id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid4)
    kind: Mapped[SessionKind] = mapped_column(value_enum(SessionKind, length=32), nullable=False)
    user_id: Mapped[UUID | None] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey(InternalUser.id, ondelete="CASCADE"),
        nullable=True,
    )
    client_id: Mapped[UUID | None] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("tenant_clients.id", ondelete="CASCADE"),
        nullable=True,
    )
    #: Required for a tenant-client session, forbidden for a platform one — see
    #: the check constraint. This is the field the request-scoped tenant context
    #: reads, which is what lets `TENANT_CONTEXT_SIGNING_KEY` disappear from the
    #: consolidation plan: the tenant is no longer a claim to verify but a
    #: property of a session the server issued.
    organization_id: Mapped[UUID | None] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey(Organization.id, ondelete="CASCADE"),
        nullable=True,
    )
    token_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    issued_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    user_agent: Mapped[str | None] = mapped_column(String(400), nullable=True)

    __table_args__ = (
        UniqueConstraint("token_hash", name="uq_auth_sessions_token_hash"),
        #: A session that cannot say whose it is must not exist. Without this a
        #: later bug could write a tenant-client session with a null
        #: organization, and every tenant check downstream would then be reading
        #: a global client session — the exact shape of the Marysoll collision.
        CheckConstraint(
            "(kind = 'platform' AND user_id IS NOT NULL"
            " AND client_id IS NULL AND organization_id IS NULL)"
            " OR (kind = 'tenant_client' AND client_id IS NOT NULL"
            " AND user_id IS NULL AND organization_id IS NOT NULL)",
            name="subject",
        ),
    )


class AuthToken(Base):
    """Single-use, expiring tokens for email verification and password reset.

    Stored as a hash for the same reason sessions are: whoever reads the table
    must not be able to use what they find. `consumed_at` is what makes a token
    single-use — a reset link that works twice is a reset link an attacker can
    replay out of a mailbox.
    """

    __tablename__ = "auth_tokens"

    id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid4)
    purpose: Mapped[TokenPurpose] = mapped_column(
        value_enum(TokenPurpose, length=32), nullable=False
    )
    kind: Mapped[SessionKind] = mapped_column(value_enum(SessionKind, length=32), nullable=False)
    user_id: Mapped[UUID | None] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey(InternalUser.id, ondelete="CASCADE"),
        nullable=True,
    )
    client_id: Mapped[UUID | None] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("tenant_clients.id", ondelete="CASCADE"),
        nullable=True,
    )
    organization_id: Mapped[UUID | None] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey(Organization.id, ondelete="CASCADE"),
        nullable=True,
    )
    token_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    consumed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    __table_args__ = (
        UniqueConstraint("token_hash", name="uq_auth_tokens_token_hash"),
        CheckConstraint(
            "(kind = 'platform' AND user_id IS NOT NULL"
            " AND client_id IS NULL AND organization_id IS NULL)"
            " OR (kind = 'tenant_client' AND client_id IS NOT NULL"
            " AND user_id IS NULL AND organization_id IS NOT NULL)",
            name="subject",
        ),
    )
