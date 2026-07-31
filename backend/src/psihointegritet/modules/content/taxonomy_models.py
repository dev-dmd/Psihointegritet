"""Canonical Kompas taxonomy persistence (D-053 / ADR-022).

Stable terms and revisioned public copy are deliberately separate. Managed
terms belong to one organization; system terms have no organization and may
only receive a tenant-scoped label override. Content metadata is a later K3
slice, so this module owns only the registry, governance evidence, the
topic-to-Intake bridge and the D-052 profile reference table.
"""

from datetime import datetime
from enum import StrEnum
from uuid import UUID, uuid4

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    Uuid,
    func,
    text,
)
from sqlalchemy.orm import Mapped, mapped_column

from psihointegritet.db.base import Base
from psihointegritet.modules.content.models import ReviewOutcome
from psihointegritet.shared.domain.publication import ApprovalCapability, RevisionStatus
from psihointegritet.shared.types.sa_enum import value_enum


class TaxonomyAxis(StrEnum):
    TOPIC_GROUP = "topic_group"
    TOPIC = "topic"
    AUDIENCE = "audience"
    CONTENT_GOAL = "content_goal"
    SUPPORT_AREA = "support_area"
    JOURNEY_INTENT = "journey_intent"
    CONTENT_FORMAT = "content_format"
    ACCESS_LEVEL = "access_level"


MANAGED_TAXONOMY_AXES = frozenset(
    {
        TaxonomyAxis.TOPIC_GROUP,
        TaxonomyAxis.TOPIC,
        TaxonomyAxis.AUDIENCE,
        TaxonomyAxis.CONTENT_GOAL,
    }
)
SYSTEM_TAXONOMY_AXES = frozenset(set(TaxonomyAxis) - MANAGED_TAXONOMY_AXES)


class TaxonomyRelationKind(StrEnum):
    RELATED_TOPIC = "related_topic"
    REPLACEMENT = "replacement"


class JourneyIntent(StrEnum):
    EXPLORE = "explore"
    PROFESSIONAL_SUPPORT = "professional_support"
    BOTH = "both"


class ContentFormat(StrEnum):
    ARTICLE = "article"
    PDF = "pdf"
    VIDEO = "video"
    AUDIO = "audio"
    WORKSHEET = "worksheet"
    PROGRAM = "program"


class AccessLevel(StrEnum):
    """Only currently executable access values (D-048).

    ``subscriber`` and ``purchased`` intentionally do not exist here before
    R5 entitlement data and an evaluator exist.
    """

    PUBLIC = "public"
    REGISTERED = "registered"
    STAFF_ONLY = "staff_only"


class TaxonomyTerm(Base):
    """Immutable semantic identity of one registry value."""

    __tablename__ = "taxonomy_terms"
    __table_args__ = (
        CheckConstraint(
            "(system_defined AND organization_id IS NULL AND axis IN "
            "('support_area', 'journey_intent', 'content_format', 'access_level')) OR "
            "(NOT system_defined AND organization_id IS NOT NULL AND axis IN "
            "('topic_group', 'topic', 'audience', 'content_goal'))",
            name="taxonomy_term_scope",
        ),
        Index(
            "uq_tax_term_system_identity",
            "axis",
            "stable_id",
            unique=True,
            postgresql_where=text("organization_id IS NULL"),
        ),
        Index(
            "uq_tax_term_managed_identity",
            "organization_id",
            "axis",
            "stable_id",
            unique=True,
            postgresql_where=text("organization_id IS NOT NULL"),
        ),
    )

    id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid4)
    organization_id: Mapped[UUID | None] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )
    axis: Mapped[TaxonomyAxis] = mapped_column(
        value_enum(TaxonomyAxis, length=32), nullable=False, index=True
    )
    stable_id: Mapped[str] = mapped_column(String(80), nullable=False)
    system_defined: Mapped[bool] = mapped_column(
        Boolean, default=False, server_default=text("false"), nullable=False
    )
    created_by_user_id: Mapped[UUID | None] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("internal_users.id", ondelete="SET NULL"), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )


class TaxonomyTermRevision(Base):
    """Revisioned public and internal presentation of one stable term."""

    __tablename__ = "taxonomy_term_revisions"
    __table_args__ = (
        CheckConstraint("sort_order >= 0", name="taxonomy_revision_sort_order"),
        CheckConstraint(
            "NOT (icon_key IS NOT NULL AND asset_id IS NOT NULL)",
            name="taxonomy_revision_icon_or_asset",
        ),
        Index(
            "uq_tax_rev_global_version",
            "term_id",
            "locale",
            "version_label",
            unique=True,
            postgresql_where=text("organization_id IS NULL"),
        ),
        Index(
            "uq_tax_rev_tenant_version",
            "term_id",
            "organization_id",
            "locale",
            "version_label",
            unique=True,
            postgresql_where=text("organization_id IS NOT NULL"),
        ),
        Index(
            "uq_tax_rev_global_published",
            "term_id",
            "locale",
            unique=True,
            postgresql_where=text("status = 'published' AND organization_id IS NULL"),
        ),
        Index(
            "uq_tax_rev_tenant_published",
            "term_id",
            "organization_id",
            "locale",
            unique=True,
            postgresql_where=text("status = 'published' AND organization_id IS NOT NULL"),
        ),
    )

    id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid4)
    term_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("taxonomy_terms.id", ondelete="RESTRICT"), index=True
    )
    # NULL is the platform default revision. A UUID is a tenant overlay or a
    # managed term revision; service validation keeps it aligned with term ownership.
    organization_id: Mapped[UUID | None] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )
    version_label: Mapped[str] = mapped_column(String(80), nullable=False)
    locale: Mapped[str] = mapped_column(
        String(16), default="sr-Latn", server_default="sr-Latn", nullable=False
    )
    public_label: Mapped[str] = mapped_column(String(160), nullable=False)
    short_description: Mapped[str] = mapped_column(String(500), default="", server_default="")
    internal_expert_note: Mapped[str | None] = mapped_column(Text, nullable=True)
    primary_parent_term_id: Mapped[UUID | None] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("taxonomy_terms.id", ondelete="RESTRICT"), nullable=True
    )
    journey_intent_term_id: Mapped[UUID | None] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("taxonomy_terms.id", ondelete="RESTRICT"), nullable=True
    )
    sort_order: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    icon_key: Mapped[str | None] = mapped_column(String(120), nullable=True)
    asset_id: Mapped[str | None] = mapped_column(String(191), nullable=True)
    public_visible: Mapped[bool] = mapped_column(
        Boolean, default=True, server_default=text("true"), nullable=False
    )
    compass_enabled: Mapped[bool] = mapped_column(
        Boolean, default=True, server_default=text("true"), nullable=False
    )
    status: Mapped[RevisionStatus] = mapped_column(
        value_enum(RevisionStatus, length=32),
        default=RevisionStatus.DRAFT,
        server_default=RevisionStatus.DRAFT.value,
        index=True,
    )
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

    __mapper_args__ = {"version_id_col": lock_version}  # noqa: RUF012


class TaxonomyTermSearchTerm(Base):
    __tablename__ = "taxonomy_term_search_terms"
    __table_args__ = (
        Index("uq_tax_search_normalized", "revision_id", "normalized_value", unique=True),
    )

    id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid4)
    revision_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("taxonomy_term_revisions.id", ondelete="CASCADE"),
        index=True,
    )
    original_value: Mapped[str] = mapped_column(String(160), nullable=False)
    normalized_value: Mapped[str] = mapped_column(String(160), nullable=False)


class TaxonomyTermRelation(Base):
    __tablename__ = "taxonomy_term_relations"
    __table_args__ = (
        Index(
            "uq_tax_term_relation",
            "source_revision_id",
            "target_term_id",
            "relation_kind",
            unique=True,
        ),
        CheckConstraint("source_term_id <> target_term_id", name="taxonomy_relation_not_self"),
    )

    id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid4)
    source_revision_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("taxonomy_term_revisions.id", ondelete="CASCADE"),
        index=True,
    )
    source_term_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("taxonomy_terms.id", ondelete="RESTRICT")
    )
    target_term_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("taxonomy_terms.id", ondelete="RESTRICT"), index=True
    )
    relation_kind: Mapped[TaxonomyRelationKind] = mapped_column(
        value_enum(TaxonomyRelationKind, length=32), nullable=False
    )


class TaxonomyReviewDecision(Base):
    __tablename__ = "taxonomy_review_decisions"
    __table_args__ = (Index("uq_tax_review_capability", "revision_id", "capability", unique=True),)

    id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid4)
    revision_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("taxonomy_term_revisions.id", ondelete="CASCADE"),
        index=True,
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


class TaxonomyIntakeLink(Base):
    """Reviewed bridge from a content topic to one D-052 support area."""

    __tablename__ = "taxonomy_intake_links"
    __table_args__ = (
        Index(
            "uq_tax_intake_link",
            "organization_id",
            "topic_term_id",
            "support_area_term_id",
            unique=True,
        ),
    )

    id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid4)
    organization_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), index=True
    )
    topic_term_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("taxonomy_terms.id", ondelete="RESTRICT"), index=True
    )
    support_area_term_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("taxonomy_terms.id", ondelete="RESTRICT"), index=True
    )
    status: Mapped[RevisionStatus] = mapped_column(
        value_enum(RevisionStatus, length=32),
        default=RevisionStatus.DRAFT,
        server_default=RevisionStatus.DRAFT.value,
        index=True,
    )
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

    __mapper_args__ = {"version_id_col": lock_version}  # noqa: RUF012


class TaxonomyIntakeLinkReviewDecision(Base):
    __tablename__ = "taxonomy_intake_link_review_decisions"
    __table_args__ = (Index("uq_tax_link_review_capability", "link_id", "capability", unique=True),)

    id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid4)
    link_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("taxonomy_intake_links.id", ondelete="CASCADE"),
        index=True,
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


class TaxonomyPublicationEvent(Base):
    """Append-only actor evidence for term revisions and Intake links."""

    __tablename__ = "taxonomy_publication_events"
    __table_args__ = (
        CheckConstraint(
            "(term_revision_id IS NOT NULL AND intake_link_id IS NULL) OR "
            "(term_revision_id IS NULL AND intake_link_id IS NOT NULL)",
            name="taxonomy_event_one_subject",
        ),
    )

    id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid4)
    term_revision_id: Mapped[UUID | None] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("taxonomy_term_revisions.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )
    intake_link_id: Mapped[UUID | None] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("taxonomy_intake_links.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
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
    reason: Mapped[str | None] = mapped_column(String(500), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )


class TherapistMatchingProfileSupportArea(Base):
    """Referential replacement for ``therapist_matching_profiles.areas`` JSON."""

    __tablename__ = "therapist_matching_profile_support_areas"

    therapist_profile_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("therapist_matching_profiles.id", ondelete="CASCADE"),
        primary_key=True,
    )
    support_area_term_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("taxonomy_terms.id", ondelete="RESTRICT"),
        primary_key=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
