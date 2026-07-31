"""Wire contracts for the governed Kompas taxonomy registry."""

from __future__ import annotations

import re
from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator
from pydantic.alias_generators import to_camel

from psihointegritet.modules.content.models import ReviewOutcome
from psihointegritet.modules.content.taxonomy_models import (
    TaxonomyAxis,
    TaxonomyRelationKind,
    TaxonomyRouteKind,
)
from psihointegritet.modules.identity.schemas import ActorSummaryOut
from psihointegritet.shared.domain.publication import ApprovalCapability, RevisionStatus

_MANAGED_ID = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")


class TaxonomyApiSchema(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True, extra="forbid")


class TaxonomyReviewDecisionOut(TaxonomyApiSchema):
    capability: ApprovalCapability
    outcome: ReviewOutcome
    decided_by: ActorSummaryOut | None = None
    decided_at: datetime
    note: str | None = None


class TaxonomyEventOut(TaxonomyApiSchema):
    from_status: RevisionStatus | None = None
    to_status: RevisionStatus
    actor: ActorSummaryOut | None = None
    reason: str | None = None
    created_at: datetime


class TaxonomyRelationOut(TaxonomyApiSchema):
    kind: TaxonomyRelationKind
    target_term_id: UUID
    target_stable_id: str


class TaxonomyTermOut(TaxonomyApiSchema):
    term_id: UUID
    revision_id: UUID
    organization_id: UUID | None
    axis: TaxonomyAxis
    stable_id: str
    canonical_path: str | None
    system_defined: bool
    locale: str
    public_label: str
    short_description: str
    internal_expert_note: str | None = None
    primary_parent_term_id: UUID | None = None
    primary_parent_stable_id: str | None = None
    journey_intent_term_id: UUID | None = None
    journey_intent: str | None = None
    sort_order: int
    icon_key: str | None = None
    asset_id: str | None = None
    public_visible: bool
    compass_enabled: bool
    status: RevisionStatus
    version_label: str
    lock_version: int
    search_terms: list[str]
    relations: list[TaxonomyRelationOut]
    decisions: list[TaxonomyReviewDecisionOut]
    events: list[TaxonomyEventOut]
    created_by: ActorSummaryOut | None = None
    updated_by: ActorSummaryOut | None = None
    created_at: datetime
    updated_at: datetime


class PublicTaxonomyTermOut(TaxonomyApiSchema):
    term_id: UUID
    axis: TaxonomyAxis
    stable_id: str
    canonical_path: str | None
    public_label: str
    short_description: str
    parent_stable_id: str | None = None
    journey_intent: str | None = None
    sort_order: int
    icon_key: str | None = None
    asset_id: str | None = None
    search_terms: list[str]
    related_stable_ids: list[str]


class PublicTaxonomyOut(TaxonomyApiSchema):
    taxonomy_version: str = "kompas-taxonomy-v1"
    locale: str
    terms: list[PublicTaxonomyTermOut]


class TaxonomyRouteOut(TaxonomyApiSchema):
    route_id: UUID
    term_id: UUID
    locale: str
    route_kind: TaxonomyRouteKind
    slug: str
    canonical_path: str
    is_canonical: bool
    lock_version: int
    created_by: ActorSummaryOut | None = None
    updated_by: ActorSummaryOut | None = None
    created_at: datetime
    updated_at: datetime
    superseded_at: datetime | None = None


class SuggestTaxonomyRouteRequest(TaxonomyApiSchema):
    locale: str = Field(default="sr-Latn", min_length=2, max_length=16)


class TaxonomyRouteSuggestionOut(TaxonomyApiSchema):
    slug: str
    canonical_path: str
    available: bool
    current_route_id: UUID | None = None
    current_lock_version: int | None = None


class ConfirmTaxonomyRouteRequest(TaxonomyApiSchema):
    locale: str = Field(default="sr-Latn", min_length=2, max_length=16)
    slug: str = Field(min_length=2, max_length=160)
    lock_version: int | None = Field(default=None, ge=1)

    @field_validator("slug")
    @classmethod
    def validate_slug(cls, value: str) -> str:
        if not _MANAGED_ID.fullmatch(value):
            raise ValueError(
                "Javna putanja koristi mala ASCII slova, brojeve i crtice, "
                "na primer stres-i-preopterecenost"
            )
        return value


class CreateTaxonomyTermRequest(TaxonomyApiSchema):
    axis: TaxonomyAxis
    stable_id: str = Field(min_length=2, max_length=80)
    locale: str = Field(default="sr-Latn", min_length=2, max_length=16)
    public_label: str = Field(min_length=1, max_length=160)
    short_description: str = Field(default="", max_length=500)
    internal_expert_note: str | None = Field(default=None, max_length=4_000)
    primary_parent_term_id: UUID | None = None
    journey_intent_term_id: UUID | None = None
    sort_order: int = Field(default=0, ge=0, le=100_000)
    icon_key: str | None = Field(default=None, max_length=120)
    asset_id: str | None = Field(default=None, max_length=191)
    public_visible: bool = True
    compass_enabled: bool = True
    search_terms: list[str] = Field(default_factory=list, max_length=100)
    related_topic_ids: list[UUID] = Field(default_factory=list, max_length=100)

    @field_validator("stable_id")
    @classmethod
    def validate_stable_id(cls, value: str) -> str:
        if not _MANAGED_ID.fullmatch(value):
            raise ValueError("ID koristi mala slova, brojeve i crtice, na primer burnout")
        return value

    @field_validator("search_terms")
    @classmethod
    def validate_search_terms(cls, values: list[str]) -> list[str]:
        cleaned = [value.strip() for value in values if value.strip()]
        if any(len(value) > 160 for value in cleaned):
            raise ValueError("Pojam za pretragu može imati najviše 160 karaktera")
        return cleaned


class UpdateTaxonomyRevisionRequest(TaxonomyApiSchema):
    lock_version: int = Field(ge=1)
    public_label: str | None = Field(default=None, min_length=1, max_length=160)
    short_description: str | None = Field(default=None, max_length=500)
    internal_expert_note: str | None = Field(default=None, max_length=4_000)
    primary_parent_term_id: UUID | None = None
    journey_intent_term_id: UUID | None = None
    sort_order: int | None = Field(default=None, ge=0, le=100_000)
    icon_key: str | None = Field(default=None, max_length=120)
    asset_id: str | None = Field(default=None, max_length=191)
    public_visible: bool | None = None
    compass_enabled: bool | None = None
    search_terms: list[str] | None = Field(default=None, max_length=100)
    related_topic_ids: list[UUID] | None = Field(default=None, max_length=100)
    replacement_term_id: UUID | None = None

    @field_validator("search_terms")
    @classmethod
    def validate_search_terms(cls, values: list[str] | None) -> list[str] | None:
        if values is None:
            return None
        cleaned = [value.strip() for value in values if value.strip()]
        if any(len(value) > 160 for value in cleaned):
            raise ValueError("Pojam za pretragu može imati najviše 160 karaktera")
        return cleaned


class TaxonomyTransitionRequest(TaxonomyApiSchema):
    target: RevisionStatus
    lock_version: int = Field(ge=1)


class TaxonomyReviewDecisionRequest(TaxonomyApiSchema):
    capability: ApprovalCapability
    outcome: ReviewOutcome
    note: str | None = Field(default=None, max_length=500)


class CreateTaxonomyIntakeLinkRequest(TaxonomyApiSchema):
    topic_term_id: UUID
    support_area_term_id: UUID


class TaxonomyIntakeLinkOut(TaxonomyApiSchema):
    link_id: UUID
    topic_term_id: UUID
    topic_stable_id: str
    topic_label: str
    support_area_term_id: UUID
    support_area_stable_id: str
    support_area_label: str
    status: RevisionStatus
    lock_version: int
    decisions: list[TaxonomyReviewDecisionOut]
    events: list[TaxonomyEventOut]
    created_by: ActorSummaryOut | None = None
    updated_by: ActorSummaryOut | None = None
    created_at: datetime
    updated_at: datetime


class TaxonomyIntakeLinkTransitionRequest(TaxonomyApiSchema):
    target: RevisionStatus
    lock_version: int = Field(ge=1)


class TaxonomyIntakeLinkReviewRequest(TaxonomyApiSchema):
    capability: ApprovalCapability
    outcome: ReviewOutcome
    note: str | None = Field(default=None, max_length=500)
