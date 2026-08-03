"""HTTP adapters for the Research module.

The public router is deliberately unauthenticated: a survey answer carries no
identity, so requiring one would create the very link the schema refuses to
store. The staff router reads aggregates only — there is no endpoint that
returns individual submissions, because nothing downstream has a reason to see
one and an endpoint that exists will eventually be called.
"""

from uuid import UUID

from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select

from psihointegritet.api.dependencies import (
    AppSettings,
    CurrentIdentity,
    DatabaseSession,
)
from psihointegritet.api.errors import ApiProblem
from psihointegritet.modules.guidance.authorization import (
    IntakeAuthorizationError,
    StaffActor,
    resolve_staff_actor,
    staff_authorization_message,
)
from psihointegritet.modules.organizations.models import Organization

from .schemas import (
    PublicSurveyOut,
    ResearchOverviewOut,
    SubmitResearchRequest,
    SubmitResearchResponse,
    SurveyResultsOut,
)
from .service import ResearchError, ResearchService

router = APIRouter(prefix="/research", tags=["research"])
public_router = APIRouter(prefix="/public/research", tags=["public-research"])

_ERROR_RESPONSES: dict[int | str, dict[str, object]] = {
    403: {"model": ApiProblem},
    404: {"model": ApiProblem},
    422: {"model": ApiProblem},
}


def _problem(error: ResearchError) -> HTTPException:
    code = (
        status.HTTP_404_NOT_FOUND
        if error.code.endswith("404")
        else status.HTTP_422_UNPROCESSABLE_ENTITY
    )
    return HTTPException(
        status_code=code,
        detail={
            "code": error.code,
            "message": error.message,
            "fieldPath": error.field_path,
        },
    )


async def _organization(session: DatabaseSession, settings: AppSettings) -> UUID:
    organization = await session.scalar(
        select(Organization).where(Organization.slug == settings.default_organization_slug)
    )
    if organization is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "code": "RESEARCH-404",
                "message": "Organizacija nije pronađena.",
                "fieldPath": None,
            },
        )
    return organization.id


async def _actor(
    session: DatabaseSession, settings: AppSettings, identity: CurrentIdentity
) -> StaffActor:
    try:
        actor = await resolve_staff_actor(session, identity, settings.default_organization_slug)
    except IntakeAuthorizationError as error:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "code": "RESEARCH-AUTH-001",
                "message": staff_authorization_message(error),
                "fieldPath": None,
            },
        ) from error
    if not actor.is_org_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "code": "RESEARCH-AUTH-001",
                "message": ("Samo administrator organizacije može da vidi rezultate istraživanja."),
                "fieldPath": None,
            },
        )
    return actor


@public_router.get(
    "/surveys/{stable_id}",
    response_model=PublicSurveyOut,
    operation_id="get_public_survey",
    responses=_ERROR_RESPONSES,
)
async def get_public_survey(
    stable_id: str,
    session: DatabaseSession,
    settings: AppSettings,
) -> PublicSurveyOut:
    organization_id = await _organization(session, settings)
    try:
        return await ResearchService(session).get_published_survey(organization_id, stable_id)
    except ResearchError as error:
        raise _problem(error) from error


@public_router.post(
    "/submissions",
    response_model=SubmitResearchResponse,
    status_code=status.HTTP_201_CREATED,
    operation_id="submit_research_survey",
    responses=_ERROR_RESPONSES,
)
async def submit_research_survey(
    request: SubmitResearchRequest,
    session: DatabaseSession,
    settings: AppSettings,
) -> SubmitResearchResponse:
    organization_id = await _organization(session, settings)
    service = ResearchService(session)
    try:
        submission_id, survey = await service.submit(organization_id, request)
    except ResearchError as error:
        raise _problem(error) from error
    await session.commit()
    return SubmitResearchResponse(
        submission_id=submission_id,
        survey_stable_id=survey.stable_id,
        survey_version=survey.version,
    )


@router.get(
    "/surveys/{stable_id}/results",
    response_model=list[SurveyResultsOut],
    operation_id="get_research_results",
    responses=_ERROR_RESPONSES,
)
async def get_research_results(
    stable_id: str,
    session: DatabaseSession,
    settings: AppSettings,
    identity: CurrentIdentity,
) -> list[SurveyResultsOut]:
    await _actor(session, settings, identity)
    organization_id = await _organization(session, settings)
    return await ResearchService(session).results(organization_id, stable_id)


@router.get(
    "/overview",
    response_model=ResearchOverviewOut,
    operation_id="get_research_overview",
    responses=_ERROR_RESPONSES,
)
async def get_research_overview(
    session: DatabaseSession,
    settings: AppSettings,
    identity: CurrentIdentity,
) -> ResearchOverviewOut:
    await _actor(session, settings, identity)
    organization_id = await _organization(session, settings)
    service = ResearchService(session)

    surveys: list[SurveyResultsOut] = []
    for stable_id in await service.known_survey_stable_ids(organization_id):
        surveys.extend(await service.results(organization_id, stable_id))
    return ResearchOverviewOut(surveys=surveys)
