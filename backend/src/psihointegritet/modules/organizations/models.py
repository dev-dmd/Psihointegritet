from datetime import datetime
from uuid import UUID, uuid4

from sqlalchemy import (
    JSON,
    CheckConstraint,
    DateTime,
    ForeignKey,
    String,
    UniqueConstraint,
    Uuid,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column

from psihointegritet.core.locales import PLATFORM_DEFAULT_LOCALE, SUPPORTED_UI_LOCALES
from psihointegritet.db.base import Base

_LOCALE_IN = ", ".join(f"'{locale}'" for locale in SUPPORTED_UI_LOCALES)


class Organization(Base):
    """Tenant boundary used by every operational Intake record."""

    __tablename__ = "organizations"

    # Uniqueness is an explicit named constraint, not `unique=True` on the column.
    # Migration 0001 created a UNIQUE constraint plus a separate non-unique index;
    # `unique=True` would instead describe a single unique index, which is what made
    # `alembic check` report drift (D19). The declaration follows the database.
    __table_args__ = (
        UniqueConstraint("slug", name="uq_organizations_slug"),
        # Fail closed: an unsupported locale is refused by the database, not
        # merely by the API. Adding a third locale is therefore a deliberate
        # migration rather than a stray UPDATE — the same posture as
        # `ck_taxonomy_terms_taxonomy_term_scope`.
        CheckConstraint(f"ui_locale IN ({_LOCALE_IN})", name="ui_locale_supported"),
        CheckConstraint(
            f"default_content_locale IN ({_LOCALE_IN})",
            name="default_content_locale_supported",
        ),
    )

    id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid4)
    slug: Mapped[str] = mapped_column(String(80), index=True)
    display_name: Mapped[str] = mapped_column(String(160))
    #: Language of the system UI, validations, statuses and system email.
    #: `server_default` is the **platform** default (`en`), while the founding
    #: organization is backfilled to `sr-Latn` by migration — the asymmetry is
    #: deliberate (D-077) and invisible to `alembic check`, so a test asserts it.
    ui_locale: Mapped[str] = mapped_column(
        String(16), nullable=False, server_default=PLATFORM_DEFAULT_LOCALE
    )
    #: Locale stamped on newly created tenant-authored content. It never chooses
    #: the render locale; public and authenticated surfaces both use `ui_locale`.
    default_content_locale: Mapped[str] = mapped_column(
        String(16), nullable=False, server_default=PLATFORM_DEFAULT_LOCALE
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )


class OrganizationAuditEvent(Base):
    """Who changed what about an organization, and in which capacity (D-078).

    The first table of the central audit recorder, not a fifth one-off. Content
    already has its own chain (`content_publication_events` and two siblings);
    settings had none, which is why an organization admin could see their
    language change with no trace of who did it.

    Shaped after `intake_audit_events` — the only existing table with an
    organization, a typed event and a free JSON payload — with two deliberate
    differences: no Intake foreign key, and `details` is a column actually named
    `details` rather than SQLAlchemy's reserved-word workaround `metadata`.

    `actor_kind` is load-bearing rather than descriptive. It is the only thing
    in the record that separates "the platform intervened" from "someone on my
    team changed it", and that distinction is the reason the table exists.
    """

    __tablename__ = "organization_audit_events"

    __table_args__ = (
        CheckConstraint("actor_kind IN ('operator', 'member')", name="actor_kind_supported"),
    )

    id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid4)
    organization_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), index=True
    )
    #: Null only when the actor's user row is later deleted; never null on write.
    actor_user_id: Mapped[UUID | None] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("internal_users.id", ondelete="SET NULL"), nullable=True
    )
    #: `operator` — a platform superadmin acting from outside the organization.
    #: `member` — someone who belongs to it.
    actor_kind: Mapped[str] = mapped_column(String(16))
    event_type: Mapped[str] = mapped_column(String(80))
    #: Old and new values, plus a reason where the contract requires one. Never
    #: clinical data, never free client text.
    details: Mapped[dict[str, object]] = mapped_column(JSON)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
