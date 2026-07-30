"""Fixture-driven regression suite for CG-B2's content publication policy
(CG-B6, deferred by D-047, closed 2026-07-30 per D-050).

**Python-only for now.** Unlike the legal document registry (`legal-documents.ts`
mirrors `modules/privacy/publication.py` for the existing LD-7 panel), there is
no frontend module today that reimplements `modules/content/publication.py`'s
approval matrix or staged `check_publishable` evaluation — CG-C1b/CG-C4 have
not been built yet, so a TS mirror would have no consumer (rules §25). This
fixture is written in the same shape CG-A2 established (`legal-publication.v1.json`)
specifically so that when CG-C1b/CG-C4 does build that mirror, a TS loader can
be added alongside this Python one without touching the fixture's cases.
"""

import json
from pathlib import Path
from typing import Any

import pytest

from psihointegritet.modules.content.models import ContentTemplate, ContentType, ReviewOutcome
from psihointegritet.modules.content.publication import (
    ContentFinding,
    ReviewDecisionRecord,
    check_publishable,
    dynamic_approvals,
    required_approvals,
    structural_findings,
)
from psihointegritet.shared.domain.publication import ApprovalCapability, RevisionStatus

FIXTURE_PATH = (
    Path(__file__).resolve().parents[3] / "contracts" / "fixtures" / "content-publication.v1.json"
)

FIXTURES: dict[str, Any] = json.loads(FIXTURE_PATH.read_text(encoding="utf-8"))

CASES: list[dict[str, Any]] = FIXTURES["cases"]


def _finding_from(raw: dict[str, Any]) -> ContentFinding:
    requires_approval = raw.get("requiresApproval")
    return ContentFinding(
        rule_id=raw.get("ruleId", "TEST-001"),
        rule_version="1",
        severity=raw["severity"],
        message="Fixture nalaz.",
        remediation="Fixture remedijacija.",
        requires_approval=ApprovalCapability(requires_approval)
        if requires_approval is not None
        else None,
    )


def _decision_from(raw: dict[str, str]) -> ReviewDecisionRecord:
    return ReviewDecisionRecord(
        capability=ApprovalCapability(raw["capability"]),
        outcome=ReviewOutcome(raw["outcome"]),
    )


def test_fixture_file_loaded_a_non_empty_case_list() -> None:
    assert FIXTURES["fixtureSchemaVersion"] == "1"
    assert len(CASES) > 0


@pytest.mark.parametrize("case", CASES, ids=[str(case["caseId"]) for case in CASES])
def test_parity_case(case: dict[str, Any]) -> None:
    action = case["action"]
    given: dict[str, Any] = case["input"]

    if action == "required-approvals-check":
        required = sorted(
            capability.value
            for capability in required_approvals(
                ContentType(given["contentType"]), ContentTemplate(given["template"])
            )
        )
        assert required == case["expectedRequiredCapabilities"]
        return

    if action == "dynamic-approvals-check":
        findings = [_finding_from(raw) for raw in given["findings"]]
        capabilities = sorted(capability.value for capability in dynamic_approvals(findings))
        assert capabilities == case["expectedCapabilities"]
        return

    if action == "structural-findings-check":
        findings = structural_findings(ContentTemplate(given["template"]), given["slotData"])
        actual = [
            {"ruleId": finding.rule_id, "severity": finding.severity, "field": finding.field_path}
            for finding in findings
        ]
        assert actual == case["expectedFindings"]
        return

    if action == "publish-check":
        decisions = [_decision_from(raw) for raw in given["decisions"]]
        extra_findings = [_finding_from(raw) for raw in given["extraFindings"]]
        check = check_publishable(
            ContentType(given["contentType"]),
            ContentTemplate(given["template"]),
            RevisionStatus(given["status"]),
            slot_data=given["slotData"],
            decisions=decisions,
            extra_findings=extra_findings,
        )
        assert check.ok is case["expectedPublishAllowed"]
        assert check.stage == case["expectedStage"]
        missing = sorted(capability.value for capability in check.missing)
        assert missing == case["expectedMissingCapabilities"]
        return

    pytest.fail(f"Unknown fixture action: {action}")
