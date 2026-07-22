"""Deterministic, explainable Intake matching owned by the backend domain."""

from collections.abc import Sequence
from dataclasses import dataclass
from typing import Protocol

from psihointegritet.modules.guidance.models import (
    AcceptanceStatus,
    PresenceStatus,
    RequesterRole,
    SubjectAgeBand,
    TherapistMatchingProfile,
)

RULE_VERSION = "intake-matching-v2"

ANJA = "anja-stamenkovic"
MARIJA = "marija-stamenkovic"
MARJAN = "marjan-jankovic"
PROFILE_ORDER = (ANJA, MARIJA, MARJAN)

REASONS = {
    "anxiety": "Anksioznost",
    "depression": "Depresivno raspoloženje",
    "partner_relationship": "Partnerski odnos",
    "marital_problems": "Bračni problemi",
    "parenting": "Roditeljstvo",
    "adolescent": "Odnos sa adolescentom",
    "burnout": "Burnout",
    "grief": "Gubitak ili žalovanje",
    "self_esteem": "Samopouzdanje",
    "personal_growth": "Lični razvoj",
    "trauma": "Trauma",
    "unsure": "Ne znam tačno, želim razgovor",
    "other": "Drugo",
}

PARTICIPANTS = {
    "alone": "Sam/a",
    "partner": "Partner i ja",
    "parent_child": "Roditelj i dete",
    "unsure": "Nisam siguran/na",
}

GOALS = {
    "understand_self": "Razumeti sebe",
    "emotions": "Naučiti kako da se nosim sa emocijama",
    "improve_partner": "Poboljšati partnerski odnos",
    "improve_child": "Poboljšati odnos sa detetom",
    "stress": "Prevazići stres",
    "concrete_situation": "Razrešiti konkretnu životnu situaciju",
    "unsure": "Nisam siguran/na",
}

WORK_FORMATS = {"online": "Online", "in_person": "Uživo", "any": "Svejedno"}
LOCATIONS = {"nis": "Niš", "leskovac": "Leskovac", "other": "Druga lokacija"}
SUBJECT_AGE_BANDS = {
    SubjectAgeBand.UNDER_12: "Mlađe od 12 godina",
    SubjectAgeBand.TWELVE_TO_FIFTEEN: "12–15 godina",  # noqa: RUF001 - public option parity
    SubjectAgeBand.SIXTEEN_TO_SEVENTEEN: "16–17 godina",  # noqa: RUF001
    SubjectAgeBand.ADULT: "18 i više",
}
SERVICE_CAPABILITIES = {
    "individualna-psihoterapija": "individual_therapy",
    "bracno-savetovanje": "marital_counseling",
    "roditeljsko-savetovanje": "parenting_support",
}


@dataclass(frozen=True, slots=True)
class MatchingInput:
    reason: str | None = None
    participants: str | None = None
    requester_role: RequesterRole = RequesterRole.SELF_ADULT
    subject_age_band: SubjectAgeBand = SubjectAgeBand.ADULT
    prior_therapy: str | None = None
    goal: str | None = None
    format: str | None = None
    location: str | None = None


@dataclass(frozen=True, slots=True)
class ServiceRecommendation:
    slug: str
    name: str
    duration_minutes: int
    price_amount: int
    currency: str = "RSD"


@dataclass(frozen=True, slots=True)
class MatchingProfile:
    slug: str
    display_name: str
    areas: tuple[str, ...]
    services: tuple[str, ...]
    service_capabilities: tuple[str, ...]
    accepted_age_bands: tuple[SubjectAgeBand, ...]
    supported_formats: tuple[str, ...]
    locations: tuple[str, ...]
    acceptance_status: AcceptanceStatus = AcceptanceStatus.ACCEPTING
    presence_status: PresenceStatus = PresenceStatus.ACTIVE


@dataclass(frozen=True, slots=True)
class MatchCandidate:
    slug: str
    display_name: str
    explanation_codes: tuple[str, ...]
    reasons: tuple[str, ...]
    ranking_score: int


@dataclass(frozen=True, slots=True)
class MatchingResult:
    service: ServiceRecommendation
    candidates: tuple[MatchCandidate, ...]
    show_multiple_options: bool
    requires_human_review: bool
    controlled_minor_flow: bool
    online_fallback: bool
    rule_version: str = RULE_VERSION


class MatchingAdapter(Protocol):
    def evaluate(self, input: MatchingInput) -> MatchingResult: ...


SERVICES = {
    "individualna-psihoterapija": ServiceRecommendation(
        slug="individualna-psihoterapija",
        name="Individualna psihoterapija",
        duration_minutes=60,
        price_amount=4000,
    ),
    "bracno-savetovanje": ServiceRecommendation(
        slug="bracno-savetovanje",
        name="Bračno savetovanje",
        duration_minutes=90,
        price_amount=5500,
    ),
    "roditeljsko-savetovanje": ServiceRecommendation(
        slug="roditeljsko-savetovanje",
        name="Roditeljsko savetovanje",
        duration_minutes=60,
        price_amount=5000,
    ),
}

DEFAULT_PROFILES = (
    MatchingProfile(
        slug=ANJA,
        display_name="Anja Stamenković",
        areas=(
            "individualna psihoterapija",
            "bračno savetovanje",
            "burnout",
            "emocionalni razvoj",
            "lični razvoj",
            "zavisnost",
            "trauma",
            "gubitak i žalovanje",
            "anksioznost",
            "roditeljsko savetovanje",
            "samopouzdanje",
        ),
        services=(
            "individualna-psihoterapija",
            "bracno-savetovanje",
            "roditeljsko-savetovanje",
        ),
        service_capabilities=(
            "individual_therapy",
            "marital_counseling",
            "parenting_support",
            "adolescent_support_16_plus",
            "addiction_related_support",
        ),
        accepted_age_bands=(
            SubjectAgeBand.SIXTEEN_TO_SEVENTEEN,
            SubjectAgeBand.ADULT,
        ),
        supported_formats=("online", "in_person"),
        locations=("Niš",),
    ),
    MatchingProfile(
        slug=MARIJA,
        display_name="Marija Stamenković",
        areas=(
            "individualna psihoterapija",
            "razvoj dece",
            "vaspitni izazovi",
            "adolescenti",
            "porodični odnosi",
            "lični razvoj",
            "emocionalni razvoj",
            "anksioznost",
            "depresivno raspoloženje",
            "roditeljstvo",
        ),
        services=("individualna-psihoterapija", "roditeljsko-savetovanje"),
        service_capabilities=(
            "individual_therapy",
            "parenting_support",
            "children_and_adolescents_pending",
        ),
        accepted_age_bands=(
            SubjectAgeBand.UNDER_12,
            SubjectAgeBand.TWELVE_TO_FIFTEEN,
            SubjectAgeBand.SIXTEEN_TO_SEVENTEEN,
            SubjectAgeBand.ADULT,
        ),
        supported_formats=("online", "in_person"),
        locations=("Leskovac",),
    ),
    MatchingProfile(
        slug=MARJAN,
        display_name="Marjan Janković",
        areas=(
            "individualna psihoterapija",
            "bračno savetovanje",
            "podrška zaposlenima",
            "trauma",
            "anksioznost",
            "depresivno raspoloženje",
            "lični razvoj",
            "gubitak i žalovanje",
            "konkretne životne situacije",
        ),
        services=(
            "individualna-psihoterapija",
            "bracno-savetovanje",
            "roditeljsko-savetovanje",
        ),
        service_capabilities=(
            "individual_therapy",
            "marital_counseling",
            "parenting_support",
            "adolescent_support_16_plus",
        ),
        accepted_age_bands=(
            SubjectAgeBand.SIXTEEN_TO_SEVENTEEN,
            SubjectAgeBand.ADULT,
        ),
        supported_formats=("online", "in_person"),
        locations=("Leskovac",),
    ),
)

WeightMap = dict[str, int]
WeightTable = dict[str, WeightMap]

REASON_WEIGHTS: WeightTable = {
    REASONS["anxiety"]: {ANJA: 3, MARIJA: 3, MARJAN: 3},
    REASONS["depression"]: {MARIJA: 4, MARJAN: 4},
    REASONS["partner_relationship"]: {ANJA: 5, MARJAN: 5},
    REASONS["marital_problems"]: {ANJA: 5, MARJAN: 5},
    REASONS["parenting"]: {ANJA: 4, MARIJA: 4},
    REASONS["adolescent"]: {MARIJA: 6},
    REASONS["burnout"]: {ANJA: 6},
    REASONS["grief"]: {ANJA: 5, MARJAN: 5},
    REASONS["self_esteem"]: {ANJA: 5, MARIJA: 2, MARJAN: 2},
    REASONS["personal_growth"]: {ANJA: 3, MARIJA: 3, MARJAN: 3},
    REASONS["trauma"]: {ANJA: 5, MARJAN: 5},
    REASONS["unsure"]: {ANJA: 1, MARIJA: 1, MARJAN: 1},
    REASONS["other"]: {ANJA: 1, MARIJA: 1, MARJAN: 1},
}
PARTICIPANT_WEIGHTS: WeightTable = {
    PARTICIPANTS["alone"]: {ANJA: 1, MARIJA: 1, MARJAN: 1},
    PARTICIPANTS["partner"]: {ANJA: 6, MARJAN: 6},
    PARTICIPANTS["parent_child"]: {MARIJA: 6, ANJA: 2},
    PARTICIPANTS["unsure"]: {ANJA: 1, MARIJA: 1, MARJAN: 1},
}
GOAL_WEIGHTS: WeightTable = {
    GOALS["understand_self"]: {ANJA: 3, MARIJA: 2, MARJAN: 2},
    GOALS["emotions"]: {ANJA: 4, MARIJA: 4, MARJAN: 2},
    GOALS["improve_partner"]: {ANJA: 6, MARJAN: 6},
    GOALS["improve_child"]: {MARIJA: 6, ANJA: 3},
    GOALS["stress"]: {ANJA: 4, MARJAN: 4, MARIJA: 2},
    GOALS["concrete_situation"]: {MARJAN: 5, ANJA: 2, MARIJA: 2},
    GOALS["unsure"]: {ANJA: 1, MARIJA: 1, MARJAN: 1},
}

REASON_SENTENCES: dict[str, str] = {
    REASONS["anxiety"]: "Radi sa temom anksioznosti.",
    REASONS["depression"]: "Radi sa temom depresivnog raspoloženja.",
    REASONS["partner_relationship"]: "Radi sa parovima i partnerskim temama.",
    REASONS["marital_problems"]: "Radi sa parovima i partnerskim temama.",
    REASONS["parenting"]: "Radi sa temama roditeljstva.",
    REASONS["adolescent"]: "Radi sa adolescentima i porodičnim odnosima.",
    REASONS["burnout"]: "Radi sa temama burnouta i stresa.",
    REASONS["grief"]: "Radi sa temama gubitka i žalovanja.",
    REASONS["self_esteem"]: "Radi sa temama samopouzdanja.",
    REASONS["personal_growth"]: "Radi sa temama ličnog razvoja.",
    REASONS["trauma"]: "Radi sa temom traume.",
}
REASON_AREAS: dict[str, tuple[str, ...]] = {
    REASONS["anxiety"]: ("anksioznost",),
    REASONS["depression"]: ("depresivno raspoloženje",),
    REASONS["partner_relationship"]: ("bračno savetovanje",),
    REASONS["marital_problems"]: ("bračno savetovanje",),
    REASONS["parenting"]: ("roditeljsko savetovanje", "roditeljstvo"),
    REASONS["adolescent"]: ("adolescenti",),
    REASONS["burnout"]: ("burnout",),
    REASONS["grief"]: ("gubitak i žalovanje",),
    REASONS["self_esteem"]: ("samopouzdanje",),
    REASONS["personal_growth"]: ("lični razvoj",),
    REASONS["trauma"]: ("trauma",),
}


def profile_from_entity(entity: TherapistMatchingProfile) -> MatchingProfile:
    """Translate persistence settings into the stable MatchingAdapter input."""

    return MatchingProfile(
        slug=entity.slug,
        display_name=entity.display_name,
        areas=tuple(entity.areas),
        services=tuple(entity.services),
        service_capabilities=tuple(entity.service_capabilities),
        accepted_age_bands=tuple(SubjectAgeBand(value) for value in entity.accepted_age_bands),
        supported_formats=tuple(entity.supported_formats),
        locations=tuple(entity.locations),
        acceptance_status=entity.acceptance_status,
        presence_status=entity.presence_status,
    )


class StaticMatchingAdapter:
    """Reference adapter used until matching profiles are configured in the team panel."""

    def __init__(self, profiles: Sequence[MatchingProfile] = DEFAULT_PROFILES) -> None:
        self._profiles = tuple(profiles)

    def evaluate(self, input: MatchingInput) -> MatchingResult:
        service = _recommend_service(input)
        scores = {profile.slug: 0 for profile in self._profiles}
        _apply_weights(scores, REASON_WEIGHTS.get(input.reason or "", {}))
        _apply_weights(scores, PARTICIPANT_WEIGHTS.get(input.participants or "", {}))
        _apply_weights(scores, GOAL_WEIGHTS.get(input.goal or "", {}))

        if (
            input.reason == REASONS["adolescent"]
            and input.participants == PARTICIPANTS["parent_child"]
        ):
            scores[MARIJA] = scores.get(MARIJA, 0) + 3

        profiles = _eligible_profiles(self._profiles, service.slug)
        profiles, online_fallback = _apply_format_and_age_constraints(profiles, input)

        for profile in profiles:
            if profile.acceptance_status is AcceptanceStatus.LIMITED:
                scores[profile.slug] -= 1

        ranked = sorted(
            profiles,
            key=lambda profile: (-scores.get(profile.slug, 0), _profile_order(profile.slug)),
        )
        controlled_minor_flow = _is_controlled_minor_flow(input)
        is_unpublished_child_scope = input.subject_age_band in {
            SubjectAgeBand.UNDER_12,
            SubjectAgeBand.TWELVE_TO_FIFTEEN,
        }
        candidates = (
            tuple(
                _candidate(profile, input, service, scores.get(profile.slug, 0))
                for profile in ranked[:3]
            )
            if not is_unpublished_child_scope
            else ()
        )
        show_multiple_options = (
            len(candidates) > 1 and candidates[0].ranking_score - candidates[1].ranking_score < 3
        )
        required_fields_present = bool(
            input.reason and input.participants and input.goal and input.format
        )
        requires_human_review = (
            not required_fields_present
            or input.reason == REASONS["other"]
            or controlled_minor_flow
            or not candidates
        )
        return MatchingResult(
            service=service,
            candidates=candidates,
            show_multiple_options=show_multiple_options,
            requires_human_review=requires_human_review,
            controlled_minor_flow=controlled_minor_flow,
            online_fallback=online_fallback,
        )


def _recommend_service(input: MatchingInput) -> ServiceRecommendation:
    if input.participants == PARTICIPANTS["partner"]:
        return SERVICES["bracno-savetovanje"]
    if input.participants == PARTICIPANTS["parent_child"] or input.reason in {
        REASONS["parenting"],
    } or (
        input.reason == REASONS["adolescent"]
        and input.requester_role is RequesterRole.GUARDIAN
    ):
        return SERVICES["roditeljsko-savetovanje"]
    return SERVICES["individualna-psihoterapija"]


def _apply_weights(scores: dict[str, int], weights: WeightMap) -> None:
    for slug, weight in weights.items():
        if slug in scores:
            scores[slug] += weight


def _eligible_profiles(
    profiles: Sequence[MatchingProfile], service_slug: str
) -> list[MatchingProfile]:
    required_capability = SERVICE_CAPABILITIES[service_slug]
    return [
        profile
        for profile in profiles
        if profile.acceptance_status is not AcceptanceStatus.PAUSED
        and profile.presence_status is PresenceStatus.ACTIVE
        and service_slug in profile.services
        and required_capability in profile.service_capabilities
    ]


def _apply_format_and_age_constraints(
    profiles: list[MatchingProfile], input: MatchingInput
) -> tuple[list[MatchingProfile], bool]:
    online_fallback = False
    eligible = profiles

    if input.format == WORK_FORMATS["online"]:
        eligible = [profile for profile in eligible if "online" in profile.supported_formats]
    elif input.format == WORK_FORMATS["in_person"]:
        city = input.location
        if city in {LOCATIONS["nis"], LOCATIONS["leskovac"]}:
            in_city = [
                profile
                for profile in eligible
                if "in_person" in profile.supported_formats and city in profile.locations
            ]
            if in_city:
                eligible = in_city
            else:
                eligible = [
                    profile for profile in eligible if "online" in profile.supported_formats
                ]
                online_fallback = True
        elif city == LOCATIONS["other"]:
            eligible = [profile for profile in eligible if "online" in profile.supported_formats]
            online_fallback = True

    if input.subject_age_band is not SubjectAgeBand.ADULT:
        age_eligible = [
            profile for profile in eligible if input.subject_age_band in profile.accepted_age_bands
        ]
        if age_eligible:
            eligible = age_eligible
        else:
            eligible = [
                profile
                for profile in profiles
                if input.subject_age_band in profile.accepted_age_bands
                and "online" in profile.supported_formats
            ]
            online_fallback = True

    return eligible, online_fallback


def _candidate(
    profile: MatchingProfile, input: MatchingInput, service: ServiceRecommendation, score: int
) -> MatchCandidate:
    explanation_codes: list[str] = []
    reasons: list[str] = []
    areas = REASON_AREAS.get(input.reason or "", ())
    sentence = REASON_SENTENCES.get(input.reason or "")
    if sentence and any(area in profile.areas for area in areas):
        explanation_codes.append(f"topic:{input.reason}")
        reasons.append(sentence)

    explanation_codes.append(f"service:{service.slug}")
    reasons.append(f"Pruža {service.name.lower()}.")

    if input.format == WORK_FORMATS["in_person"] and input.location in profile.locations:
        explanation_codes.append(f"location:{input.location}")
        reasons.append("Dostupan/a je za rad uživo na izabranoj lokaciji.")
    else:
        explanation_codes.append("format:online")
        reasons.append("Dostupan/a je za online rad.")

    return MatchCandidate(
        slug=profile.slug,
        display_name=profile.display_name,
        explanation_codes=tuple(explanation_codes[:3]),
        reasons=tuple(reasons[:3]),
        ranking_score=score,
    )


def _is_controlled_minor_flow(input: MatchingInput) -> bool:
    return (
        input.requester_role
        in {
            RequesterRole.GUARDIAN,
            RequesterRole.ADOLESCENT_16_17,
        }
        and input.subject_age_band is not SubjectAgeBand.ADULT
    )


def _profile_order(slug: str) -> int:
    try:
        return PROFILE_ORDER.index(slug)
    except ValueError:
        return len(PROFILE_ORDER)
