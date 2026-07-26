"""Parity loader (contract A.5, CG-A2).

Reads the SAME physical fixture file as
frontend/src/features/workspace/legal-documents.fixtures.test.ts. TS and
Python are separate implementations of one governed contract (ADR-016 §5); a
diverging result for any caseId fails CI on whichever side drifted.

The reissue cases assert the observable contract only: approvals drop to empty
on ``approved/archived -> draft``. The frontend proves it through
``applyTransition``; here the service layer that reissues revisions arrives
with LD-7/CG-B, so the check runs against ``missing_approvals`` with the
post-reissue (empty) evidence.
"""

import json
from pathlib import Path
from typing import Any

import pytest

from psihointegritet.modules.privacy.models import (
    ApprovalCapability,
    LegalDocumentKind,
    RevisionStatus,
)
from psihointegritet.modules.privacy.publication import (
    can_delete,
    can_transition,
    check_publishable,
    content_problems,
    intake_gate_open,
    missing_approvals,
)

FIXTURE_PATH = (
    Path(__file__).resolve().parents[3] / "contracts" / "fixtures" / "legal-publication.v1.json"
)

FIXTURES: dict[str, Any] = json.loads(FIXTURE_PATH.read_text(encoding="utf-8"))

CASES: list[dict[str, Any]] = FIXTURES["cases"]


def _approval_evidence(capabilities: list[str]) -> list[dict[str, str]]:
    return [{"capability": capability} for capability in capabilities]


def test_fixture_file_loaded_a_non_empty_case_list() -> None:
    assert FIXTURES["fixtureSchemaVersion"] == "1"
    assert len(CASES) > 0


@pytest.mark.parametrize("case", CASES, ids=[str(case["caseId"]) for case in CASES])
def test_parity_case(case: dict[str, Any]) -> None:
    if case.get("skipReason"):
        pytest.skip(str(case["skipReason"]))

    action = case["action"]
    given: dict[str, Any] = case["input"]

    if action == "transition-check":
        result = can_transition(RevisionStatus(given["from"]), RevisionStatus(given["to"]))
        assert result is case["expectedTransitionAllowed"]
        return

    if action == "publish-check":
        check = check_publishable(
            LegalDocumentKind(given["kind"]),
            RevisionStatus(given["status"]),
            title=given["title"],
            slug=given["slug"],
            body=given["body"],
            approvals=_approval_evidence(given["approvals"]),
        )
        assert check.ok is case["expectedPublishAllowed"]
        assert check.stage == case["expectedStage"]
        problems = content_problems(given["title"], given["slug"], given["body"])
        assert list(problems) == case["expectedContentProblems"]
        missing = sorted(capability.value for capability in check.missing)
        assert missing == case["expectedMissingCapabilities"]
        return

    if action == "required-approvals-check":
        required = sorted(
            capability.value
            for capability in missing_approvals(LegalDocumentKind(given["kind"]), [])
        )
        assert required == case["expectedRequiredCapabilities"]
        return

    if action == "reissue-approvals-check":
        post_reissue_evidence: list[dict[str, str]] = []
        required = sorted(
            capability.value
            for capability in missing_approvals(
                LegalDocumentKind(given["kind"]), post_reissue_evidence
            )
        )
        assert required == case["expectedRequiredCapabilities"]
        return

    if action == "delete-check":
        assert can_delete(RevisionStatus(given["status"])) is case["expectedDeleteAllowed"]
        return

    if action == "gate-check":
        kinds = [LegalDocumentKind(kind) for kind in given["publishedKinds"]]
        assert intake_gate_open(kinds) is case["expectedGateOpen"]
        return

    pytest.fail(f"Unknown fixture action: {action}")


def test_capability_values_match_the_fixture_vocabulary() -> None:
    # The fixture stores capabilities as raw strings; guard the enum values so
    # a rename on either side surfaces here instead of as silent skips.
    assert {capability.value for capability in ApprovalCapability} == {
        "clinical",
        "legal",
        "business",
    }
