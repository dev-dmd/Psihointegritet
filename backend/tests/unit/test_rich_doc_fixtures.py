"""Parity loader (CG-B7, deferred by D-047, closed 2026-07-30 per D-050).

Reads the SAME physical fixture file as
frontend/src/lib/content-governance/rich-doc.fixtures.test.ts. TS and Python
are separate implementations of one governed contract (ADR-017); a diverging
result for any caseId fails CI on whichever side drifted.

Every "text-extract" and "validate-check" case is round-tripped through
`parse_rich_doc` first (the real entry point for JSON-column content) and
asserted to produce zero parse findings — the fixture's documents are all
well-formed, so this also guards against a fixture case accidentally being
unparseable on the Python side while looking fine as a TS object literal.
"""

import json
from pathlib import Path
from typing import Any

import pytest

from psihointegritet.shared.domain.rich_doc import (
    is_allowed_href,
    parse_rich_doc,
    rich_doc_text,
    rich_doc_text_length,
    validate_rich_doc,
)

FIXTURE_PATH = Path(__file__).resolve().parents[3] / "contracts" / "fixtures" / "richdoc.v1.json"

FIXTURES: dict[str, Any] = json.loads(FIXTURE_PATH.read_text(encoding="utf-8"))

CASES: list[dict[str, Any]] = FIXTURES["cases"]


def test_fixture_file_loaded_a_non_empty_case_list() -> None:
    assert FIXTURES["fixtureSchemaVersion"] == "1"
    assert len(CASES) > 0


@pytest.mark.parametrize("case", CASES, ids=[str(case["caseId"]) for case in CASES])
def test_parity_case(case: dict[str, Any]) -> None:
    action = case["action"]
    given: dict[str, Any] = case["input"]

    if action == "href-check":
        assert is_allowed_href(given["href"]) is case["expectedAllowed"]
        return

    if action == "text-extract":
        doc, parse_findings = parse_rich_doc(given["doc"])
        assert parse_findings == ()
        assert rich_doc_text(doc) == case["expectedText"]
        assert rich_doc_text_length(doc) == case["expectedLength"]
        return

    if action == "validate-check":
        doc, parse_findings = parse_rich_doc(given["doc"])
        assert parse_findings == ()
        limits: dict[str, Any] = given["limits"]
        allowed_blocks = limits.get("allowedBlocks")
        findings = validate_rich_doc(
            doc,
            allowed_blocks=tuple(allowed_blocks) if allowed_blocks is not None else None,
            max_blocks=limits.get("maxBlocks"),
            max_chars=limits.get("maxChars"),
        )
        actual = [
            {
                "ruleId": finding.rule_id,
                "severity": finding.severity,
                "field": finding.field_path,
                "message": finding.message,
                "recommendation": finding.remediation,
            }
            for finding in findings
        ]
        assert actual == case["expectedFindings"]
        return

    pytest.fail(f"Unknown fixture action: {action}")
