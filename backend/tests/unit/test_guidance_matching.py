from dataclasses import replace

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
        "anja-stamenkovic",
        "marjan-jankovic",
    ]
    assert result.show_multiple_options is True
    assert result.requires_human_review is False


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


def test_marjan_is_eligible_for_confirmed_parenting_support_from_age_sixteen() -> None:
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

    assert "marjan-jankovic" in [candidate.slug for candidate in result.candidates]
    assert result.requires_human_review is True


def test_paused_profile_is_a_hard_matching_gate() -> None:
    profiles = tuple(
        replace(profile, acceptance_status=AcceptanceStatus.PAUSED)
        if profile.slug == "anja-stamenkovic"
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

    assert "anja-stamenkovic" not in [candidate.slug for candidate in result.candidates]


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
