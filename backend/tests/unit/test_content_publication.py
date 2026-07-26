"""CG-B2 publication policy tests.

Covers the approval matrix, dynamic requirements from findings, and the
staged check order fixed by contract A.4.
"""

import pytest

from psihointegritet.modules.content.models import (
    ContentTemplate,
    ContentType,
    ReviewOutcome,
)
from psihointegritet.modules.content.publication import (
    BASE_REQUIRED_APPROVALS,
    TEMPLATE_REGISTRY,
    ContentFinding,
    MissingApprovalError,
    ReviewDecisionRecord,
    check_publishable,
    dynamic_approvals,
    effective_required_approvals,
    granted_capabilities,
    require_publishable,
    required_approvals,
    structural_findings,
)
from psihointegritet.shared.domain.publication import (
    ApprovalCapability,
    InvalidRevisionTransitionError,
    RevisionStatus,
)


def approved(*capabilities: ApprovalCapability) -> list[ReviewDecisionRecord]:
    return [
        ReviewDecisionRecord(capability=capability, outcome=ReviewOutcome.APPROVED)
        for capability in capabilities
    ]


def complete_slots(template: ContentTemplate) -> dict[str, object]:
    slots: dict[str, object] = dict.fromkeys(
        TEMPLATE_REGISTRY[template].required_slots, "Sadržaj sekcije."
    )
    return slots


def finding(
    severity: str = "error",
    requires_approval: ApprovalCapability | None = None,
) -> ContentFinding:
    return ContentFinding(
        rule_id="TEST-001",
        rule_version="1",
        severity=severity,  # pyright: ignore[reportArgumentType]
        message="Test nalaz.",
        remediation="Ispravite.",
        requires_approval=requires_approval,
    )


class TestApprovalMatrix:
    def test_every_content_type_needs_at_least_one_approval(self) -> None:
        for content_type in ContentType:
            assert BASE_REQUIRED_APPROVALS[content_type] != frozenset()

    def test_therapist_profile_needs_clinical_and_business(self) -> None:
        assert required_approvals(
            ContentType.THERAPIST, ContentTemplate.THERAPIST_PROFILE
        ) == frozenset({ApprovalCapability.CLINICAL, ApprovalCapability.BUSINESS})

    def test_legal_template_adds_legal_to_a_static_page(self) -> None:
        # Same content type, different public surface, different requirement.
        assert required_approvals(ContentType.STATIC_PAGE, ContentTemplate.LEGAL_PAGE) == frozenset(
            {ApprovalCapability.LEGAL, ApprovalCapability.BUSINESS}
        )
        assert required_approvals(
            ContentType.STATIC_PAGE, ContentTemplate.STATIC_INFORMATION
        ) == frozenset({ApprovalCapability.BUSINESS})

    def test_package_offer_needs_business_only(self) -> None:
        assert required_approvals(
            ContentType.PACKAGE_OFFER, ContentTemplate.PRICING_PAGE
        ) == frozenset({ApprovalCapability.BUSINESS})

    def test_every_template_declares_its_additive_requirement(self) -> None:
        for template in ContentTemplate:
            # Raises KeyError if a template was added without a decision.
            required_approvals(ContentType.STATIC_PAGE, template)


class TestDynamicApprovals:
    def test_a_finding_can_add_a_capability(self) -> None:
        findings = [finding("warning", ApprovalCapability.CLINICAL)]
        assert dynamic_approvals(findings) == frozenset({ApprovalCapability.CLINICAL})

    def test_findings_of_any_severity_count(self) -> None:
        # Contract A.3: severity and approval are independent axes.
        for severity in ("info", "warning", "error"):
            findings = [finding(severity, ApprovalCapability.LEGAL)]
            assert dynamic_approvals(findings) == frozenset({ApprovalCapability.LEGAL})

    def test_findings_never_remove_a_static_requirement(self) -> None:
        effective = effective_required_approvals(
            ContentType.THERAPIST,
            ContentTemplate.THERAPIST_PROFILE,
            [finding("info")],
        )
        assert effective == frozenset({ApprovalCapability.CLINICAL, ApprovalCapability.BUSINESS})

    def test_dynamic_requirement_is_added_to_the_static_set(self) -> None:
        effective = effective_required_approvals(
            ContentType.SERVICE,
            ContentTemplate.SERVICE_DETAIL,
            [finding("warning", ApprovalCapability.CLINICAL)],
        )
        assert effective == frozenset({ApprovalCapability.BUSINESS, ApprovalCapability.CLINICAL})


class TestGrantedCapabilities:
    def test_only_approved_decisions_grant(self) -> None:
        decisions = [
            ReviewDecisionRecord(ApprovalCapability.LEGAL, ReviewOutcome.APPROVED),
            ReviewDecisionRecord(ApprovalCapability.CLINICAL, ReviewOutcome.REJECTED),
        ]
        assert granted_capabilities(decisions) == frozenset({ApprovalCapability.LEGAL})

    def test_no_decisions_grants_nothing(self) -> None:
        assert granted_capabilities([]) == frozenset()


class TestStructuralFindings:
    def test_complete_slots_produce_no_findings(self) -> None:
        template = ContentTemplate.LEGAL_PAGE
        assert structural_findings(template, complete_slots(template)) == ()

    def test_missing_required_slot_is_an_error(self) -> None:
        findings = structural_findings(ContentTemplate.LEGAL_PAGE, {"title": "Uslovi"})
        rule_ids = {item.rule_id for item in findings}
        fields = {item.field_path for item in findings}

        assert rule_ids == {"MODEL-004"}
        assert fields == {"legal_copy", "version"}
        assert all(item.severity == "error" for item in findings)

    def test_blank_required_slot_counts_as_missing(self) -> None:
        slots = complete_slots(ContentTemplate.LEGAL_PAGE)
        slots["version"] = "   "
        findings = structural_findings(ContentTemplate.LEGAL_PAGE, slots)

        assert [item.field_path for item in findings] == ["version"]

    def test_unknown_slot_is_rejected(self) -> None:
        slots = complete_slots(ContentTemplate.LEGAL_PAGE)
        slots["marketing_banner"] = "Kupite sada"
        findings = structural_findings(ContentTemplate.LEGAL_PAGE, slots)

        assert [item.rule_id for item in findings] == ["MODEL-003"]
        assert [item.field_path for item in findings] == ["marketing_banner"]

    def test_an_allowed_optional_slot_passes(self) -> None:
        template = ContentTemplate.SUPPORT_AREA
        slots = complete_slots(template)
        slots["faq"] = "Pitanja"
        assert structural_findings(template, slots) == ()

    def test_no_template_has_more_optional_slots_than_its_maximum(self) -> None:
        # Why LIMIT-002 is not enforced by slot key: the maximum counts
        # repeatable items inside a slot, so a key-based check is unreachable.
        for template, definition in TEMPLATE_REGISTRY.items():
            assert len(definition.optional_slots) <= definition.max_optional_sections, template

    def test_registry_matches_the_frontend_slot_counts(self) -> None:
        # Guards a silent drift from limits.ts; a template change must be
        # deliberate on both sides.
        assert TEMPLATE_REGISTRY[ContentTemplate.SERVICE_DETAIL].required_slots == (
            "hero",
            "facts",
            "description",
            "first_step",
            "related",
            "cta",
        )
        assert TEMPLATE_REGISTRY[ContentTemplate.STATIC_INFORMATION].max_optional_sections == 6


class TestCheckPublishableStageOrder:
    def test_content_stage_wins_over_transition_and_approvals(self) -> None:
        check = check_publishable(
            ContentType.STATIC_PAGE,
            ContentTemplate.LEGAL_PAGE,
            RevisionStatus.DRAFT,
            slot_data={},
            decisions=[],
        )
        assert check.ok is False
        assert check.stage == "content"
        assert check.missing == frozenset()

    def test_transition_stage_wins_over_approvals(self) -> None:
        template = ContentTemplate.LEGAL_PAGE
        check = check_publishable(
            ContentType.STATIC_PAGE,
            template,
            RevisionStatus.DRAFT,
            slot_data=complete_slots(template),
            decisions=[],
        )
        assert check.ok is False
        assert check.stage == "transition"
        assert check.missing == frozenset()

    def test_approvals_stage_names_what_is_missing(self) -> None:
        template = ContentTemplate.LEGAL_PAGE
        check = check_publishable(
            ContentType.STATIC_PAGE,
            template,
            RevisionStatus.APPROVED,
            slot_data=complete_slots(template),
            decisions=approved(ApprovalCapability.LEGAL),
        )
        assert check.ok is False
        assert check.stage == "approvals"
        assert check.missing == frozenset({ApprovalCapability.BUSINESS})

    def test_a_complete_approved_revision_publishes(self) -> None:
        template = ContentTemplate.LEGAL_PAGE
        check = check_publishable(
            ContentType.STATIC_PAGE,
            template,
            RevisionStatus.APPROVED,
            slot_data=complete_slots(template),
            decisions=approved(ApprovalCapability.LEGAL, ApprovalCapability.BUSINESS),
        )
        assert check.ok is True
        assert check.stage is None

    def test_warnings_do_not_block_but_are_reported(self) -> None:
        template = ContentTemplate.STATIC_INFORMATION
        check = check_publishable(
            ContentType.STATIC_PAGE,
            template,
            RevisionStatus.APPROVED,
            slot_data=complete_slots(template),
            decisions=approved(ApprovalCapability.BUSINESS),
            extra_findings=[finding("warning")],
        )
        assert check.ok is True
        assert len(check.findings) == 1

    def test_a_warning_with_required_approval_blocks_until_signed(self) -> None:
        template = ContentTemplate.STATIC_INFORMATION
        args = (ContentType.STATIC_PAGE, template, RevisionStatus.APPROVED)
        slots = complete_slots(template)
        review_needed = [finding("warning", ApprovalCapability.CLINICAL)]

        blocked = check_publishable(
            *args,
            slot_data=slots,
            decisions=approved(ApprovalCapability.BUSINESS),
            extra_findings=review_needed,
        )
        assert blocked.ok is False
        assert blocked.stage == "approvals"
        assert blocked.missing == frozenset({ApprovalCapability.CLINICAL})

        signed = check_publishable(
            *args,
            slot_data=slots,
            decisions=approved(ApprovalCapability.BUSINESS, ApprovalCapability.CLINICAL),
            extra_findings=review_needed,
        )
        assert signed.ok is True

    def test_server_findings_can_block_even_with_complete_slots(self) -> None:
        template = ContentTemplate.STATIC_INFORMATION
        check = check_publishable(
            ContentType.STATIC_PAGE,
            template,
            RevisionStatus.APPROVED,
            slot_data=complete_slots(template),
            decisions=approved(ApprovalCapability.BUSINESS),
            extra_findings=[finding("error")],
        )
        assert check.ok is False
        assert check.stage == "content"

    def test_a_rejected_decision_does_not_satisfy_a_requirement(self) -> None:
        template = ContentTemplate.STATIC_INFORMATION
        check = check_publishable(
            ContentType.STATIC_PAGE,
            template,
            RevisionStatus.APPROVED,
            slot_data=complete_slots(template),
            decisions=[ReviewDecisionRecord(ApprovalCapability.BUSINESS, ReviewOutcome.REJECTED)],
        )
        assert check.ok is False
        assert check.stage == "approvals"
        assert check.missing == frozenset({ApprovalCapability.BUSINESS})


class TestRequirePublishable:
    def test_rejects_an_invalid_transition(self) -> None:
        with pytest.raises(InvalidRevisionTransitionError):
            require_publishable(
                ContentType.STATIC_PAGE,
                ContentTemplate.STATIC_INFORMATION,
                RevisionStatus.DRAFT,
                decisions=approved(ApprovalCapability.BUSINESS),
            )

    def test_rejects_missing_approvals_and_names_them(self) -> None:
        with pytest.raises(MissingApprovalError, match="business"):
            require_publishable(
                ContentType.STATIC_PAGE,
                ContentTemplate.STATIC_INFORMATION,
                RevisionStatus.APPROVED,
                decisions=[],
            )

    def test_passes_for_an_approved_revision(self) -> None:
        require_publishable(
            ContentType.STATIC_PAGE,
            ContentTemplate.STATIC_INFORMATION,
            RevisionStatus.APPROVED,
            decisions=approved(ApprovalCapability.BUSINESS),
        )
