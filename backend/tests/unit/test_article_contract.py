"""The `article_detail` authoring contract (ADR-019 §4, recipe `article-v1`).

These tests hold the parts of the contract that are easy to break by editing a
registry in isolation: the render order the recipe promises, the approval floor
an educational text publishes under, and the new `boolean` field kind, whose
whole point is that an unanswered question is not a "no".
"""

from typing import get_args

from psihointegritet.modules.content.health import (
    CONTENT_CHARACTER_LIMITS,
    authored_content_findings,
)
from psihointegritet.modules.content.models import (
    ContentEntry,
    ContentRevision,
    ContentTemplate,
    ContentType,
)
from psihointegritet.modules.content.publication import TEMPLATE_REGISTRY, required_approvals
from psihointegritet.modules.content.slot_schema import (
    SLOT_SPEC_REGISTRY,
    BooleanFieldSpec,
    ContentCharacterLimitKey,
    EditableSlot,
)
from psihointegritet.shared.domain.publication import ApprovalCapability

# The order ADR-021 fixes for `article-v1`. Not alphabetical, not arbitrary:
# it is the order a reader meets the sections in.
RECIPE_ORDER = (
    "hero",
    "byline",
    "body_intro",
    "questions",
    "practice",
    "body_outro",
    "sources",
    "cta",
)


def test_recipe_order_is_the_registry_order() -> None:
    # The renderer walks the registry, so key order *is* the published order.
    # Re-sorting this dict would silently rearrange every published article.
    assert tuple(SLOT_SPEC_REGISTRY[ContentTemplate.ARTICLE_DETAIL]) == RECIPE_ORDER


def test_only_the_three_sections_a_text_cannot_do_without_are_required() -> None:
    definition = TEMPLATE_REGISTRY[ContentTemplate.ARTICLE_DETAIL]
    assert definition.required_slots == ("hero", "byline", "body_intro")
    # Everything else is the author's call, including sources — a schema-level
    # requirement would push someone to invent a citation (ADR-019 §6).
    assert "sources" in definition.optional_slots


def test_article_publishes_only_with_clinical_and_business() -> None:
    assert required_approvals(ContentType.ARTICLE, ContentTemplate.ARTICLE_DETAIL) == frozenset(
        {ApprovalCapability.CLINICAL, ApprovalCapability.BUSINESS}
    )


def test_standalone_is_offered_exactly_where_kompas_may_recommend_a_section() -> None:
    slots = SLOT_SPEC_REGISTRY[ContentTemplate.ARTICLE_DETAIL]
    with_standalone = {
        name
        for name, spec in slots.items()
        if isinstance(spec, EditableSlot)
        and any(isinstance(field, BooleanFieldSpec) for field in spec.fields.values())
    }
    assert with_standalone == {"questions", "practice"}


def test_every_declared_character_limit_key_has_a_value() -> None:
    # A key in the Literal without an entry here raises KeyError deep inside
    # validation, at authoring time, on someone else's text.
    assert set(get_args(ContentCharacterLimitKey)) <= set(CONTENT_CHARACTER_LIMITS)


class TestBooleanField:
    """Exercised through the real registry walk, not the validator in isolation."""

    @staticmethod
    def findings_for(standalone: object) -> list[str]:
        entry = ContentEntry(
            content_type=ContentType.ARTICLE,
            slug="anksioznost-nije-vas-neprijatelj",
            locale="sr-Latn",
        )
        revision = ContentRevision(
            template=ContentTemplate.ARTICLE_DETAIL,
            seo={"title": "Anksioznost nije vaš neprijatelj", "description": "Kratak opis."},
            slot_data={
                "practice": {
                    "mode": "override",
                    "fields": {"steps": None, "standalone": standalone},
                }
            },
        )
        return [
            item.rule_id
            for item in authored_content_findings(entry, revision)
            if item.field_path == "practice.standalone"
        ]

    def test_unanswered_optional_question_is_not_a_defect(self) -> None:
        assert self.findings_for(None) == []

    def test_both_answers_are_accepted(self) -> None:
        # Absence must not silently confirm or deny; only an explicit bool does.
        assert self.findings_for(True) == []
        assert self.findings_for(False) == []

    def test_a_string_that_looks_like_a_yes_is_rejected(self) -> None:
        assert self.findings_for("true") == ["MODEL-003"]
