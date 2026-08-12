"""Persistence for the small Kompas flow lifecycle (D-058 / ADR-025)."""

from datetime import datetime
from uuid import UUID, uuid4

from sqlalchemy import (
    JSON,
    DateTime,
    ForeignKey,
    ForeignKeyConstraint,
    Index,
    Integer,
    String,
    UniqueConstraint,
    Uuid,
    func,
    text,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from psihointegritet.db.base import Base
from psihointegritet.modules.content.models import ReviewOutcome
from psihointegritet.shared.domain.publication import ApprovalCapability, RevisionStatus
from psihointegritet.shared.types.sa_enum import value_enum


class CompassFlow(Base):
    __tablename__ = "compass_flows"
    __table_args__ = (
        UniqueConstraint("organization_id", "stable_id", name="uq_compass_flow_identity"),
        UniqueConstraint("id", "organization_id", name="uq_compass_flow_id_organization"),
    )

    id: Mapped[UUID] = mapped_column(Uuid, primary_key=True, default=uuid4)
    organization_id: Mapped[UUID] = mapped_column(
        Uuid, ForeignKey("organizations.id", ondelete="CASCADE"), index=True
    )
    stable_id: Mapped[str] = mapped_column(String(80))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )


class CompassFlowVersion(Base):
    __tablename__ = "compass_flow_versions"
    __table_args__ = (
        UniqueConstraint("flow_id", "version", "locale", name="uq_compass_flow_version"),
        UniqueConstraint("id", "organization_id", name="uq_compass_flow_version_id_organization"),
        ForeignKeyConstraint(
            ["flow_id", "organization_id"],
            ["compass_flows.id", "compass_flows.organization_id"],
            ondelete="CASCADE",
        ),
        Index(
            "uq_compass_flow_published",
            "flow_id",
            "locale",
            unique=True,
            postgresql_where=text("status = 'published'"),
        ),
    )

    id: Mapped[UUID] = mapped_column(Uuid, primary_key=True, default=uuid4)
    flow_id: Mapped[UUID] = mapped_column(Uuid, index=True)
    organization_id: Mapped[UUID] = mapped_column(
        Uuid, ForeignKey("organizations.id", ondelete="CASCADE"), index=True
    )
    version: Mapped[int] = mapped_column(Integer)
    locale: Mapped[str] = mapped_column(String(16), default="sr-Latn", server_default="sr-Latn")
    definition: Mapped[dict[str, object]] = mapped_column(
        JSONB().with_variant(JSON(), "sqlite"), nullable=False
    )
    status: Mapped[RevisionStatus] = mapped_column(
        value_enum(RevisionStatus, length=32),
        default=RevisionStatus.DRAFT,
        server_default=RevisionStatus.DRAFT.value,
        index=True,
    )
    lock_version: Mapped[int] = mapped_column(Integer, default=1, server_default="1")
    created_by_user_id: Mapped[UUID | None] = mapped_column(
        Uuid, ForeignKey("internal_users.id", ondelete="SET NULL")
    )
    updated_by_user_id: Mapped[UUID | None] = mapped_column(
        Uuid, ForeignKey("internal_users.id", ondelete="SET NULL")
    )
    published_by_user_id: Mapped[UUID | None] = mapped_column(
        Uuid, ForeignKey("internal_users.id", ondelete="SET NULL")
    )
    archived_by_user_id: Mapped[UUID | None] = mapped_column(
        Uuid, ForeignKey("internal_users.id", ondelete="SET NULL")
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )
    published_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    archived_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    __mapper_args__ = {"version_id_col": lock_version}  # noqa: RUF012


class CompassFlowReviewDecision(Base):
    __tablename__ = "compass_flow_review_decisions"
    __table_args__ = (
        UniqueConstraint("flow_version_id", "capability", name="uq_compass_flow_review_capability"),
        ForeignKeyConstraint(
            ["flow_version_id", "organization_id"],
            ["compass_flow_versions.id", "compass_flow_versions.organization_id"],
            ondelete="CASCADE",
        ),
    )

    id: Mapped[UUID] = mapped_column(Uuid, primary_key=True, default=uuid4)
    flow_version_id: Mapped[UUID] = mapped_column(Uuid, index=True)
    organization_id: Mapped[UUID] = mapped_column(
        Uuid, ForeignKey("organizations.id", ondelete="CASCADE"), index=True
    )
    capability: Mapped[ApprovalCapability] = mapped_column(
        value_enum(ApprovalCapability, length=32)
    )
    outcome: Mapped[ReviewOutcome] = mapped_column(value_enum(ReviewOutcome, length=32))
    decided_by_user_id: Mapped[UUID | None] = mapped_column(
        Uuid, ForeignKey("internal_users.id", ondelete="SET NULL")
    )
    note: Mapped[str | None] = mapped_column(String(500))
    decided_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
