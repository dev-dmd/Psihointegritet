"""Request/response schemas for the CMS Core content API (CG-B4).

Same wire-shape decision as `modules/privacy/schemas.py`: `slot_data` stays a
raw `dict[str, object]` JSON object rather than a typed union of the nine
template slot shapes — the slot schema registry (`SlotFieldSpec`, CG-C1) that
would make a typed shape meaningful does not exist yet. Typing this now would
mean re-typing it again once CG-C1 lands.
"""

from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field
from pydantic.alias_generators import to_camel

from psihointegritet.modules.content.models import ContentTemplate, ContentType, ReviewOutcome
from psihointegritet.modules.content.publication import PublishStage, Severity
from psihointegritet.modules.identity.schemas import ActorSummaryOut
from psihointegritet.shared.domain.content_management import ContentManagement
from psihointegritet.shared.domain.publication import ApprovalCapability, RevisionStatus


class ApiSchema(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True, extra="forbid")


class ReviewDecisionOut(ApiSchema):
    capability: ApprovalCapability
    outcome: ReviewOutcome
    decided_by_user_id: UUID | None = None
    decided_by: ActorSummaryOut | None = None
    decided_at: datetime
    note: str | None = None


class SeoFields(ApiSchema):
    title: str = Field(default="", max_length=65)
    description: str = Field(default="", max_length=170)
    og_image_asset_id: str | None = Field(default=None, max_length=191)


class ContentDiscoveryMetadata(ApiSchema):
    """Controlled Kompas metadata attached to exactly one CMS revision."""

    topic_group_term_id: UUID | None = None
    topic_term_ids: list[UUID] = Field(default_factory=list)  # pyright: ignore[reportUnknownVariableType]
    audience_term_ids: list[UUID] = Field(default_factory=list)  # pyright: ignore[reportUnknownVariableType]
    content_goal_term_ids: list[UUID] = Field(default_factory=list)  # pyright: ignore[reportUnknownVariableType]
    journey_intent_term_id: UUID | None = None
    content_format_term_id: UUID | None = None
    access_level_term_id: UUID | None = None
    related_content_entry_ids: list[UUID] = Field(default_factory=list)  # pyright: ignore[reportUnknownVariableType]


class ContentRevisionOut(ApiSchema):
    entry_id: UUID
    revision_id: UUID
    content_type: ContentType
    management: ContentManagement
    slug: str
    locale: str
    template: ContentTemplate
    slot_data: dict[str, object]
    seo: SeoFields
    discovery: ContentDiscoveryMetadata
    status: RevisionStatus
    version_label: str
    lock_version: int
    decisions: list[ReviewDecisionOut]
    created_by: ActorSummaryOut | None = None
    updated_by: ActorSummaryOut | None = None
    updated_at: datetime


class PublicContentRevisionOut(ApiSchema):
    """Published CMS override without staff identity or edit metadata."""

    content_type: ContentType
    management: ContentManagement
    slug: str
    locale: str
    template: ContentTemplate
    slot_data: dict[str, object]
    seo: SeoFields
    published_at: datetime


class CreateContentEntryRequest(ApiSchema):
    content_type: ContentType
    slug: str = Field(min_length=1, max_length=160)
    template: ContentTemplate
    locale: str = Field(default="sr-Latn", min_length=2, max_length=16)


class UpdateContentRevisionRequest(ApiSchema):
    """`lock_version` is required, not optional: CG-B3 has no meaningful
    default — the client always edits against a specific version it fetched."""

    lock_version: int
    slot_data: dict[str, object] | None = None
    seo: SeoFields | None = None
    discovery: ContentDiscoveryMetadata | None = None


class TransitionRequest(ApiSchema):
    target: RevisionStatus


class SubmitArticleForReviewRequest(ApiSchema):
    """Atomic: save + transition `draft → in_review` in one transaction.

    `lock_version` protects against concurrent writes.  `idempotency_key`
    makes the second identical call return the already-in-review revision
    instead of a 409 (D-068 rule 2).
    """

    lock_version: int
    idempotency_key: UUID
    slot_data: dict[str, object] | None = None
    seo: SeoFields | None = None
    discovery: ContentDiscoveryMetadata | None = None


class RecordReviewDecisionRequest(ApiSchema):
    capability: ApprovalCapability
    outcome: ReviewOutcome
    note: str | None = None


class ContentFindingOut(ApiSchema):
    rule_id: str
    rule_version: str
    severity: Severity
    message: str
    remediation: str
    field_path: str | None = None
    requires_approval: ApprovalCapability | None = None


class PublishBlockOut(ApiSchema):
    stage: PublishStage
    findings: list[ContentFindingOut]
    missing: list[ApprovalCapability]


class ContentHealthOut(ApiSchema):
    """Read-only result for one saved revision (CG-D4)."""

    rule_set_version: str
    checked_at: datetime
    summary: dict[str, int]
    findings: list[ContentFindingOut]
    required_approvals: list[ApprovalCapability]
    missing_approvals: list[ApprovalCapability]


class NormalizeRichHtmlRequest(ApiSchema):
    html: str = Field(max_length=200_000)


class RichDocFindingOut(ApiSchema):
    rule_id: str
    rule_version: str
    severity: str
    message: str
    remediation: str
    field_path: str | None = None


class NormalizeRichHtmlResponse(ApiSchema):
    body: dict[str, object]
    findings: list[RichDocFindingOut]
