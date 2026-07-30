import pytest
from pydantic import ValidationError

from psihointegritet.modules.guidance.matching import (
    PARTICIPANTS,
    REASONS,
)
from psihointegritet.modules.guidance.models import IntakeSubmissionKind
from psihointegritet.modules.guidance.schemas import PublicIntakeSubmissionRequest
from psihointegritet.modules.guidance.service import validate_submission_choice


def _submission_payload() -> dict[str, object]:
    return {
        "submissionKind": "team_review",
        "answers": {
            "reason": REASONS["parenting"],
            "participants": PARTICIPANTS["parent_child"],
            "requesterRole": "guardian",
            "subjectAgeBand": "under_12",
            "priorTherapy": "Ne",
            "goal": "Poboljšati odnos sa detetom",
            "format": "Online",
            "location": None,
        },
        "contact": {
            "fullName": "Test Korisnik",
            "email": "test@example.com",
            "phone": None,
            "replyPreference": "email",
        },
        "acknowledgements": [
            {
                "kind": "intake_data_processing_notice",
                "documentVersion": "notice-v1",
                "locale": "sr-Latn",
            },
            {
                "kind": "intake_request_acknowledgement",
                "documentVersion": "request-v1",
                "locale": "sr-Latn",
            },
        ],
        "freeText": None,
        "source": "matching",
        "preferredTherapistSlug": None,
        "subjectIsAware": True,
        "guardianConsentStatus": "confirmed",
    }


def test_guardian_flow_allows_a_short_optional_note() -> None:
    payload = _submission_payload()
    payload["freeText"] = "Kratka napomena za tim."

    request = PublicIntakeSubmissionRequest.model_validate(payload)

    assert request.free_text == "Kratka napomena za tim."


def test_adolescent_flow_rejects_free_text_and_direct_request() -> None:
    payload = _submission_payload()
    payload["answers"] = {
        "reason": REASONS["parenting"],
        "participants": PARTICIPANTS["alone"],
        "requesterRole": "adolescent_16_17",
        "subjectAgeBand": "16_17",
        "priorTherapy": "Ne",
        "goal": "Poboljšati odnos sa detetom",
        "format": "Online",
        "location": None,
    }
    payload["subjectIsAware"] = None
    payload["guardianConsentStatus"] = "not_applicable"
    payload["freeText"] = "Ovo se ne sme prihvatiti u adolescentnom toku."

    with pytest.raises(ValidationError, match="freeText is unavailable"):
        PublicIntakeSubmissionRequest.model_validate(payload)

    payload["freeText"] = None
    payload["submissionKind"] = "request"
    with pytest.raises(ValidationError, match="require team review"):
        PublicIntakeSubmissionRequest.model_validate(payload)


def test_submission_requires_both_mandatory_acknowledgements() -> None:
    payload = _submission_payload()
    payload["acknowledgements"] = [
        {
            "kind": "intake_data_processing_notice",
            "documentVersion": "notice-v1",
            "locale": "sr-Latn",
        },
        {
            "kind": "marketing",
            "documentVersion": "marketing-v1",
            "locale": "sr-Latn",
        },
    ]

    with pytest.raises(ValidationError, match="required intake acknowledgements"):
        PublicIntakeSubmissionRequest.model_validate(payload)


def test_team_review_keeps_a_self_selected_therapist_as_a_non_binding_preference() -> None:
    payload = _submission_payload()
    payload["preferredTherapistSlug"] = "anja-stamenkovic"
    request = PublicIntakeSubmissionRequest.model_validate(payload)

    validate_submission_choice(
        request,
        candidates=(),
        requires_human_review=True,
        effective_submission_kind=IntakeSubmissionKind.TEAM_REVIEW,
    )
