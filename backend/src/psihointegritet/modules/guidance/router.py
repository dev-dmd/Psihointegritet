from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Header, HTTPException, status

from psihointegritet.api.dependencies import AppSettings, CurrentIdentity, DatabaseSession
from psihointegritet.modules.guidance.authorization import (
    IntakeAuthorizationError,
    StaffActor,
    resolve_staff_actor,
)
from psihointegritet.modules.guidance.schemas import (
    ClaimIntakeCaseResponse,
    PublicIntakeCapabilitiesResponse,
    PublicIntakeMatchRequest,
    PublicIntakeMatchResponse,
    PublicIntakeSubmissionRequest,
    PublicIntakeSubmissionResponse,
    ReassignIntakeCaseRequest,
    TeamQueueItem,
)
from psihointegritet.modules.guidance.service import (
    GuidanceService,
    IntakeConflictError,
    IntakeFeatureDisabledError,
    IntakeValidationError,
)

public_router = APIRouter(prefix="/public/intake", tags=["public-intake"])
team_router = APIRouter(prefix="/intake", tags=["intake-team"])
IdempotencyKey = Annotated[str, Header(alias="Idempotency-Key", min_length=16, max_length=120)]


@public_router.get(
    "/capabilities",
    response_model=PublicIntakeCapabilitiesResponse,
    operation_id="get_public_intake_capabilities",
)
async def get_public_intake_capabilities(settings: AppSettings) -> PublicIntakeCapabilitiesResponse:
    return PublicIntakeCapabilitiesResponse(
        matching_enabled=settings.intake_matching_enabled,
        sensitive_submission_enabled=settings.intake_submission_ready,
    )


@public_router.post(
    "/match",
    response_model=PublicIntakeMatchResponse,
    operation_id="evaluate_public_intake_match",
)
async def evaluate_public_intake_match(
    request: PublicIntakeMatchRequest, session: DatabaseSession, settings: AppSettings
) -> PublicIntakeMatchResponse:
    if not settings.intake_matching_enabled:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Intake matching is disabled"
        )
    return await GuidanceService(session, settings).evaluate_public_match(request)


@public_router.post(
    "/cases",
    response_model=PublicIntakeSubmissionResponse,
    status_code=status.HTTP_201_CREATED,
    operation_id="submit_public_intake_case",
)
async def submit_public_intake_case(
    request: PublicIntakeSubmissionRequest,
    idempotency_key: IdempotencyKey,
    session: DatabaseSession,
    settings: AppSettings,
) -> PublicIntakeSubmissionResponse:
    try:
        response = await GuidanceService(session, settings).submit_public_case(
            request, idempotency_key
        )
    except IntakeFeatureDisabledError as error:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(error)
        ) from error
    except IntakeValidationError as error:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail=str(error)
        ) from error
    except IntakeConflictError as error:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(error)) from error
    return response


@team_router.get(
    "/cases/queue",
    response_model=list[TeamQueueItem],
    operation_id="list_intake_team_queue",
)
async def list_intake_team_queue(
    identity: CurrentIdentity, session: DatabaseSession, settings: AppSettings
) -> list[TeamQueueItem]:
    service = GuidanceService(session, settings)
    try:
        async with session.begin():
            actor = await _staff_actor(session, settings, identity)
            return await service.list_team_queue(actor)
    except IntakeFeatureDisabledError as error:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(error)) from error


@team_router.post(
    "/cases/{case_id}/claim",
    response_model=ClaimIntakeCaseResponse,
    operation_id="claim_intake_case",
)
async def claim_intake_case(
    case_id: UUID, identity: CurrentIdentity, session: DatabaseSession, settings: AppSettings
) -> ClaimIntakeCaseResponse:
    service = GuidanceService(session, settings)
    try:
        async with session.begin():
            actor = await _staff_actor(session, settings, identity)
            return await service.claim_case(case_id, actor)
    except IntakeFeatureDisabledError as error:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(error)) from error
    except IntakeValidationError as error:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(error)) from error
    except IntakeConflictError as error:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(error)) from error


@team_router.post(
    "/cases/{case_id}/reassign",
    response_model=ClaimIntakeCaseResponse,
    operation_id="reassign_intake_case",
)
async def reassign_intake_case(
    case_id: UUID,
    request: ReassignIntakeCaseRequest,
    identity: CurrentIdentity,
    session: DatabaseSession,
    settings: AppSettings,
) -> ClaimIntakeCaseResponse:
    service = GuidanceService(session, settings)
    try:
        async with session.begin():
            actor = await _staff_actor(session, settings, identity)
            return await service.reassign_case(case_id, actor, request)
    except IntakeFeatureDisabledError as error:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(error)) from error
    except IntakeValidationError as error:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail=str(error)
        ) from error
    except IntakeConflictError as error:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(error)) from error


async def _staff_actor(
    session: DatabaseSession, settings: AppSettings, identity: CurrentIdentity
) -> StaffActor:
    try:
        return await resolve_staff_actor(session, identity, settings.default_organization_slug)
    except IntakeAuthorizationError as error:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(error)) from error
