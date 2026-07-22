import hashlib
import json
from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy import case, delete, exists, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from psihointegritet.core.config import Settings
from psihointegritet.modules.guidance.authorization import StaffActor
from psihointegritet.modules.guidance.matching import (
    DEFAULT_PROFILES,
    MatchCandidate,
    MatchingAdapter,
    MatchingResult,
    StaticMatchingAdapter,
    profile_from_entity,
)
from psihointegritet.modules.guidance.models import (
    AcceptanceStatus,
    AssignmentEventType,
    ConsentKind,
    ConsentRecord,
    IntakeAnswer,
    IntakeAssignment,
    IntakeAssignmentEvent,
    IntakeAuditEvent,
    IntakeCase,
    IntakeCaseStatus,
    IntakeContact,
    IntakeFreeText,
    IntakeSubmissionKind,
    PresenceStatus,
    ReviewPriority,
    SubjectAgeBand,
    SubmissionIntent,
    TherapistMatchingProfile,
)
from psihointegritet.modules.guidance.retention import IntakeRetentionPolicy
from psihointegritet.modules.guidance.safety import (
    SAFETY_RULE_VERSION,
    SafetyAssessment,
    assess_free_text,
)
from psihointegritet.modules.guidance.schemas import (
    ClaimIntakeCaseResponse,
    PublicIntakeMatchRequest,
    PublicIntakeMatchResponse,
    PublicIntakeSubmissionRequest,
    PublicIntakeSubmissionResponse,
    ReassignIntakeCaseRequest,
    TeamQueueItem,
)
from psihointegritet.modules.guidance.state_machine import require_transition
from psihointegritet.modules.organizations.models import Organization


class IntakeFeatureDisabledError(RuntimeError):
    """The feature flag intentionally prevents a public sensitive-data action."""


class IntakeConflictError(RuntimeError):
    """An idempotency or concurrent assignment conflict occurred."""


class IntakeValidationError(ValueError):
    """The submitted choice conflicts with deterministic Intake policy."""


class GuidanceService:
    """Application layer for public Intake submission and protected Team Queue actions."""

    def __init__(self, session: AsyncSession, settings: Settings) -> None:
        self._session = session
        self._settings = settings
        self._retention = IntakeRetentionPolicy.from_settings(settings)

    async def evaluate_public_match(
        self, request: PublicIntakeMatchRequest
    ) -> PublicIntakeMatchResponse:
        adapter = await self._matching_adapter()
        answers = request.answers.to_matching_input()
        return PublicIntakeMatchResponse.from_result(adapter.evaluate(answers))

    async def submit_public_case(
        self, request: PublicIntakeSubmissionRequest, idempotency_key: str
    ) -> PublicIntakeSubmissionResponse:
        if not self._settings.intake_submission_ready:
            raise IntakeFeatureDisabledError(
                "Intake submission is not enabled until required text versions are configured"
            )

        fingerprint = _request_fingerprint(request)

        async with self._session.begin():
            organization = await self._organization()
            adapter = await self._matching_adapter()
            matching_result = adapter.evaluate(request.answers.to_matching_input())
            safety_assessment = assess_free_text(request.free_text)
            effective_submission_kind = (
                IntakeSubmissionKind.TEAM_REVIEW
                if safety_assessment.requires_human_review
                else request.submission_kind
            )
            _validate_acknowledgement_versions(request, self._settings)
            validate_submission_choice(
                request,
                matching_result.candidates,
                matching_result.requires_human_review,
                effective_submission_kind,
            )
            existing = await self._find_idempotent_case(organization.id, idempotency_key)
            if existing is not None:
                _assert_same_fingerprint(existing, fingerprint)
                return _submission_response(existing, replayed=True)

            case: IntakeCase | None = None
            try:
                async with self._session.begin_nested():
                    case = self._new_case(
                        organization_id=organization.id,
                        request=request,
                        idempotency_key=idempotency_key,
                        matching_result=matching_result,
                        effective_submission_kind=effective_submission_kind,
                        safety_assessment=safety_assessment,
                        fingerprint=fingerprint,
                    )
                    self._session.add(case)
                    await self._session.flush()
                    self._session.add_all(_case_children(case, request, self._retention))
                    self._session.add(
                        IntakeAuditEvent(
                            organization_id=organization.id,
                            intake_case_id=case.id,
                            actor_user_id=None,
                            event_type="intake_case_submitted",
                            details={
                                "submissionKind": request.submission_kind.value,
                                "effectiveSubmissionKind": effective_submission_kind.value,
                                "source": request.source,
                                "requiresHumanReview": case.requires_human_review,
                                "reviewPriority": case.review_priority.value,
                                "hasFreeText": bool(
                                    request.free_text and request.free_text.strip()
                                ),
                                "hasSafetySignal": safety_assessment.requires_human_review,
                            },
                        )
                    )
                    if safety_assessment.category is not None:
                        self._session.add(
                            IntakeAuditEvent(
                                organization_id=organization.id,
                                intake_case_id=case.id,
                                actor_user_id=None,
                                event_type="intake_safety_signal_detected",
                                details={
                                    "category": safety_assessment.category.value,
                                    "ruleVersion": SAFETY_RULE_VERSION,
                                    "noticeShown": True,
                                },
                            )
                        )
                    await self._session.flush()
            except IntegrityError:
                replayed_case = await self._find_idempotent_case(organization.id, idempotency_key)
                if replayed_case is None:
                    raise
                _assert_same_fingerprint(replayed_case, fingerprint)
                return _submission_response(replayed_case, replayed=True)

        return _submission_response(case, replayed=False)

    async def list_team_queue(self, actor: StaffActor) -> list[TeamQueueItem]:
        if not self._settings.intake_team_queue_enabled:
            raise IntakeFeatureDisabledError("Intake team queue is not enabled")
        has_free_text = exists(
            select(IntakeFreeText.id).where(IntakeFreeText.intake_case_id == IntakeCase.id)
        )
        priority_order = case(
            (IntakeCase.review_priority == ReviewPriority.PRIORITY, 0),
            else_=1,
        )
        rows = (
            await self._session.execute(
                select(IntakeCase, has_free_text.label("has_free_text"))
                .where(
                    IntakeCase.organization_id == actor.organization_id,
                    IntakeCase.status == IntakeCaseStatus.UNASSIGNED,
                )
                .order_by(
                    priority_order,
                    IntakeCase.review_due_at.asc().nullslast(),
                    IntakeCase.created_at.asc(),
                )
            )
        ).all()
        return [
            TeamQueueItem(
                case_id=case.id,
                submission_kind=case.submission_kind,
                service_slug=case.service_slug,
                preferred_therapist_slug=case.preferred_therapist_slug,
                format=case.format,
                location=case.location,
                requester_role=case.requester_role,
                subject_age_band=case.subject_age_band,
                recommended_therapist_slugs=list(case.recommended_therapist_slugs),
                requires_human_review=case.requires_human_review,
                review_priority=case.review_priority,
                review_due_at=case.review_due_at,
                has_free_text=bool(has_text),
                created_at=case.created_at,
            )
            for case, has_text in rows
        ]

    async def claim_case(self, case_id: UUID, actor: StaffActor) -> ClaimIntakeCaseResponse:
        if not self._settings.intake_team_queue_enabled:
            raise IntakeFeatureDisabledError("Intake team queue is not enabled")
        if not actor.is_therapist:
            raise IntakeConflictError("Only a therapist can claim an IntakeCase")

        # The protected route resolves the actor and owns this transaction so
        # membership lookup and the row lock share one atomic boundary.
        case = await self._case_for_update(case_id, actor.organization_id)
        if case.status is not IntakeCaseStatus.UNASSIGNED:
            raise IntakeConflictError("IntakeCase has already been claimed")
        profile = await self._profile_for_actor(actor)
        now = datetime.now(UTC)
        require_transition(case.status, IntakeCaseStatus.CLAIMED)
        case.status = IntakeCaseStatus.CLAIMED
        case.assigned_therapist_profile_id = profile.id
        self._session.add(
            IntakeAssignment(
                intake_case_id=case.id,
                therapist_profile_id=profile.id,
                claimed_by_user_id=actor.user_id,
                claimed_at=now,
            )
        )
        self._session.add_all(
            [
                IntakeAssignmentEvent(
                    intake_case_id=case.id,
                    event_type=AssignmentEventType.CLAIMED,
                    previous_therapist_profile_id=None,
                    next_therapist_profile_id=profile.id,
                    actor_user_id=actor.user_id,
                    reason_code=None,
                ),
                IntakeAuditEvent(
                    organization_id=actor.organization_id,
                    intake_case_id=case.id,
                    actor_user_id=actor.user_id,
                    event_type="intake_case_claimed",
                    details={"therapistProfileId": str(profile.id)},
                ),
            ]
        )

        return ClaimIntakeCaseResponse(
            case_id=case.id, status=case.status, therapist_profile_id=profile.id
        )

    async def reassign_case(
        self, case_id: UUID, actor: StaffActor, request: ReassignIntakeCaseRequest
    ) -> ClaimIntakeCaseResponse:
        if not self._settings.intake_team_queue_enabled:
            raise IntakeFeatureDisabledError("Intake team queue is not enabled")
        if not actor.is_org_admin:
            raise IntakeConflictError("Only an organization admin can reassign an IntakeCase")

        # See claim_case: caller owns the transaction with the RBAC lookup.
        case = await self._case_for_update(case_id, actor.organization_id)
        if case.status is not IntakeCaseStatus.CLAIMED:
            raise IntakeConflictError("Only a claimed IntakeCase can be reassigned")
        assignment = await self._session.scalar(
            select(IntakeAssignment)
            .where(IntakeAssignment.intake_case_id == case.id)
            .with_for_update()
        )
        if assignment is None:
            raise IntakeConflictError("IntakeCase assignment is missing")
        target = await self._session.scalar(
            select(TherapistMatchingProfile).where(
                TherapistMatchingProfile.id == request.therapist_profile_id,
                TherapistMatchingProfile.organization_id == actor.organization_id,
                TherapistMatchingProfile.acceptance_status.is_not(AcceptanceStatus.PAUSED),
                TherapistMatchingProfile.presence_status == PresenceStatus.ACTIVE,
            )
        )
        if target is None:
            raise IntakeValidationError("Target therapist is unavailable")

        previous_profile_id = assignment.therapist_profile_id
        assignment.therapist_profile_id = target.id
        case.assigned_therapist_profile_id = target.id
        self._session.add_all(
            [
                IntakeAssignmentEvent(
                    intake_case_id=case.id,
                    event_type=AssignmentEventType.REASSIGNED,
                    previous_therapist_profile_id=previous_profile_id,
                    next_therapist_profile_id=target.id,
                    actor_user_id=actor.user_id,
                    reason_code=request.reason_code,
                ),
                IntakeAuditEvent(
                    organization_id=actor.organization_id,
                    intake_case_id=case.id,
                    actor_user_id=actor.user_id,
                    event_type="intake_case_reassigned",
                    details={"reasonCode": request.reason_code},
                ),
            ]
        )

        return ClaimIntakeCaseResponse(
            case_id=case.id, status=case.status, therapist_profile_id=target.id
        )

    async def purge_expired_data(self, now: datetime | None = None) -> int:
        """Purges sensitive Intake data while retaining only minimal detached audit evidence."""

        cutoff = now or datetime.now(UTC)
        async with self._session.begin():
            await self._session.execute(
                delete(IntakeFreeText).where(IntakeFreeText.expires_at <= cutoff)
            )
            cases = (
                await self._session.scalars(
                    select(IntakeCase).where(IntakeCase.expires_at <= cutoff).with_for_update()
                )
            ).all()
            for case in cases:
                self._session.add(
                    IntakeAuditEvent(
                        organization_id=case.organization_id,
                        intake_case_id=case.id,
                        actor_user_id=None,
                        event_type="intake_case_retention_purged",
                        details={"retention": "case"},
                    )
                )
                await self._session.delete(case)
        return len(cases)

    async def _organization(self) -> Organization:
        organization = await self._session.scalar(
            select(Organization).where(
                Organization.slug == self._settings.default_organization_slug
            )
        )
        if organization is None:
            raise IntakeValidationError("Default organization is not provisioned")
        return organization

    async def _matching_adapter(self) -> MatchingAdapter:
        organization = await self._organization()
        entities = (
            await self._session.scalars(
                select(TherapistMatchingProfile).where(
                    TherapistMatchingProfile.organization_id == organization.id
                )
            )
        ).all()
        profiles = tuple(profile_from_entity(entity) for entity in entities) or DEFAULT_PROFILES
        return StaticMatchingAdapter(profiles)

    async def _find_idempotent_case(
        self, organization_id: UUID, idempotency_key: str
    ) -> IntakeCase | None:
        return await self._session.scalar(
            select(IntakeCase).where(
                IntakeCase.organization_id == organization_id,
                IntakeCase.idempotency_key == idempotency_key,
            )
        )

    async def _case_for_update(self, case_id: UUID, organization_id: UUID) -> IntakeCase:
        case = await self._session.scalar(
            select(IntakeCase)
            .where(IntakeCase.id == case_id, IntakeCase.organization_id == organization_id)
            .with_for_update()
        )
        if case is None:
            raise IntakeValidationError("IntakeCase was not found")
        return case

    async def _profile_for_actor(self, actor: StaffActor) -> TherapistMatchingProfile:
        profile = await self._session.scalar(
            select(TherapistMatchingProfile).where(
                TherapistMatchingProfile.organization_id == actor.organization_id,
                TherapistMatchingProfile.assigned_user_id == actor.user_id,
                TherapistMatchingProfile.acceptance_status.is_not(AcceptanceStatus.PAUSED),
                TherapistMatchingProfile.presence_status == PresenceStatus.ACTIVE,
            )
        )
        if profile is None:
            raise IntakeConflictError("No active therapist profile is provisioned for this account")
        return profile

    def _new_case(
        self,
        *,
        organization_id: UUID,
        request: PublicIntakeSubmissionRequest,
        idempotency_key: str,
        matching_result: MatchingResult,
        effective_submission_kind: IntakeSubmissionKind,
        safety_assessment: SafetyAssessment,
        fingerprint: str,
    ) -> IntakeCase:
        requires_human_review = (
            matching_result.requires_human_review or safety_assessment.requires_human_review
        )
        is_unpublished_child_scope = request.answers.subject_age_band in {
            SubjectAgeBand.UNDER_12,
            SubjectAgeBand.TWELVE_TO_FIFTEEN,
        }
        return IntakeCase(
            organization_id=organization_id,
            submission_kind=effective_submission_kind,
            submission_intent=(
                SubmissionIntent.TEAM_REVIEW
                if effective_submission_kind is IntakeSubmissionKind.TEAM_REVIEW
                else SubmissionIntent.DIRECT_REQUEST
            ),
            status=IntakeCaseStatus.UNASSIGNED,
            source=request.source,
            service_slug=None if is_unpublished_child_scope else matching_result.service.slug,
            format=request.answers.format,
            location=request.answers.location,
            requester_role=request.answers.requester_role,
            subject_age_band=request.answers.subject_age_band,
            subject_is_aware=request.subject_is_aware,
            guardian_consent_status=request.guardian_consent_status,
            preferred_therapist_slug=request.preferred_therapist_slug,
            recommended_therapist_slugs=[
                candidate.slug for candidate in matching_result.candidates
            ],
            explanation_codes=[
                code
                for candidate in matching_result.candidates
                for code in candidate.explanation_codes
            ],
            matching_rule_version=matching_result.rule_version,
            requires_human_review=requires_human_review,
            review_priority=safety_assessment.review_priority,
            review_due_at=None,
            safety_category=safety_assessment.category,
            safety_notice_shown_at=(
                datetime.now(UTC) if safety_assessment.requires_human_review else None
            ),
            safety_rule_version=(
                SAFETY_RULE_VERSION if safety_assessment.requires_human_review else None
            ),
            idempotency_key=idempotency_key,
            request_fingerprint=fingerprint,
            expires_at=self._retention.submitted_case_expiry(),
        )


def _case_children(
    case: IntakeCase, request: PublicIntakeSubmissionRequest, retention: IntakeRetentionPolicy
) -> list[object]:
    now = datetime.now(UTC)
    children: list[object] = [
        IntakeContact(
            intake_case_id=case.id,
            full_name=request.contact.full_name.strip(),
            email=str(request.contact.email),
            phone=request.contact.phone.strip() if request.contact.phone else None,
            reply_preference=request.contact.reply_preference,
        )
    ]
    children.extend(
        IntakeAnswer(intake_case_id=case.id, key=key, value=value)
        for key, value in request.answers.model_dump(exclude_none=True).items()
    )
    children.extend(
        ConsentRecord(
            intake_case_id=case.id,
            kind=acknowledgement.kind,
            document_version=acknowledgement.document_version,
            locale=acknowledgement.locale,
            granted_at=now,
        )
        for acknowledgement in request.acknowledgements
    )
    if request.free_text and request.free_text.strip():
        children.append(
            IntakeFreeText(
                intake_case_id=case.id,
                text=request.free_text.strip(),
                expires_at=retention.free_text_expiry(now),
            )
        )
    return children


def validate_submission_choice(
    request: PublicIntakeSubmissionRequest,
    candidates: tuple[MatchCandidate, ...],
    requires_human_review: bool,
    effective_submission_kind: IntakeSubmissionKind,
) -> None:
    candidate_slugs = {candidate.slug for candidate in candidates}
    # A direct request must match the deterministic result. A team-review
    # request may retain a self-selected therapist only as a non-binding preference.
    if (
        request.preferred_therapist_slug
        and effective_submission_kind is IntakeSubmissionKind.REQUEST
        and request.preferred_therapist_slug not in candidate_slugs
    ):
        raise IntakeValidationError("Preferred therapist is unavailable for this Intake request")
    if requires_human_review and effective_submission_kind is IntakeSubmissionKind.REQUEST:
        raise IntakeValidationError("This Intake path requires team review")


def _validate_acknowledgement_versions(
    request: PublicIntakeSubmissionRequest, settings: Settings
) -> None:
    expected = {
        ConsentKind.INTAKE_DATA_PROCESSING_NOTICE: settings.intake_data_processing_notice_version,
        ConsentKind.INTAKE_REQUEST_ACKNOWLEDGEMENT: settings.intake_request_acknowledgement_version,
    }
    submitted = {item.kind: item.document_version for item in request.acknowledgements}
    for kind, version in expected.items():
        if submitted.get(kind) != version:
            raise IntakeValidationError("Required Intake acknowledgement version is not current")


def _request_fingerprint(request: PublicIntakeSubmissionRequest) -> str:
    payload = request.model_dump(mode="json")
    serialized = json.dumps(payload, ensure_ascii=False, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(serialized.encode()).hexdigest()


def _assert_same_fingerprint(case: IntakeCase, fingerprint: str) -> None:
    if case.request_fingerprint != fingerprint:
        raise IntakeConflictError("Idempotency key was reused with a different request")


def _submission_response(case: IntakeCase, replayed: bool) -> PublicIntakeSubmissionResponse:
    return PublicIntakeSubmissionResponse(
        case_id=case.id,
        status=case.status,
        submission_kind=case.submission_kind,
        requires_human_review=case.requires_human_review,
        review_priority=case.review_priority,
        replayed=replayed,
    )
