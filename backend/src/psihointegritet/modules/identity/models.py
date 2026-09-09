from datetime import datetime
from enum import StrEnum
from uuid import UUID, uuid4

from sqlalchemy import (
    Boolean,
    DateTime,
    ForeignKey,
    Index,
    String,
    UniqueConstraint,
    Uuid,
    func,
    text,
)
from sqlalchemy.orm import Mapped, mapped_column

from psihointegritet.db.base import Base
from psihointegritet.shared.types.sa_enum import value_enum


class MembershipRole(StrEnum):
    ORG_ADMIN = "org_admin"
    THERAPIST = "therapist"


class MembershipStatus(StrEnum):
    ACTIVE = "active"
    DISABLED = "disabled"


class InternalUser(Base):
    """Provider-neutral authenticated subject. Domain data never lives in Clerk."""

    __tablename__ = "internal_users"

    # Named UNIQUE constraint plus a plain index, exactly as migration 0001 built it.
    # `unique=True` on the column would describe one unique index instead, which is
    # the drift `alembic check` reported as D19.
    __table_args__ = (
        UniqueConstraint("external_auth_id", name="uq_internal_users_external_auth_id"),
        # One address, one identity — enforced by PostgreSQL rather than by a
        # read-then-write in `register`, which is the race `/api/v1/me` already
        # lost in production once.
        #
        # Without it, `platform_credentials.normalized_email` was the only guard,
        # and it does not cover the state every provisioned person passes through:
        # an operator creates the row with an address and no credential, and until
        # the activation link is spent that address is unclaimed. Open registration
        # would hand it to whoever asked first, with a duplicate `internal_users`
        # row, and the real owner's activation would then fail on the credential
        # constraint with no self-service way out.
        #
        # Functional on `lower(email)` because two rows differing only in case are
        # the same mailbox, and partial because `NULL` means "no address yet" —
        # Clerk left several such rows and they are not each other's duplicates.
        # `text()` rather than the mapped attribute: `__table_args__` is
        # evaluated before the columns below exist as class attributes.
        Index(
            "uq_internal_users_email",
            text("lower(email)"),
            unique=True,
            postgresql_where=text("email IS NOT NULL"),
        ),
    )

    id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid4)
    external_auth_id: Mapped[str] = mapped_column(String(191), index=True)
    #: The Clerk subject this row was provisioned with, kept only so the
    #: migration off Clerk (D-083) is auditable — `external_auth_id` becomes a
    #: PDC-issued value and the old one would otherwise vanish silently.
    #: Dropped once every account has signed in with a password of its own.
    legacy_clerk_id: Mapped[str | None] = mapped_column(String(191), nullable=True)
    email: Mapped[str | None] = mapped_column(String(320), nullable=True)
    display_name: Mapped[str | None] = mapped_column(String(160), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, server_default="true")
    # Platform-wide operator flag (D-051), NOT a membership role: it lives on
    # the user, not on `organization_memberships`, because it is global and
    # tenant-independent — exactly the shape `frontend/src/lib/auth/identity.ts`
    # already documents as the backend baseline ("plus a global is_superadmin").
    #
    # Deliberately a PostgreSQL column rather than a Clerk metadata claim:
    # rules §10.3 forbids long-lived domain authorization that depends on
    # editable provider metadata. Setting it is an explicit, auditable
    # `provision_staff.py --superadmin` step, never an automatic consequence
    # of a Clerk dashboard edit.
    is_superadmin: Mapped[bool] = mapped_column(
        Boolean, default=False, server_default="false", nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )


class OrganizationMembership(Base):
    """One role per row keeps authorization queries explicit and auditable."""

    __tablename__ = "organization_memberships"
    __table_args__ = (
        UniqueConstraint("organization_id", "user_id", "role", name="uq_membership_role"),
    )

    id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid4)
    organization_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), index=True
    )
    user_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("internal_users.id", ondelete="CASCADE"), index=True
    )
    role: Mapped[MembershipRole] = mapped_column(
        value_enum(MembershipRole, length=32), nullable=False
    )
    status: Mapped[MembershipStatus] = mapped_column(
        value_enum(MembershipStatus, length=32),
        default=MembershipStatus.ACTIVE,
        server_default=MembershipStatus.ACTIVE.value,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
