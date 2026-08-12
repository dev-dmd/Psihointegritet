"""Public wire contracts for Kompas page aggregates and recommendations.

The anonymous contract is intentionally narrower than the persisted access
vocabulary: a returned card has already passed the backend eligibility
boundary and therefore carries the literal access value ``public``.  Staff
metadata, review evidence and database actor identities never enter these
schemas.
"""

from __future__ import annotations

import re
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator
from pydantic.alias_generators import to_camel

from psihointegritet.modules.content.models import ContentTemplate, ContentType
from psihointegritet.modules.content.schemas import SeoFields
from psihointegritet.modules.content.taxonomy_models import ContentFormat, JourneyIntent
from psihointegritet.modules.content.taxonomy_schemas import PublicTaxonomyTermOut

_STABLE_REFERENCE = re.compile(r"^[a-z0-9]+(?:[-_][a-z0-9]+)*$")


class CompassApiSchema(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True, extra="forbid")


class CompassContentCardOut(CompassApiSchema):
    """A controlled CMS identity, never an editor-provided destination URL."""

    item_key: str
    content_type: ContentType
    slug: str
    locale: str
    template: ContentTemplate
    seo: SeoFields
    content_format: ContentFormat
    access_level: Literal["public"] = "public"
    published_at: datetime


class CompassTaxonomyPageOut(CompassApiSchema):
    taxonomy_version: str
    locale: str
    term: PublicTaxonomyTermOut
    parent: PublicTaxonomyTermOut | None = None
    children: list[PublicTaxonomyTermOut]
    related_terms: list[PublicTaxonomyTermOut]
    content_cards: list[CompassContentCardOut]


class CompassRecommendationRequest(CompassApiSchema):
    taxonomy_version: str = Field(min_length=1, max_length=80)
    rule_version: str = Field(min_length=1, max_length=80)
    locale: str = Field(default="sr-Latn", min_length=2, max_length=16)
    topic_group_id: str | None = Field(default=None, min_length=2, max_length=80)
    topic_ids: list[str] = Field(default_factory=list, max_length=2)  # pyright: ignore[reportUnknownVariableType]
    audience_id: str | None = Field(default=None, min_length=2, max_length=80)
    goal_ids: list[str] = Field(default_factory=list, max_length=2)  # pyright: ignore[reportUnknownVariableType]
    journey_intent: JourneyIntent | None = None
    limit: int = Field(default=12, ge=1, le=24)
    offset: int = Field(default=0, ge=0, le=10_000)

    @field_validator("topic_group_id", "audience_id")
    @classmethod
    def validate_optional_reference(cls, value: str | None) -> str | None:
        if value is not None and not _STABLE_REFERENCE.fullmatch(value):
            raise ValueError("Reference must be a stable taxonomy identifier")
        return value

    @field_validator("topic_ids", "goal_ids")
    @classmethod
    def validate_references(cls, values: list[str]) -> list[str]:
        if any(not _STABLE_REFERENCE.fullmatch(value) for value in values):
            raise ValueError("References must be stable taxonomy identifiers")
        # Preserve user order while making the request deterministic.
        return list(dict.fromkeys(values))


class CompassNormalizedSelectionOut(CompassApiSchema):
    topic_group_id: str | None = None
    topic_ids: list[str]
    audience_id: str | None = None
    goal_ids: list[str]
    journey_intent: JourneyIntent | None = None


class CompassSelectionAdjustmentOut(CompassApiSchema):
    code: str
    field_path: str
    message: str
    removed_values: list[str] = Field(default_factory=list)  # pyright: ignore[reportUnknownVariableType]


class CompassReasonOut(CompassApiSchema):
    code: str
    text: str


class CompassRecommendationItemOut(CompassApiSchema):
    card: CompassContentCardOut
    reasons: list[CompassReasonOut] = Field(max_length=3)
    goal_ids: list[str]


class CompassHandoffCandidateOut(CompassApiSchema):
    schema_version: Literal["1"] = "1"
    taxonomy_version: str
    topic_group_id: str | None = None
    topic_ids: list[str]
    audience_ids: list[str]
    journey_intent: JourneyIntent | None = None


class CompassPaginationOut(CompassApiSchema):
    offset: int
    limit: int
    total: int
    has_more: bool


class CompassRecommendationOut(CompassApiSchema):
    taxonomy_version: str
    rule_version: str
    locale: str
    normalized_selection: CompassNormalizedSelectionOut
    selection_adjustments: list[CompassSelectionAdjustmentOut]
    recommendations: list[CompassRecommendationItemOut]
    related_topics: list[PublicTaxonomyTermOut]
    handoff_candidate: CompassHandoffCandidateOut
    pagination: CompassPaginationOut
