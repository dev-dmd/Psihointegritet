from collections.abc import Collection
from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator, model_validator
from pydantic.alias_generators import to_camel

from psihointegritet.modules.guidance.matching import (
    GOALS,
    LOCATIONS,
    PARTICIPANTS,
    REASONS,
    WORK_FORMATS,
    MatchCandidate,
    MatchingInput,
    MatchingResult,
)
from psihointegritet.modules.guidance.models import (
    ConsentKind,
    GuardianConsentStatus,
    IntakeCaseStatus,
    IntakeSubmissionKind,
    RequesterRole,
    ReviewPriority,
    SubjectAgeBand,
)


class ApiSchema(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True, extra="forbid")


class IntakeAnswersInput(ApiSchema):
    reason: str | None = Field(default=None, max_length=80)
    participants: str | None = Field(default=None, max_length=80)
    requester_role: RequesterRole = RequesterRole.SELF_ADULT
    subject_age_band: SubjectAgeBand = SubjectAgeBand.ADULT
    prior_therapy: Literal["Da", "Ne"] | None = None
    goal: str | None = Field(default=None, max_length=100)
    format: str | None = Field(default=None, max_length=32)
    location: str | None = Field(default=None, max_length=80)

    @field_validator("reason")
    @classmethod
    def validate_reason(cls, value: str | None) -> str | None:
        return _validate_option(value, REASONS.values(), "reason")

    @field_validator("participants")
    @classmethod
    def validate_participants(cls, value: str | None) -> str | None:
        return _validate_option(value, PARTICIPANTS.values(), "participants")

    @field_validator("goal")
    @classmethod
    def validate_goal(cls, value: str | None) -> str | None:
        return _validate_option(value, GOALS.values(), "goal")

    @field_validator("format")
    @classmethod
    def validate_format(cls, value: str | None) -> str | None:
        return _validate_option(value, WORK_FORMATS.values(), "format")

    @field_validator("location")
    @classmethod
    def validate_location(cls, value: str | None) -> str | None:
        return _validate_option(value, LOCATIONS.values(), "location")

    @model_validator(mode="after")
    def validate_conditional_answers(self) -> IntakeAnswersInput:
        if self.requester_role is RequesterRole.GUARDIAN:
            if self.participants != PARTICIPANTS["parent_child"]:
                raise ValueError("guardian requests require parent-and-child participation")
            if self.subject_age_band is SubjectAgeBand.ADULT:
                raise ValueError("guardian requests require a non-adult subjectAgeBand")
        if self.requester_role is RequesterRole.ADOLESCENT_16_17:
            if self.participants != PARTICIPANTS["alone"]:
                raise ValueError("adolescent requests require individual participation")
            if self.subject_age_band is not SubjectAgeBand.SIXTEEN_TO_SEVENTEEN:
                raise ValueError("adolescent requests require the 16-17 subjectAgeBand")
        if self.requester_role is RequesterRole.SELF_ADULT:
            if self.participants == PARTICIPANTS["parent_child"]:
                raise ValueError("parent-and-child participation requires a guardian requesterRole")
            if self.subject_age_band is not SubjectAgeBand.ADULT:
                raise ValueError("adult self requests require the adult subjectAgeBand")
        if self.requester_role is RequesterRole.INFORMATION_ONLY:
            raise ValueError("information-only paths do not evaluate an Intake match")
        if self.format == WORK_FORMATS["in_person"] and not self.location:
            raise ValueError("location is required for in-person work")
        if self.format != WORK_FORMATS["in_person"] and self.location:
            raise ValueError("location is only allowed for in-person work")
        return self

    def to_matching_input(self) -> MatchingInput:
        return MatchingInput(
            reason=self.reason,
            participants=self.participants,
            requester_role=self.requester_role,
            subject_age_band=self.subject_age_band,
            prior_therapy=self.prior_therapy,
            goal=self.goal,
            format=self.format,
            location=self.location,
        )


class PublicIntakeMatchRequest(ApiSchema):
    answers: IntakeAnswersInput


class PublicServiceRecommendation(ApiSchema):
    slug: str
    name: str
    duration_minutes: int
    price_amount: int
    currency: str


class PublicTherapistRecommendation(ApiSchema):
    slug: str
    display_name: str
    explanation_codes: list[str]
    reasons: list[str]


class PublicIntakeMatchResponse(ApiSchema):
    service: PublicServiceRecommendation
    candidates: list[PublicTherapistRecommendation]
    show_multiple_options: bool
    requires_human_review: bool
    controlled_minor_flow: bool
    online_fallback: bool
    rule_version: str

    @classmethod
    def from_result(cls, result: MatchingResult) -> PublicIntakeMatchResponse:
        return cls(
            service=PublicServiceRecommendation(
                slug=result.service.slug,
                name=result.service.name,
                duration_minutes=result.service.duration_minutes,
                price_amount=result.service.price_amount,
                currency=result.service.currency,
            ),
            candidates=[_public_candidate(candidate) for candidate in result.candidates],
            show_multiple_options=result.show_multiple_options,
            requires_human_review=result.requires_human_review,
            controlled_minor_flow=result.controlled_minor_flow,
            online_fallback=result.online_fallback,
            rule_version=result.rule_version,
        )


class IntakeContactInput(ApiSchema):
    full_name: str = Field(min_length=2, max_length=160)
    email: EmailStr
    phone: str | None = Field(default=None, max_length=80)
    reply_preference: Literal["email", "phone"] = "email"

    @model_validator(mode="after")
    def require_phone_for_phone_reply(self) -> IntakeContactInput:
        if self.reply_preference == "phone" and not self.phone:
            raise ValueError("phone is required when replyPreference is phone")
        return self


class IntakeAcknowledgementInput(ApiSchema):
    kind: ConsentKind
    document_version: str = Field(min_length=1, max_length=80)
    locale: str = Field(default="sr-Latn", min_length=2, max_length=16)


class PublicIntakeSubmissionRequest(ApiSchema):
    submission_kind: IntakeSubmissionKind
    answers: IntakeAnswersInput
    contact: IntakeContactInput
    acknowledgements: list[IntakeAcknowledgementInput] = Field(min_length=2, max_length=4)
    free_text: str | None = Field(default=None, max_length=1000)
    source: Literal["header", "homepage", "service", "therapist", "matching", "manual"] = "matching"
    preferred_therapist_slug: str | None = Field(default=None, max_length=120)
    subject_is_aware: bool | None = None
    guardian_consent_status: GuardianConsentStatus = GuardianConsentStatus.NOT_APPLICABLE

    @model_validator(mode="after")
    def require_mandatory_acknowledgements(self) -> PublicIntakeSubmissionRequest:
        kinds = {item.kind for item in self.acknowledgements}
        mandatory = {
            ConsentKind.INTAKE_DATA_PROCESSING_NOTICE,
            ConsentKind.INTAKE_REQUEST_ACKNOWLEDGEMENT,
        }
        if not mandatory.issubset(kinds):
            raise ValueError("required intake acknowledgements are missing")
        if self.answers.requester_role is RequesterRole.GUARDIAN:
            if self.subject_is_aware is None:
                raise ValueError("subjectIsAware is required for guardian requests")
            if self.guardian_consent_status is GuardianConsentStatus.NOT_APPLICABLE:
                raise ValueError("guardianConsentStatus is required for guardian requests")
            if self.submission_kind is not IntakeSubmissionKind.TEAM_REVIEW:
                raise ValueError("guardian requests require team review")
        elif self.subject_is_aware is not None:
            raise ValueError("subjectIsAware is only allowed for guardian requests")
        elif self.guardian_consent_status is not GuardianConsentStatus.NOT_APPLICABLE:
            raise ValueError("guardianConsentStatus is only allowed for guardian requests")

        if self.answers.requester_role is RequesterRole.ADOLESCENT_16_17:
            if self.submission_kind is not IntakeSubmissionKind.TEAM_REVIEW:
                raise ValueError("adolescent requests require team review")
            if self.free_text:
                raise ValueError("freeText is unavailable for the adolescent review flow")
        return self


class PublicIntakeSubmissionResponse(ApiSchema):
    case_id: UUID
    status: IntakeCaseStatus
    submission_kind: IntakeSubmissionKind
    requires_human_review: bool
    review_priority: ReviewPriority
    replayed: bool


class PublicIntakeCapabilitiesResponse(ApiSchema):
    matching_enabled: bool
    sensitive_submission_enabled: bool


class TeamQueueItem(ApiSchema):
    case_id: UUID
    submission_kind: IntakeSubmissionKind
    service_slug: str | None
    preferred_therapist_slug: str | None
    format: str | None
    location: str | None
    requester_role: RequesterRole
    subject_age_band: SubjectAgeBand
    recommended_therapist_slugs: list[str]
    requires_human_review: bool
    review_priority: ReviewPriority
    review_due_at: datetime | None
    has_free_text: bool
    created_at: datetime


class ClaimIntakeCaseResponse(ApiSchema):
    case_id: UUID
    status: IntakeCaseStatus
    therapist_profile_id: UUID


class ReassignIntakeCaseRequest(ApiSchema):
    therapist_profile_id: UUID
    reason_code: Literal["capacity", "expertise", "availability", "other"]


def _validate_option(value: str | None, options: Collection[str], field: str) -> str | None:
    if value is not None and value not in options:
        raise ValueError(f"Unknown {field} option")
    return value


def _public_candidate(candidate: MatchCandidate) -> PublicTherapistRecommendation:
    return PublicTherapistRecommendation(
        slug=candidate.slug,
        display_name=candidate.display_name,
        explanation_codes=list(candidate.explanation_codes),
        reasons=list(candidate.reasons),
    )
