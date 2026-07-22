from datetime import datetime
from enum import StrEnum
from uuid import UUID, uuid4

from sqlalchemy import Boolean, DateTime, Enum, ForeignKey, String, UniqueConstraint, Uuid, func
from sqlalchemy.orm import Mapped, mapped_column

from psihointegritet.db.base import Base


class MembershipRole(StrEnum):
    ORG_ADMIN = "org_admin"
    THERAPIST = "therapist"


class MembershipStatus(StrEnum):
    ACTIVE = "active"
    DISABLED = "disabled"


class InternalUser(Base):
    """Provider-neutral authenticated subject. Domain data never lives in Clerk."""

    __tablename__ = "internal_users"

    id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid4)
    external_auth_id: Mapped[str] = mapped_column(String(191), unique=True, index=True)
    email: Mapped[str | None] = mapped_column(String(320), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, server_default="true")
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
        Enum(MembershipRole, native_enum=False, length=32), nullable=False
    )
    status: Mapped[MembershipStatus] = mapped_column(
        Enum(MembershipStatus, native_enum=False, length=32),
        default=MembershipStatus.ACTIVE,
        server_default=MembershipStatus.ACTIVE.value,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
