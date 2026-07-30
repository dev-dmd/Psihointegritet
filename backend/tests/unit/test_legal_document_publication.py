import pytest

from psihointegritet.modules.privacy.models import (
    ApprovalCapability,
    LegalDocumentKind,
    RevisionStatus,
)
from psihointegritet.modules.privacy.publication import (
    CONSENT_GATE_KINDS,
    CannotDeleteRevisionError,
    InvalidRevisionTransitionError,
    MissingApprovalError,
    can_delete,
    can_transition,
    check_publishable,
    granted_capabilities,
    intake_gate_open,
    missing_approvals,
    require_deletable,
    require_publishable,
    require_transition,
)
from psihointegritet.shared.domain.rich_doc import ParagraphBlock, RichDoc, Span


def approval(capability: ApprovalCapability) -> dict[str, str]:
    return {
        "capability": capability.value,
        "approver": "anja",
        "approved_at": "2026-07-26T10:00:00+02:00",
    }


FULL_CONSENT_APPROVALS = [
    approval(ApprovalCapability.LEGAL),
    approval(ApprovalCapability.CLINICAL),
    approval(ApprovalCapability.BUSINESS),
]


def test_documented_lifecycle_path_is_allowed() -> None:
    require_transition(RevisionStatus.DRAFT, RevisionStatus.IN_REVIEW)
    require_transition(RevisionStatus.IN_REVIEW, RevisionStatus.APPROVED)
    require_transition(RevisionStatus.APPROVED, RevisionStatus.PUBLISHED)
    require_transition(RevisionStatus.PUBLISHED, RevisionStatus.ARCHIVED)


def test_documented_returns_to_draft_are_allowed() -> None:
    assert can_transition(RevisionStatus.IN_REVIEW, RevisionStatus.DRAFT) is True
    assert can_transition(RevisionStatus.APPROVED, RevisionStatus.DRAFT) is True
    assert can_transition(RevisionStatus.ARCHIVED, RevisionStatus.DRAFT) is True


def test_draft_cannot_skip_review_and_publish_directly() -> None:
    assert can_transition(RevisionStatus.DRAFT, RevisionStatus.PUBLISHED) is False
    with pytest.raises(InvalidRevisionTransitionError):
        require_transition(RevisionStatus.DRAFT, RevisionStatus.PUBLISHED)


def test_published_revision_cannot_return_to_draft() -> None:
    assert can_transition(RevisionStatus.PUBLISHED, RevisionStatus.DRAFT) is False


def test_consent_document_needs_all_three_approvals_to_publish() -> None:
    kind = LegalDocumentKind.INTAKE_DATA_PROCESSING_NOTICE
    only_legal = [approval(ApprovalCapability.LEGAL)]

    assert missing_approvals(kind, only_legal) == frozenset(
        {ApprovalCapability.CLINICAL, ApprovalCapability.BUSINESS}
    )
    with pytest.raises(MissingApprovalError):
        require_publishable(kind, RevisionStatus.APPROVED, only_legal)

    require_publishable(kind, RevisionStatus.APPROVED, FULL_CONSENT_APPROVALS)


def test_approved_transition_alone_does_not_bypass_missing_evidence() -> None:
    with pytest.raises(MissingApprovalError):
        require_publishable(
            LegalDocumentKind.INTAKE_REQUEST_ACKNOWLEDGEMENT, RevisionStatus.APPROVED, []
        )


def test_full_approvals_do_not_bypass_an_invalid_transition() -> None:
    with pytest.raises(InvalidRevisionTransitionError):
        require_publishable(
            LegalDocumentKind.INTAKE_DATA_PROCESSING_NOTICE,
            RevisionStatus.DRAFT,
            FULL_CONSENT_APPROVALS,
        )


def test_unknown_capability_values_are_ignored_rather_than_trusted() -> None:
    evidence = [{"capability": "marketing"}, approval(ApprovalCapability.LEGAL)]
    assert granted_capabilities(evidence) == frozenset({ApprovalCapability.LEGAL})


def test_booking_rules_need_legal_and_business_but_not_clinical() -> None:
    kind = LegalDocumentKind.BOOKING_RULES
    evidence = [approval(ApprovalCapability.LEGAL), approval(ApprovalCapability.BUSINESS)]
    assert missing_approvals(kind, evidence) == frozenset()


def test_every_kind_declares_required_approvals() -> None:
    for kind in LegalDocumentKind:
        assert missing_approvals(kind, []) != frozenset(), f"{kind} would publish unapproved"


def test_consent_gate_covers_exactly_the_two_intake_texts() -> None:
    assert sorted(kind.value for kind in CONSENT_GATE_KINDS) == [
        "intake_data_processing_notice",
        "intake_request_acknowledgement",
    ]


@pytest.mark.parametrize(
    "status",
    [
        RevisionStatus.IN_REVIEW,
        RevisionStatus.APPROVED,
        RevisionStatus.PUBLISHED,
        RevisionStatus.ARCHIVED,
    ],
)
def test_only_drafts_are_deletable(status: RevisionStatus) -> None:
    assert can_delete(status) is False
    with pytest.raises(CannotDeleteRevisionError):
        require_deletable(status)


def test_draft_revision_can_be_deleted() -> None:
    assert can_delete(RevisionStatus.DRAFT) is True
    require_deletable(RevisionStatus.DRAFT)


EMPTY_BODY = RichDoc()
VALID_BODY = RichDoc(
    blocks=(
        ParagraphBlock(
            id="p1",
            spans=(
                Span(text=("Tekst koji je dovoljno dugačak da prođe minimalnu proveru sadržaja.")),
            ),
        ),
    )
)


def test_check_publishable_reports_content_stage_first() -> None:
    # Broken content + wrong status + no approvals: content wins (A.4).
    check = check_publishable(
        LegalDocumentKind.INTAKE_DATA_PROCESSING_NOTICE,
        RevisionStatus.DRAFT,
        title="",
        slug="Ne Valja!",
        body=EMPTY_BODY,
        approvals=[],
    )
    assert check.ok is False
    assert check.stage == "content"
    assert check.content_problems == ("empty_title", "invalid_slug", "body_too_short")
    assert check.missing == frozenset()


def test_check_publishable_reports_transition_before_approvals() -> None:
    check = check_publishable(
        LegalDocumentKind.INTAKE_DATA_PROCESSING_NOTICE,
        RevisionStatus.DRAFT,
        title="Obaveštenje o obradi podataka",
        slug="obavestenje-o-obradi-podataka",
        body=VALID_BODY,
        approvals=[],
    )
    assert check.ok is False
    assert check.stage == "transition"
    assert check.missing == frozenset()


def test_check_publishable_reports_missing_approvals_last() -> None:
    check = check_publishable(
        LegalDocumentKind.INTAKE_DATA_PROCESSING_NOTICE,
        RevisionStatus.APPROVED,
        title="Obaveštenje o obradi podataka",
        slug="obavestenje-o-obradi-podataka",
        body=VALID_BODY,
        approvals=[{"capability": "legal"}],
    )
    assert check.ok is False
    assert check.stage == "approvals"
    assert check.missing == frozenset({ApprovalCapability.CLINICAL, ApprovalCapability.BUSINESS})


def test_check_publishable_passes_a_complete_approved_revision() -> None:
    check = check_publishable(
        LegalDocumentKind.BOOKING_RULES,
        RevisionStatus.APPROVED,
        title="Pravila zakazivanja",
        slug="pravila-zakazivanja",
        body=VALID_BODY,
        approvals=[{"capability": "legal"}, {"capability": "business"}],
    )
    assert check.ok is True
    assert check.stage is None


def test_intake_gate_opens_only_with_both_texts_published() -> None:
    assert intake_gate_open([]) is False
    assert intake_gate_open([LegalDocumentKind.INTAKE_DATA_PROCESSING_NOTICE]) is False
    assert (
        intake_gate_open(
            [
                LegalDocumentKind.INTAKE_DATA_PROCESSING_NOTICE,
                LegalDocumentKind.INTAKE_REQUEST_ACKNOWLEDGEMENT,
            ]
        )
        is True
    )


def test_archiving_a_required_text_closes_the_gate() -> None:
    # Contract A.1: once the acknowledgement is archived, only the notice
    # remains published and the gate must read closed.
    remaining_published = [LegalDocumentKind.INTAKE_DATA_PROCESSING_NOTICE]
    assert intake_gate_open(remaining_published) is False
