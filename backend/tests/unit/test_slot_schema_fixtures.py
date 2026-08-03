"""Parity loader (CG-C1a, ADR-017 Amendment 2, D-050).

Reads the SAME physical fixture file as
frontend/src/lib/content-governance/slot-schema.fixtures.test.ts. Unlike the
other parity fixtures in this repository (function behaviour over varied
inputs), `SLOT_SPEC_REGISTRY` and `slotSpecRegistry` are static data — the
fixture is the registry itself, serialized once from the Python side, and
both loaders assert their own in-code registry converts to exactly this
JSON. A change to either registry without updating this file, or a drift
between the two implementations, fails here first.
"""

import json
from pathlib import Path
from typing import Any

from psihointegritet.modules.content.slot_schema import (
    SLOT_SPEC_REGISTRY,
    BooleanFieldSpec,
    CollectionFieldSpec,
    ComputedSlot,
    CtaFieldSpec,
    CtaListFieldSpec,
    EditableSlot,
    ImageFieldSpec,
    IntegerFieldSpec,
    MoneyFieldSpec,
    RichFieldSpec,
    SlotFieldSpec,
    SlotSpec,
    TextFieldSpec,
)

FIXTURE_PATH = (
    Path(__file__).resolve().parents[3] / "contracts" / "fixtures" / "slot-schema.v1.json"
)

FIXTURES: dict[str, Any] = json.loads(FIXTURE_PATH.read_text(encoding="utf-8"))


def _field_to_json(spec: SlotFieldSpec) -> dict[str, Any]:
    if isinstance(spec, TextFieldSpec):
        return {"kind": "text", "limit": spec.limit, "required": spec.required}
    if isinstance(spec, RichFieldSpec):
        return {
            "kind": "rich",
            "maxBlocks": spec.max_blocks,
            "maxChars": spec.max_chars,
            "required": spec.required,
        }
    if isinstance(spec, IntegerFieldSpec):
        return {
            "kind": "integer",
            "min": spec.min,
            "max": spec.max,
            "step": spec.step,
            "unit": spec.unit,
            "required": spec.required,
        }
    if isinstance(spec, MoneyFieldSpec):
        return {
            "kind": "money",
            "currency": spec.currency,
            "min": spec.min,
            "max": spec.max,
            "required": spec.required,
        }
    if isinstance(spec, BooleanFieldSpec):
        return {"kind": "boolean", "required": spec.required}
    if isinstance(spec, ImageFieldSpec):
        return {"kind": "image", "required": spec.required}
    if isinstance(spec, CtaFieldSpec):
        return {
            "kind": "cta",
            "allowedActions": list(spec.allowed_actions),
            "targetType": spec.target_type.value if spec.target_type else None,
            "required": spec.required,
        }
    if isinstance(spec, CollectionFieldSpec):
        return {"kind": spec.kind, "min": spec.min, "max": spec.max}
    if isinstance(spec, CtaListFieldSpec):
        return {
            "kind": "ctaList",
            "min": spec.min,
            "max": spec.max,
            "allowedActions": list(spec.allowed_actions),
            "targetType": spec.target_type.value if spec.target_type else None,
        }
    # RepeaterFieldSpec — the union's last member, exhausted by the checks
    # above; pyright flags a final `isinstance` here as unreachable.
    return {
        "kind": "repeater",
        "min": spec.min,
        "max": spec.max,
        "item": {name: _field_to_json(f) for name, f in spec.item.items()},
    }


def _slot_to_json(spec: SlotSpec) -> dict[str, Any]:
    if isinstance(spec, EditableSlot):
        return {
            "editability": "editable",
            "required": spec.required,
            "visibility": spec.visibility,
            "fields": {name: _field_to_json(f) for name, f in spec.fields.items()},
        }
    if isinstance(spec, ComputedSlot):
        return {"editability": "computed", "reason": spec.reason}
    # UnmodeledSlot — the union's last member, exhausted by the checks above.
    return {"editability": "unmodeled", "reason": spec.reason}


def test_fixture_file_loaded_all_ten_templates() -> None:
    assert FIXTURES["fixtureSchemaVersion"] == "1"
    assert len(FIXTURES["templates"]) == 10


def test_python_registry_matches_the_fixture_exactly() -> None:
    actual = {
        template.value: {slot: _slot_to_json(spec) for slot, spec in slots.items()}
        for template, slots in SLOT_SPEC_REGISTRY.items()
    }
    assert actual == FIXTURES["templates"]
