import json
from dataclasses import replace
from pathlib import Path

from psihointegritet.modules.guidance.matching import (
    DEFAULT_PROFILES,
    GOALS,
    PARTICIPANTS,
    REASONS,
    WORK_FORMATS,
    MatchingInput,
    StaticMatchingAdapter,
)
from psihointegritet.modules.guidance.models import (
    AcceptanceStatus,
    RequesterRole,
    SubjectAgeBand,
)
from psihointegritet.modules.guidance.taxonomy import (
    ADDICTION_RELATED_SUPPORT,
    SUPPORT_AREA_IDS,
    SUPPORT_AREA_LABELS,
    SupportAreaId,
)

TAXONOMY_FIXTURE = json.loads(
    (Path(__file__).resolve().parents[3] / "contracts" / "fixtures" / "taxonomy.v1.json").read_text(
        encoding="utf-8"
    )
)


def test_partner_path_returns_couples_service_and_equal_candidates() -> None:
    result = StaticMatchingAdapter().evaluate(
        MatchingInput(
            reason=REASONS["partner_relationship"],
            participants=PARTICIPANTS["partner"],
            goal=GOALS["improve_partner"],
            format=WORK_FORMATS["online"],
        )
    )

    assert result.service.slug == "bracno-savetovanje"
    assert [candidate.slug for candidate in result.candidates[:2]] == [
        "maria-bullock",
        "john-francis",
    ]
    assert result.show_multiple_options is True
    assert result.requires_human_review is False


def test_addiction_prioritizes_maria_and_preserves_team_handoff_contract() -> None:
    result = StaticMatchingAdapter().evaluate(
        MatchingInput(
            reason=REASONS["addiction"],
            participants=PARTICIPANTS["alone"],
            goal=GOALS["concrete_situation"],
            format=WORK_FORMATS["online"],
        )
    )

    assert result.candidates[0].slug == "maria-bullock"
    assert ADDICTION_RELATED_SUPPORT in DEFAULT_PROFILES[0].service_capabilities
    assert TAXONOMY_FIXTURE["specialties"] == [
        {
            "id": ADDICTION_RELATED_SUPPORT,
            "label": "Zavisnost",
            "primaryTherapistSlugs": ["maria-bullock"],
            "handoffAllowed": True,
        }
    ]


def test_support_area_registry_matches_the_shared_fixture() -> None:
    expected = [
        {"id": area, "label": SUPPORT_AREA_LABELS[SupportAreaId(area)]} for area in SUPPORT_AREA_IDS
    ]

    assert TAXONOMY_FIXTURE["supportAreas"] == expected


def test_under_sixteen_path_is_controlled_without_publishing_a_service_candidate() -> None:
    result = StaticMatchingAdapter().evaluate(
        MatchingInput(
            reason=REASONS["parenting"],
            participants=PARTICIPANTS["parent_child"],
            requester_role=RequesterRole.GUARDIAN,
            subject_age_band=SubjectAgeBand.UNDER_12,
            goal=GOALS["improve_child"],
            format=WORK_FORMATS["online"],
        )
    )

    assert result.candidates == ()
    assert result.controlled_minor_flow is True
    assert result.requires_human_review is True


def test_adolescent_path_can_suggest_a_profile_but_requires_human_review() -> None:
    result = StaticMatchingAdapter().evaluate(
        MatchingInput(
            reason=REASONS["adolescent"],
            participants=PARTICIPANTS["alone"],
            requester_role=RequesterRole.ADOLESCENT_16_17,
            subject_age_band=SubjectAgeBand.SIXTEEN_TO_SEVENTEEN,
            goal=GOALS["emotions"],
            format=WORK_FORMATS["online"],
        )
    )

    assert result.candidates
    assert result.controlled_minor_flow is True
    assert result.requires_human_review is True


def test_john_is_eligible_for_confirmed_parenting_support_from_age_sixteen() -> None:
    result = StaticMatchingAdapter().evaluate(
        MatchingInput(
            reason=REASONS["parenting"],
            participants=PARTICIPANTS["parent_child"],
            requester_role=RequesterRole.GUARDIAN,
            subject_age_band=SubjectAgeBand.SIXTEEN_TO_SEVENTEEN,
            goal=GOALS["improve_child"],
            format=WORK_FORMATS["online"],
        )
    )

    assert "john-francis" in [candidate.slug for candidate in result.candidates]
    assert result.requires_human_review is True


def test_paused_profile_is_a_hard_matching_gate() -> None:
    profiles = tuple(
        replace(profile, acceptance_status=AcceptanceStatus.PAUSED)
        if profile.slug == "maria-bullock"
        else profile
        for profile in DEFAULT_PROFILES
    )

    result = StaticMatchingAdapter(profiles).evaluate(
        MatchingInput(
            reason=REASONS["burnout"],
            participants=PARTICIPANTS["alone"],
            goal=GOALS["stress"],
            format=WORK_FORMATS["online"],
        )
    )

    assert "maria-bullock" not in [candidate.slug for candidate in result.candidates]


def test_no_eligible_profile_falls_back_to_team_review() -> None:
    paused_profiles = tuple(
        replace(profile, acceptance_status=AcceptanceStatus.PAUSED) for profile in DEFAULT_PROFILES
    )

    result = StaticMatchingAdapter(paused_profiles).evaluate(
        MatchingInput(
            reason=REASONS["anxiety"],
            participants=PARTICIPANTS["alone"],
            goal=GOALS["emotions"],
            format=WORK_FORMATS["online"],
        )
    )

    assert result.candidates == ()
    assert result.requires_human_review is True
