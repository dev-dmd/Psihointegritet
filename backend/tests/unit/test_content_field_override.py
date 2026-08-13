import json
from pathlib import Path
from typing import Any

import pytest

from psihointegritet.modules.content.field_override import (
    HIDDEN_CONTENT_FIELD_PATHS,
    MISSING_CONTENT_FIELD,
    normalize_content_field_override,
)
from psihointegritet.modules.content.health import authored_content_findings
from psihointegritet.modules.content.models import (
    ContentEntry,
    ContentRevision,
    ContentTemplate,
    ContentType,
)
from psihointegritet.modules.content.slot_schema import (
    SLOT_SPEC_REGISTRY,
    CtaFieldSpec,
    EditableSlot,
    ImageFieldSpec,
    RichFieldSpec,
    TextFieldSpec,
)

FIXTURE_PATH = (
    Path(__file__).resolve().parents[3]
    / "contracts"
    / "fixtures"
    / "content-field-override.v1.json"
)
FIXTURE: dict[str, Any] = json.loads(FIXTURE_PATH.read_text(encoding="utf-8"))


@pytest.mark.parametrize("case", FIXTURE["cases"], ids=lambda case: str(case["name"]))
def test_normalization_contract(case: dict[str, Any]) -> None:
    raw = MISSING_CONTENT_FIELD if case.get("inputKind") == "missing" else case.get("input")
    result = normalize_content_field_override(raw)

    assert result.mode == case["mode"]
    assert result.valid is case["valid"]


def test_hidden_whitelist_matches_shared_contract() -> None:
    assert sorted(HIDDEN_CONTENT_FIELD_PATHS) == FIXTURE["hideableFieldPaths"]
    assert "service_detail.hero.title" not in HIDDEN_CONTENT_FIELD_PATHS
    assert "service_detail.cta.primary" not in HIDDEN_CONTENT_FIELD_PATHS


def test_whitelist_contains_only_optional_scalar_display_fields() -> None:
    for path in HIDDEN_CONTENT_FIELD_PATHS:
        template_value, slot_name, field_name = path.split(".")
        slot = SLOT_SPEC_REGISTRY[ContentTemplate(template_value)][slot_name]
        assert isinstance(slot, EditableSlot)
        field = slot.fields[field_name]
        assert isinstance(field, TextFieldSpec | RichFieldSpec)
        assert field.required is False

    for template, slots in SLOT_SPEC_REGISTRY.items():
        for slot_name, slot in slots.items():
            if not isinstance(slot, EditableSlot):
                continue
            for field_name, field in slot.fields.items():
                path = f"{template.value}.{slot_name}.{field_name}"
                if getattr(field, "required", False) or isinstance(
                    field, CtaFieldSpec | ImageFieldSpec
                ):
                    assert path not in HIDDEN_CONTENT_FIELD_PATHS


def service_findings(fields: dict[str, object]) -> list[tuple[str, str]]:
    entry = ContentEntry(
        content_type=ContentType.SERVICE,
        slug="individualna-psihoterapija",
        locale="sr-Latn",
    )
    revision = ContentRevision(
        template=ContentTemplate.SERVICE_DETAIL,
        seo={"title": "", "description": ""},
        slot_data={"hero": {"mode": "override", "fields": fields}},
    )
    return [
        (item.rule_id, item.field_path or "") for item in authored_content_findings(entry, revision)
    ]


def test_optional_display_field_may_be_hidden() -> None:
    assert service_findings({"lead": {"mode": "hidden"}}) == []


@pytest.mark.parametrize("field", ["title"])
def test_required_heading_may_not_be_hidden(field: str) -> None:
    assert ("MODEL-003", f"hero.{field}") in service_findings({field: {"mode": "hidden"}})


def test_legacy_missing_null_and_empty_fields_inherit_without_rewrite() -> None:
    assert service_findings({"eyebrow": None, "lead": "   "}) == []


def test_malformed_wrapper_is_rejected() -> None:
    assert ("MODEL-003", "hero.lead") in service_findings({"lead": {"mode": "custom"}})


@pytest.mark.parametrize(
    ("content_type", "template", "slot_name", "field_name"),
    [
        (ContentType.SERVICE, ContentTemplate.SERVICE_DETAIL, "cta", "primary"),
        (ContentType.THERAPIST, ContentTemplate.THERAPIST_PROFILE, "hero", "image"),
    ],
)
def test_cta_and_accessibility_image_fields_may_not_be_hidden(
    content_type: ContentType,
    template: ContentTemplate,
    slot_name: str,
    field_name: str,
) -> None:
    entry = ContentEntry(content_type=content_type, slug="test", locale="en")
    revision = ContentRevision(
        template=template,
        seo={"title": "", "description": ""},
        slot_data={
            slot_name: {
                "mode": "override",
                "fields": {field_name: {"mode": "hidden"}},
            }
        },
    )

    assert ("MODEL-003", f"{slot_name}.{field_name}") in [
        (item.rule_id, item.field_path or "") for item in authored_content_findings(entry, revision)
    ]
