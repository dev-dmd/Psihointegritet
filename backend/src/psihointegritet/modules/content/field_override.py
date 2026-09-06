"""Backward-compatible three-state CMS field override contract."""

from __future__ import annotations

from collections.abc import Mapping
from dataclasses import dataclass
from typing import Literal, cast

from psihointegritet.modules.content.models import ContentTemplate

ContentFieldMode = Literal["inherit", "custom", "hidden"]
MISSING_CONTENT_FIELD = object()


@dataclass(frozen=True, slots=True)
class NormalizedContentField:
    mode: ContentFieldMode
    value: object = MISSING_CONTENT_FIELD
    valid: bool = True
    explicit: bool = False


# Mirrored by frontend/content-field-override.ts and held by the shared
# content-field-override.v1.json contract fixture.
HIDDEN_CONTENT_FIELD_PATHS = frozenset(
    {
        "service_detail.hero.eyebrow",
        "service_detail.hero.lead",
        "therapist_profile.hero.badge",
        "therapist_profile.hero.quote",
        "therapist_profile.hero.formats",
        "therapist_profile.approach.intro",
        "therapist_profile.bio.cardExcerpt",
        "program_detail.facts.details",
        "program_detail.facts.note",
        "company_page.hero.lead",
        "company_page.privacy.title",
        "company_page.privacy.description",
        "company_page.configurator_cta.bannerHeading",
        "company_page.configurator_cta.bannerBody",
        "pricing_page.notice.body",
        "static_information.hero.heroLead",
        "article_detail.hero.lead",
        "article_detail.questions.intro",
        "article_detail.practice.title",
        "article_detail.body_outro.body",
    }
)


def content_field_path(template: ContentTemplate, slot_name: str, field_name: str) -> str:
    return f"{template.value}.{slot_name}.{field_name}"


def can_hide_content_field(template: ContentTemplate, slot_name: str, field_name: str) -> bool:
    return content_field_path(template, slot_name, field_name) in HIDDEN_CONTENT_FIELD_PATHS


def normalize_content_field_override(raw: object) -> NormalizedContentField:
    """Normalize old and new CMS field values without rewriting stored JSON."""

    if raw is MISSING_CONTENT_FIELD or raw is None or (isinstance(raw, str) and not raw.strip()):
        return NormalizedContentField(mode="inherit")

    if isinstance(raw, Mapping) and "mode" in raw:
        wrapper = cast("Mapping[object, object]", raw)
        keys = set(wrapper)
        mode = wrapper.get("mode")
        if mode == "inherit" and keys == {"mode"}:
            return NormalizedContentField(mode="inherit", explicit=True)
        if mode == "hidden" and keys == {"mode"}:
            return NormalizedContentField(mode="hidden", explicit=True)
        if mode == "custom" and keys == {"mode", "value"} and wrapper.get("value") is not None:
            return NormalizedContentField(mode="custom", value=wrapper["value"], explicit=True)
        return NormalizedContentField(mode="inherit", valid=False, explicit=True)

    return NormalizedContentField(mode="custom", value=cast("object", raw))
