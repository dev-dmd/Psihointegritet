from datetime import datetime
from uuid import UUID, uuid4

from sqlalchemy import DateTime, String, UniqueConstraint, Uuid, func
from sqlalchemy.orm import Mapped, mapped_column

from psihointegritet.db.base import Base


class Organization(Base):
    """Tenant boundary used by every operational Intake record."""

    __tablename__ = "organizations"

    # Uniqueness is an explicit named constraint, not `unique=True` on the column.
    # Migration 0001 created a UNIQUE constraint plus a separate non-unique index;
    # `unique=True` would instead describe a single unique index, which is what made
    # `alembic check` report drift (D19). The declaration follows the database.
    __table_args__ = (UniqueConstraint("slug", name="uq_organizations_slug"),)

    id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid4)
    slug: Mapped[str] = mapped_column(String(80), index=True)
    display_name: Mapped[str] = mapped_column(String(160))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
