"""CMS Core persistence for the six governed content types (ADR-016, CG-B1).

Scope boundary: this module stores, reviews and publishes the content types
R1.4.i already governs. Articles, the resource library, media, scheduled
publishing and AI assistance stay R3 — no placeholder columns for them here.

Structural choices worth stating once, because they differ from the sibling
`modules/privacy` registry in two places:

- **Approvals are rows, not JSON.** `LegalDocumentRevision.approvals` is a JSON
  list because the legal registry had no reviewer identities yet.
  `ContentReviewDecision` is a real table so a decision carries who made it and
  when — the evidence D-033 says R3 attaches to accounts and audit.
- **Locale belongs to the entry.** A Serbian page and its future English
  counterpart are separate public records with separate slugs and separate
  review chains, so locale is part of the entry identity rather than a
  revision attribute. That keeps "one published revision per entry" a single
  partial index instead of one per locale. Localization itself remains R3; no
  translation-group column is added before that contract exists.

Tenant scoping follows the privacy precedent: `organization_id` sits on the
aggregate root (`ContentEntry`) and revisions are scoped through it, so a
revision can never disagree with its entry about which tenant owns it.
"""

from datetime import datetime
from enum import StrEnum
from uuid import UUID, uuid4

from sqlalchemy import (
    JSON,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
    Uuid,
    func,
    text,
)
from sqlalchemy.orm import Mapped, mapped_column

from psihointegritet.db.base import Base
from psihointegritet.shared.domain.publication import ApprovalCapability, RevisionStatus
from psihointegritet.shared.types.sa_enum import value_enum

__all__ = [
    "ApprovalCapability",
    "ContentEntry",
    "ContentPublicationEvent",
    "ContentReviewDecision",
    "ContentTemplate",
    "ContentType",
    "ReviewOutcome",
    "RevisionStatus",
]


class ContentType(StrEnum):
    """The six governed types from R1.4.i `ContentType`.

    `article` is deliberately absent: the knowledge library is R3 (ADR-016).
    """

    STATIC_PAGE = "static_page"
    SERVICE = "service"
    THERAPIST = "therapist"
    PROGRAM = "program"
    COMPANY_PLAN = "company_plan"
    PACKAGE_OFFER = "package_offer"


class ContentTemplate(StrEnum):
    """Allowed templates, mirroring the frontend `ContentTemplate` registry.

    The registry decides which slots a template requires; the editor may fill
    slots but never invent a section type (CONTENT_MODEL_MATRIX §4).
    """

    SERVICE_DETAIL = "service_detail"
    THERAPIST_PROFILE = "therapist_profile"
    SUPPORT_AREA = "support_area"
    AUDIENCE_PAGE = "audience_page"
    PROGRAM_DETAIL = "program_detail"
    COMPANY_PAGE = "company_page"
    PRICING_PAGE = "pricing_page"
    STATIC_INFORMATION = "static_information"
    LEGAL_PAGE = "legal_page"


class ReviewOutcome(StrEnum):
    """A recorded review decision.

    `pending` from the frontend `ApprovalStatus` has no row: a capability is
    pending precisely when no decision exists for that revision.
    """

    APPROVED = "approved"
    REJECTED = "rejected"


class ContentEntry(Base):
    """Stable identity of one localized content record inside one tenant."""

    __tablename__ = "content_entries"
    __table_args__ = (
        # A slug is unique per tenant, type and locale. Two types may share a
        # slug because they render under different public route prefixes
        # (/usluge/<slug> vs /tim/<slug>).
        UniqueConstraint(
            "organization_id",
            "content_type",
            "locale",
            "slug",
            name="uq_content_entry_slug",
        ),
    )

    id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid4)
    organization_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), index=True
    )
    content_type: Mapped[ContentType] = mapped_column(
        value_enum(ContentType, length=32), nullable=False
    )
    slug: Mapped[str] = mapped_column(String(160))
    locale: Mapped[str] = mapped_column(String(16), default="sr-Latn", server_default="sr-Latn")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )


class ContentRevision(Base):
    """One editable version of an entry; immutable once published.

    Its primary key is the `revisionId` the panel and the approval evidence
    refer to (CONTENT_MODEL_MATRIX §8). Editing after approval never mutates
    this row — `approved -> draft` and `archived -> draft` create a new
    revision instead (contract A.2).
    """

    __tablename__ = "content_revisions"
    __table_args__ = (
        UniqueConstraint("entry_id", "version_label", name="uq_content_revision_version"),
        # At most one published revision per entry. PostgreSQL is the
        # authority here; application checks alone would race.
        Index(
            "uq_content_revision_published",
            "entry_id",
            unique=True,
            postgresql_where=text("status = 'published'"),
        ),
    )

    id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid4)
    entry_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("content_entries.id", ondelete="CASCADE"), index=True
    )
    version_label: Mapped[str] = mapped_column(String(80))
    template: Mapped[ContentTemplate] = mapped_column(
        value_enum(ContentTemplate, length=48), nullable=False
    )
    # Content per template slot: {"<slotName>": <value>}. The template registry
    # constrains which slots may appear; the column stays generic so adding a
    # slot needs no migration.
    slot_data: Mapped[dict[str, object]] = mapped_column(
        JSON, default=dict, server_default="{}", nullable=False
    )
    status: Mapped[RevisionStatus] = mapped_column(
        value_enum(RevisionStatus, length=32),
        default=RevisionStatus.DRAFT,
        server_default=RevisionStatus.DRAFT.value,
        index=True,
    )
    # Which rule versions applied at the last check, so an approval can later
    # be traced to the ruleset it was granted under (D-044).
    validation_snapshot: Mapped[dict[str, object]] = mapped_column(
        JSON, default=dict, server_default="{}", nullable=False
    )
    # Optimistic locking guard consumed by the CG-B3 use case; the column
    # belongs to the row, so it ships with the model rather than in a second
    # migration.
    lock_version: Mapped[int] = mapped_column(
        Integer, default=1, server_default="1", nullable=False
    )
    created_by_user_id: Mapped[UUID | None] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("internal_users.id", ondelete="SET NULL"), nullable=True
    )
    updated_by_user_id: Mapped[UUID | None] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("internal_users.id", ondelete="SET NULL"), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )
    published_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    archived_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class ContentReviewDecision(Base):
    """One capability's decision on one revision.

    Bound to `revision_id`, never to the entry: a reissued revision starts
    with no decisions, which is how contract A.2 stops approvals from
    surviving an edit. Superseded decisions are not kept here — the change is
    recorded as a `ContentPublicationEvent`.
    """

    __tablename__ = "content_review_decisions"
    __table_args__ = (
        UniqueConstraint("revision_id", "capability", name="uq_content_review_capability"),
    )

    id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid4)
    revision_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("content_revisions.id", ondelete="CASCADE"), index=True
    )
    capability: Mapped[ApprovalCapability] = mapped_column(
        value_enum(ApprovalCapability, length=32), nullable=False
    )
    outcome: Mapped[ReviewOutcome] = mapped_column(
        value_enum(ReviewOutcome, length=32), nullable=False
    )
    decided_by_user_id: Mapped[UUID | None] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("internal_users.id", ondelete="SET NULL"), nullable=True
    )
    decided_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    note: Mapped[str | None] = mapped_column(String(500), nullable=True)


class ContentPublicationEvent(Base):
    """Append-only audit of status changes and review decisions.

    Publishing changes what the public site serves, so the evidence is durable
    from day one rather than the in-memory activity feed used by the D-026
    Feature Gates preview. Payload carries identifiers and reasons only — never
    content bodies or personal data.
    """

    __tablename__ = "content_publication_events"

    id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid4)
    revision_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("content_revisions.id", ondelete="CASCADE"), index=True
    )
    from_status: Mapped[RevisionStatus | None] = mapped_column(
        value_enum(RevisionStatus, length=32), nullable=True
    )
    to_status: Mapped[RevisionStatus] = mapped_column(
        value_enum(RevisionStatus, length=32), nullable=False
    )
    actor_user_id: Mapped[UUID | None] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("internal_users.id", ondelete="SET NULL"), nullable=True
    )
    reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
