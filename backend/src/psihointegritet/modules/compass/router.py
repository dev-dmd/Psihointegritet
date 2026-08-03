"""Public and staff HTTP adapters for the versioned Kompas flow."""

from uuid import UUID

from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy import select

from psihointegritet.api.dependencies import AppSettings, CurrentIdentity, DatabaseSession
from psihointegritet.api.errors import ApiProblem
from psihointegritet.modules.compass.result_composer import compose_result
from psihointegritet.modules.compass.schemas import (
    AdminFlowPreviewOut,
    CompassExperienceOut,
    CompassFlowVersionOut,
    CreateFlowRequest,
    FlowEvaluationRequest,
    FlowReviewRequest,
    TransitionFlowRequest,
    UpdateFlowVersionRequest,
)
from psihointegritet.modules.compass.service import CompassFlowError, CompassFlowService
from psihointegritet.modules.content.compass_rules import COMPASS_RULE_VERSION
from psihointegritet.modules.content.compass_schemas import CompassRecommendationRequest
from psihointegritet.modules.content.compass_service import CompassError, CompassService
from psihointegritet.modules.content.taxonomy_service import TAXONOMY_VERSION, TaxonomyService
from psihointegritet.modules.guidance.authorization import (
    IntakeAuthorizationError,
    StaffActor,
    resolve_staff_actor,
    staff_authorization_message,
)
from psihointegritet.modules.organizations.models import Organization

router = APIRouter(prefix="/compass/flows", tags=["compass-flow-staff"])
public_router = APIRouter(prefix="/public/compass/flows", tags=["public-compass-flow"])

_RESPONSES: dict[int | str, dict[str, object]] = {
    403: {"model": ApiProblem},
    404: {"model": ApiProblem},
    409: {"model": ApiProblem},
    422: {"model": ApiProblem},
}


def _problem(error: CompassFlowError) -> HTTPException:
    status_code = status.HTTP_422_UNPROCESSABLE_CONTENT
    if error.code.endswith("404"):
        status_code = status.HTTP_404_NOT_FOUND
    elif "409" in error.code or "LOCK" in error.code:
        status_code = status.HTTP_409_CONFLICT
    return HTTPException(
        status_code=status_code,
        detail={"code": error.code, "message": error.message, "fieldPath": error.field_path},
    )


async def _organization_id(session: DatabaseSession, settings: AppSettings) -> UUID:
    organization = await session.scalar(
        select(Organization).where(Organization.slug == settings.default_organization_slug)
    )
    if organization is None:
        raise CompassFlowError("COMPASS-FLOW-404", "Organizacija nije pronađena.")
    return organization.id


async def _actor(
    session: DatabaseSession, settings: AppSettings, identity: CurrentIdentity
) -> StaffActor:
    try:
        actor = await resolve_staff_actor(session, identity, settings.default_organization_slug)
    except IntakeAuthorizationError as error:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=staff_authorization_message(error),
        ) from error
    if not actor.is_org_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Nema pristupa.")
    return actor


@public_router.get(
    "/{stable_id}",
    response_model=CompassFlowVersionOut,
    responses=_RESPONSES,
    operation_id="get_public_compass_flow",
)
async def get_public_flow(
    stable_id: str,
    session: DatabaseSession,
    settings: AppSettings,
    locale: str = Query(default="sr-Latn", min_length=2, max_length=16),
) -> CompassFlowVersionOut:
    try:
        organization_id = await _organization_id(session, settings)
        return await CompassFlowService(session).public(organization_id, stable_id, locale)
    except CompassFlowError as error:
        raise _problem(error) from error


@public_router.post(
    "/{stable_id}/recommendations",
    response_model=CompassExperienceOut,
    responses=_RESPONSES,
    operation_id="get_public_compass_experience",
)
async def get_public_experience(
    stable_id: str,
    request: CompassRecommendationRequest,
    session: DatabaseSession,
    settings: AppSettings,
) -> CompassExperienceOut:
    try:
        organization_id = await _organization_id(session, settings)
        flow = await CompassFlowService(session).public(organization_id, stable_id, request.locale)
        ranked = await CompassService(session).recommendations(organization_id, request)
        taxonomy = await TaxonomyService(session).list_public(organization_id, request.locale)
        return compose_result(flow, ranked, taxonomy)
    except CompassFlowError as error:
        raise _problem(error) from error
    except CompassError as error:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail={"code": error.code, "message": error.message, "fieldPath": error.field_path},
        ) from error


@router.post(
    "",
    response_model=CompassFlowVersionOut,
    status_code=status.HTTP_201_CREATED,
    responses=_RESPONSES,
    operation_id="create_compass_flow",
)
async def create_flow(
    request: CreateFlowRequest,
    session: DatabaseSession,
    settings: AppSettings,
    identity: CurrentIdentity,
) -> CompassFlowVersionOut:
    actor = await _actor(session, settings, identity)
    try:
        output = await CompassFlowService(session).create(
            actor, request.stable_id, request.locale, request.definition
        )
        await session.commit()
        return output
    except CompassFlowError as error:
        raise _problem(error) from error


@router.get(
    "",
    response_model=list[CompassFlowVersionOut],
    responses=_RESPONSES,
    operation_id="list_compass_flow_versions",
)
async def list_flows(
    session: DatabaseSession,
    settings: AppSettings,
    identity: CurrentIdentity,
) -> list[CompassFlowVersionOut]:
    actor = await _actor(session, settings, identity)
    return await CompassFlowService(session).list_versions(actor.organization_id)


@router.put(
    "/{flow_id}/versions/{version_id}",
    response_model=CompassFlowVersionOut,
    responses=_RESPONSES,
    operation_id="update_compass_flow_version",
)
async def update_flow(
    flow_id: UUID,
    version_id: UUID,
    request: UpdateFlowVersionRequest,
    session: DatabaseSession,
    settings: AppSettings,
    identity: CurrentIdentity,
) -> CompassFlowVersionOut:
    actor = await _actor(session, settings, identity)
    try:
        output = await CompassFlowService(session).update(
            actor, flow_id, version_id, request.lock_version, request.definition
        )
        await session.commit()
        return output
    except CompassFlowError as error:
        raise _problem(error) from error


@router.post(
    "/{flow_id}/versions/{version_id}/reviews",
    response_model=CompassFlowVersionOut,
    responses=_RESPONSES,
    operation_id="review_compass_flow_version",
)
async def review_flow(
    flow_id: UUID,
    version_id: UUID,
    request: FlowReviewRequest,
    session: DatabaseSession,
    settings: AppSettings,
    identity: CurrentIdentity,
) -> CompassFlowVersionOut:
    actor = await _actor(session, settings, identity)
    try:
        output = await CompassFlowService(session).review(
            actor, flow_id, version_id, request.capability, request.outcome, request.note
        )
        await session.commit()
        return output
    except CompassFlowError as error:
        raise _problem(error) from error


@router.post(
    "/{flow_id}/versions/{version_id}/transition",
    response_model=CompassFlowVersionOut,
    responses=_RESPONSES,
    operation_id="transition_compass_flow_version",
)
async def transition_flow(
    flow_id: UUID,
    version_id: UUID,
    request: TransitionFlowRequest,
    session: DatabaseSession,
    settings: AppSettings,
    identity: CurrentIdentity,
) -> CompassFlowVersionOut:
    actor = await _actor(session, settings, identity)
    try:
        output = await CompassFlowService(session).transition(
            actor, flow_id, version_id, request.lock_version, request.target
        )
        await session.commit()
        return output
    except CompassFlowError as error:
        raise _problem(error) from error


@router.post(
    "/{flow_id}/versions/{version_id}/preview",
    response_model=AdminFlowPreviewOut,
    responses=_RESPONSES,
    operation_id="preview_compass_flow_version",
)
async def preview_flow(
    flow_id: UUID,
    version_id: UUID,
    request: FlowEvaluationRequest,
    session: DatabaseSession,
    settings: AppSettings,
    identity: CurrentIdentity,
) -> AdminFlowPreviewOut:
    actor = await _actor(session, settings, identity)
    try:
        preview = await CompassFlowService(session).preview(actor, flow_id, version_id, request)
        recommendation_request = CompassRecommendationRequest(
            taxonomy_version=TAXONOMY_VERSION,
            rule_version=COMPASS_RULE_VERSION,
            locale=preview.flow.locale,
            topic_group_id=preview.selection.topic_group_id,
            topic_ids=preview.selection.topic_ids,
            audience_id=preview.selection.audience_id,
            goal_ids=preview.selection.goal_ids,
            journey_intent=preview.selection.journey_intent,
        )
        ranked = await CompassService(session).recommendations(
            actor.organization_id, recommendation_request
        )
        taxonomy = await TaxonomyService(session).list_public(
            actor.organization_id, preview.flow.locale
        )
        return AdminFlowPreviewOut(
            flow=preview.flow,
            selection=preview.selection,
            experience=compose_result(preview.flow, ranked, taxonomy),
        )
    except CompassFlowError as error:
        raise _problem(error) from error


@router.post(
    "/{flow_id}/versions/{version_id}/next",
    response_model=CompassFlowVersionOut,
    status_code=status.HTTP_201_CREATED,
    responses=_RESPONSES,
    operation_id="create_next_compass_flow_version",
)
async def create_next_version(
    flow_id: UUID,
    version_id: UUID,
    session: DatabaseSession,
    settings: AppSettings,
    identity: CurrentIdentity,
) -> CompassFlowVersionOut:
    actor = await _actor(session, settings, identity)
    try:
        output = await CompassFlowService(session).next_version(actor, flow_id, version_id)
        await session.commit()
        return output
    except CompassFlowError as error:
        raise _problem(error) from error
