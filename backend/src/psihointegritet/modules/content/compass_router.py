"""Unauthenticated Kompas aggregate and recommendation endpoints."""

from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, HTTPException, Query, status
from fastapi.responses import RedirectResponse
from sqlalchemy import select

from psihointegritet.api.dependencies import AppSettings, DatabaseSession
from psihointegritet.api.errors import ApiProblem
from psihointegritet.modules.content.compass_schemas import (
    CompassRecommendationOut,
    CompassRecommendationRequest,
    CompassTaxonomyPageOut,
)
from psihointegritet.modules.content.compass_service import (
    CompassError,
    CompassService,
    CompassVersionError,
)
from psihointegritet.modules.content.taxonomy_models import TaxonomyRouteKind
from psihointegritet.modules.content.taxonomy_service import (
    TaxonomyConflictError,
    TaxonomyError,
    TaxonomyForbiddenError,
    TaxonomyNotFoundError,
)
from psihointegritet.modules.organizations.models import Organization

router = APIRouter(prefix="/public/compass", tags=["public-compass"])

_ERROR_RESPONSES: dict[int | str, dict[str, object]] = {
    404: {"model": ApiProblem},
    409: {"model": ApiProblem},
    422: {"model": ApiProblem},
}


def _http_error(error: Exception) -> HTTPException:
    if isinstance(error, CompassVersionError):
        status_code = status.HTTP_409_CONFLICT
    elif isinstance(error, CompassError):
        status_code = status.HTTP_422_UNPROCESSABLE_CONTENT
    elif isinstance(error, TaxonomyNotFoundError):
        status_code = status.HTTP_404_NOT_FOUND
    elif isinstance(error, TaxonomyForbiddenError):
        status_code = status.HTTP_403_FORBIDDEN
    elif isinstance(error, TaxonomyConflictError):
        status_code = status.HTTP_409_CONFLICT
    elif isinstance(error, TaxonomyError):
        status_code = status.HTTP_422_UNPROCESSABLE_CONTENT
    else:
        raise error
    problem: CompassError | TaxonomyError = error
    return HTTPException(
        status_code=status_code,
        detail={
            "code": problem.code,
            "message": problem.message,
            "fieldPath": problem.field_path,
        },
    )


async def _organization_id(session: DatabaseSession, settings: AppSettings) -> UUID:
    organization = await session.scalar(
        select(Organization).where(Organization.slug == settings.default_organization_slug)
    )
    if organization is None:
        raise TaxonomyNotFoundError("TAX-ROUTE-404", "Tražena Kompas stranica ne postoji.", None)
    return organization.id


@router.get(
    "/taxonomy/pages/{route_kind}/{slug}",
    response_model=CompassTaxonomyPageOut,
    responses={
        **_ERROR_RESPONSES,
        308: {"description": "Stara putanja preusmerava na aktuelnu kanonsku putanju."},
    },
    operation_id="get_public_compass_taxonomy_page",
)
async def get_public_compass_taxonomy_page(
    route_kind: TaxonomyRouteKind,
    slug: str,
    session: DatabaseSession,
    settings: AppSettings,
    locale: str = Query(default="sr-Latn", min_length=2, max_length=16),
) -> CompassTaxonomyPageOut | RedirectResponse:
    try:
        async with session.begin():
            organization_id = await _organization_id(session, settings)
            output, is_alias = await CompassService(session).taxonomy_page(
                organization_id, route_kind, slug, locale
            )
            if is_alias:
                assert output.term.canonical_path is not None  # noqa: S101
                return RedirectResponse(
                    url=output.term.canonical_path,
                    status_code=status.HTTP_308_PERMANENT_REDIRECT,
                )
            return output
    except (CompassError, TaxonomyError) as error:
        raise _http_error(error) from error


@router.post(
    "/recommendations",
    response_model=CompassRecommendationOut,
    responses=_ERROR_RESPONSES,
    operation_id="get_public_compass_recommendations",
)
async def get_public_compass_recommendations(
    request: CompassRecommendationRequest,
    session: DatabaseSession,
    settings: AppSettings,
) -> CompassRecommendationOut:
    try:
        async with session.begin():
            organization_id = await _organization_id(session, settings)
            return await CompassService(session).recommendations(organization_id, request)
    except (CompassError, TaxonomyError) as error:
        raise _http_error(error) from error
