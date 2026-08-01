"""Staff and public API for the governed Kompas taxonomy registry."""

from __future__ import annotations

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, HTTPException, Query, status
from fastapi.responses import RedirectResponse
from sqlalchemy import select

from psihointegritet.api.dependencies import AppSettings, CurrentIdentity, DatabaseSession
from psihointegritet.api.errors import ApiProblem
from psihointegritet.modules.content.taxonomy_models import TaxonomyAxis, TaxonomyRouteKind
from psihointegritet.modules.content.taxonomy_schemas import (
    ConfirmTaxonomyRouteRequest,
    CreateTaxonomyIntakeLinkRequest,
    CreateTaxonomyTermRequest,
    PublicTaxonomyOut,
    PublicTaxonomyTermOut,
    SuggestTaxonomyRouteRequest,
    TaxonomyIntakeLinkOut,
    TaxonomyIntakeLinkReviewRequest,
    TaxonomyIntakeLinkTransitionRequest,
    TaxonomyReviewDecisionRequest,
    TaxonomyRouteOut,
    TaxonomyRouteSuggestionOut,
    TaxonomyTermOut,
    TaxonomyTransitionRequest,
    UpdateTaxonomyRevisionRequest,
)
from psihointegritet.modules.content.taxonomy_service import (
    TaxonomyConflictError,
    TaxonomyError,
    TaxonomyForbiddenError,
    TaxonomyNotFoundError,
    TaxonomyService,
)
from psihointegritet.modules.guidance.authorization import (
    IntakeAuthorizationError,
    StaffActor,
    resolve_staff_actor,
)
from psihointegritet.modules.organizations.models import Organization
from psihointegritet.shared.domain.publication import RevisionStatus

router = APIRouter(prefix="/content/taxonomy", tags=["content-taxonomy"])
public_router = APIRouter(prefix="/public/compass/taxonomy", tags=["public-taxonomy"])

_ERROR_RESPONSES: dict[int | str, dict[str, object]] = {
    403: {"model": ApiProblem},
    404: {"model": ApiProblem},
    409: {"model": ApiProblem},
    422: {"model": ApiProblem},
}


async def _actor(
    session: DatabaseSession, settings: AppSettings, identity: CurrentIdentity
) -> StaffActor:
    try:
        actor = await resolve_staff_actor(session, identity, settings.default_organization_slug)
    except IntakeAuthorizationError as error:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "code": "TAX-AUTH-001",
                "message": "Nalog nema pristup Kompas registru.",
                "fieldPath": None,
            },
        ) from error
    if not actor.is_org_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "code": "TAX-AUTH-001",
                "message": "Samo administrator organizacije može da uređuje Kompas registar.",
                "fieldPath": None,
            },
        )
    return actor


def _http_error(error: Exception) -> HTTPException:
    if isinstance(error, TaxonomyError):
        if isinstance(error, TaxonomyNotFoundError):
            status_code = status.HTTP_404_NOT_FOUND
        elif isinstance(error, TaxonomyForbiddenError):
            status_code = status.HTTP_403_FORBIDDEN
        elif isinstance(error, TaxonomyConflictError):
            status_code = status.HTTP_409_CONFLICT
        else:
            status_code = status.HTTP_422_UNPROCESSABLE_CONTENT
        return HTTPException(
            status_code=status_code,
            detail={
                "code": error.code,
                "message": error.message,
                "fieldPath": error.field_path,
            },
        )
    if isinstance(error, ValueError):
        return HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail={
                "code": "TAX-STATE-003",
                "message": "Traženi korak nije dozvoljen u trenutnom statusu.",
                "fieldPath": "target",
            },
        )
    raise error


@router.get(
    "/terms",
    response_model=list[TaxonomyTermOut],
    responses=_ERROR_RESPONSES,
    operation_id="list_taxonomy_terms",
)
async def list_taxonomy_terms(
    identity: CurrentIdentity,
    session: DatabaseSession,
    settings: AppSettings,
    axis: TaxonomyAxis | None = None,
    revision_status: Annotated[RevisionStatus | None, Query(alias="status")] = None,
    query: Annotated[str | None, Query(max_length=160)] = None,
    locale: Annotated[str, Query(min_length=2, max_length=16)] = "sr-Latn",
) -> list[TaxonomyTermOut]:
    async with session.begin():
        actor = await _actor(session, settings, identity)
        return await TaxonomyService(session).list_terms(
            actor, axis=axis, status=revision_status, query=query, locale=locale
        )


@router.post(
    "/terms",
    response_model=TaxonomyTermOut,
    status_code=status.HTTP_201_CREATED,
    responses=_ERROR_RESPONSES,
    operation_id="create_taxonomy_term",
)
async def create_taxonomy_term(
    request: CreateTaxonomyTermRequest,
    identity: CurrentIdentity,
    session: DatabaseSession,
    settings: AppSettings,
) -> TaxonomyTermOut:
    try:
        async with session.begin():
            actor = await _actor(session, settings, identity)
            return await TaxonomyService(session).create_term(actor, request)
    except (TaxonomyError, ValueError) as error:
        raise _http_error(error) from error


@router.get(
    "/terms/{term_id}",
    response_model=TaxonomyTermOut,
    responses=_ERROR_RESPONSES,
    operation_id="get_taxonomy_term",
)
async def get_taxonomy_term(
    term_id: UUID,
    identity: CurrentIdentity,
    session: DatabaseSession,
    settings: AppSettings,
    locale: str = Query(default="sr-Latn", min_length=2, max_length=16),
) -> TaxonomyTermOut:
    try:
        async with session.begin():
            actor = await _actor(session, settings, identity)
            return await TaxonomyService(session).get_term(actor, term_id, locale)
    except TaxonomyError as error:
        raise _http_error(error) from error


@router.get(
    "/terms/{term_id}/routes",
    response_model=list[TaxonomyRouteOut],
    responses=_ERROR_RESPONSES,
    operation_id="list_taxonomy_term_routes",
)
async def list_taxonomy_term_routes(
    term_id: UUID,
    identity: CurrentIdentity,
    session: DatabaseSession,
    settings: AppSettings,
    locale: str = Query(default="sr-Latn", min_length=2, max_length=16),
) -> list[TaxonomyRouteOut]:
    try:
        async with session.begin():
            actor = await _actor(session, settings, identity)
            return await TaxonomyService(session).list_routes(actor, term_id, locale)
    except TaxonomyError as error:
        raise _http_error(error) from error


@router.post(
    "/terms/{term_id}/routes/suggestion",
    response_model=TaxonomyRouteSuggestionOut,
    responses=_ERROR_RESPONSES,
    operation_id="suggest_taxonomy_term_route",
)
async def suggest_taxonomy_term_route(
    term_id: UUID,
    request: SuggestTaxonomyRouteRequest,
    identity: CurrentIdentity,
    session: DatabaseSession,
    settings: AppSettings,
) -> TaxonomyRouteSuggestionOut:
    try:
        async with session.begin():
            actor = await _actor(session, settings, identity)
            return await TaxonomyService(session).suggest_route(actor, term_id, request)
    except TaxonomyError as error:
        raise _http_error(error) from error


@router.put(
    "/terms/{term_id}/routes/canonical",
    response_model=TaxonomyRouteOut,
    responses=_ERROR_RESPONSES,
    operation_id="confirm_taxonomy_term_route",
)
async def confirm_taxonomy_term_route(
    term_id: UUID,
    request: ConfirmTaxonomyRouteRequest,
    identity: CurrentIdentity,
    session: DatabaseSession,
    settings: AppSettings,
) -> TaxonomyRouteOut:
    try:
        async with session.begin():
            actor = await _actor(session, settings, identity)
            return await TaxonomyService(session).confirm_route(actor, term_id, request)
    except TaxonomyError as error:
        raise _http_error(error) from error


@router.patch(
    "/terms/{term_id}/revisions/{revision_id}",
    response_model=TaxonomyTermOut,
    responses=_ERROR_RESPONSES,
    operation_id="update_taxonomy_revision",
)
async def update_taxonomy_revision(
    term_id: UUID,
    revision_id: UUID,
    request: UpdateTaxonomyRevisionRequest,
    identity: CurrentIdentity,
    session: DatabaseSession,
    settings: AppSettings,
) -> TaxonomyTermOut:
    try:
        async with session.begin():
            actor = await _actor(session, settings, identity)
            return await TaxonomyService(session).update_revision(
                actor, term_id, revision_id, request
            )
    except (TaxonomyError, ValueError) as error:
        raise _http_error(error) from error


@router.post(
    "/terms/{term_id}/revisions/{revision_id}/reviews",
    response_model=TaxonomyTermOut,
    responses=_ERROR_RESPONSES,
    operation_id="review_taxonomy_revision",
)
async def review_taxonomy_revision(
    term_id: UUID,
    revision_id: UUID,
    request: TaxonomyReviewDecisionRequest,
    identity: CurrentIdentity,
    session: DatabaseSession,
    settings: AppSettings,
) -> TaxonomyTermOut:
    try:
        async with session.begin():
            actor = await _actor(session, settings, identity)
            return await TaxonomyService(session).record_review(
                actor, term_id, revision_id, request
            )
    except (TaxonomyError, ValueError) as error:
        raise _http_error(error) from error


@router.delete(
    "/terms/{term_id}/revisions/{revision_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    responses=_ERROR_RESPONSES,
    operation_id="delete_taxonomy_revision",
)
async def delete_taxonomy_revision(
    term_id: UUID,
    revision_id: UUID,
    identity: CurrentIdentity,
    session: DatabaseSession,
    settings: AppSettings,
) -> None:
    try:
        async with session.begin():
            actor = await _actor(session, settings, identity)
            await TaxonomyService(session).delete_revision(actor, term_id, revision_id)
    except (TaxonomyError, ValueError) as error:
        raise _http_error(error) from error


@router.post(
    "/terms/{term_id}/revisions/{revision_id}/delete",
    status_code=status.HTTP_204_NO_CONTENT,
    responses=_ERROR_RESPONSES,
    operation_id="delete_taxonomy_revision_action",
)
async def delete_taxonomy_revision_action(
    term_id: UUID,
    revision_id: UUID,
    identity: CurrentIdentity,
    session: DatabaseSession,
    settings: AppSettings,
) -> None:
    """Action-route counterpart for panel/proxy layers that reject DELETE."""
    try:
        async with session.begin():
            actor = await _actor(session, settings, identity)
            await TaxonomyService(session).delete_revision(actor, term_id, revision_id)
    except (TaxonomyError, ValueError) as error:
        raise _http_error(error) from error


@router.post(
    "/terms/{term_id}/revisions/{revision_id}/transition",
    response_model=TaxonomyTermOut,
    responses=_ERROR_RESPONSES,
    operation_id="transition_taxonomy_revision",
)
async def transition_taxonomy_revision(
    term_id: UUID,
    revision_id: UUID,
    request: TaxonomyTransitionRequest,
    identity: CurrentIdentity,
    session: DatabaseSession,
    settings: AppSettings,
) -> TaxonomyTermOut:
    try:
        async with session.begin():
            actor = await _actor(session, settings, identity)
            return await TaxonomyService(session).transition(actor, term_id, revision_id, request)
    except (TaxonomyError, ValueError) as error:
        raise _http_error(error) from error


@router.get(
    "/intake-links",
    response_model=list[TaxonomyIntakeLinkOut],
    responses=_ERROR_RESPONSES,
    operation_id="list_taxonomy_intake_links",
)
async def list_taxonomy_intake_links(
    identity: CurrentIdentity,
    session: DatabaseSession,
    settings: AppSettings,
) -> list[TaxonomyIntakeLinkOut]:
    async with session.begin():
        actor = await _actor(session, settings, identity)
        return await TaxonomyService(session).list_intake_links(actor)


@router.post(
    "/intake-links",
    response_model=TaxonomyIntakeLinkOut,
    status_code=status.HTTP_201_CREATED,
    responses=_ERROR_RESPONSES,
    operation_id="create_taxonomy_intake_link",
)
async def create_taxonomy_intake_link(
    request: CreateTaxonomyIntakeLinkRequest,
    identity: CurrentIdentity,
    session: DatabaseSession,
    settings: AppSettings,
) -> TaxonomyIntakeLinkOut:
    try:
        async with session.begin():
            actor = await _actor(session, settings, identity)
            return await TaxonomyService(session).create_intake_link(actor, request)
    except (TaxonomyError, ValueError) as error:
        raise _http_error(error) from error


@router.post(
    "/intake-links/{link_id}/reviews",
    response_model=TaxonomyIntakeLinkOut,
    responses=_ERROR_RESPONSES,
    operation_id="review_taxonomy_intake_link",
)
async def review_taxonomy_intake_link(
    link_id: UUID,
    request: TaxonomyIntakeLinkReviewRequest,
    identity: CurrentIdentity,
    session: DatabaseSession,
    settings: AppSettings,
) -> TaxonomyIntakeLinkOut:
    try:
        async with session.begin():
            actor = await _actor(session, settings, identity)
            return await TaxonomyService(session).review_intake_link(actor, link_id, request)
    except (TaxonomyError, ValueError) as error:
        raise _http_error(error) from error


@router.post(
    "/intake-links/{link_id}/transition",
    response_model=TaxonomyIntakeLinkOut,
    responses=_ERROR_RESPONSES,
    operation_id="transition_taxonomy_intake_link",
)
async def transition_taxonomy_intake_link(
    link_id: UUID,
    request: TaxonomyIntakeLinkTransitionRequest,
    identity: CurrentIdentity,
    session: DatabaseSession,
    settings: AppSettings,
) -> TaxonomyIntakeLinkOut:
    try:
        async with session.begin():
            actor = await _actor(session, settings, identity)
            return await TaxonomyService(session).transition_intake_link(actor, link_id, request)
    except (TaxonomyError, ValueError) as error:
        raise _http_error(error) from error


@router.delete(
    "/intake-links/{link_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    responses=_ERROR_RESPONSES,
    operation_id="delete_taxonomy_intake_link",
)
async def delete_taxonomy_intake_link(
    link_id: UUID,
    identity: CurrentIdentity,
    session: DatabaseSession,
    settings: AppSettings,
) -> None:
    try:
        async with session.begin():
            actor = await _actor(session, settings, identity)
            await TaxonomyService(session).delete_intake_link(actor, link_id)
    except (TaxonomyError, ValueError) as error:
        raise _http_error(error) from error


@public_router.get(
    "",
    response_model=PublicTaxonomyOut,
    operation_id="get_public_taxonomy",
)
async def get_public_taxonomy(
    session: DatabaseSession,
    settings: AppSettings,
    locale: str = Query(default="sr-Latn", min_length=2, max_length=16),
) -> PublicTaxonomyOut:
    async with session.begin():
        organization = await session.scalar(
            select(Organization).where(Organization.slug == settings.default_organization_slug)
        )
        if organization is None:
            return PublicTaxonomyOut(locale=locale, terms=[])
        return await TaxonomyService(session).list_public(organization.id, locale)


@public_router.get(
    "/routes/{route_kind}/{slug}",
    response_model=PublicTaxonomyTermOut,
    responses={
        308: {"description": "Stara putanja preusmerava na aktuelnu kanonsku putanju."},
        404: {"model": ApiProblem},
    },
    operation_id="resolve_public_taxonomy_route",
)
async def resolve_public_taxonomy_route(
    route_kind: TaxonomyRouteKind,
    slug: str,
    session: DatabaseSession,
    settings: AppSettings,
    locale: str = Query(default="sr-Latn", min_length=2, max_length=16),
) -> PublicTaxonomyTermOut | RedirectResponse:
    try:
        async with session.begin():
            organization = await session.scalar(
                select(Organization).where(Organization.slug == settings.default_organization_slug)
            )
            if organization is None:
                raise TaxonomyNotFoundError(
                    "TAX-ROUTE-404", "Tražena Kompas stranica ne postoji.", "slug"
                )
            output, is_alias = await TaxonomyService(session).resolve_public_route(
                organization.id, route_kind, slug, locale
            )
            if is_alias:
                assert output.canonical_path is not None  # noqa: S101 — guarded by resolve_public_route
                return RedirectResponse(
                    url=output.canonical_path,
                    status_code=status.HTTP_308_PERMANENT_REDIRECT,
                )
            return output
    except TaxonomyError as error:
        raise _http_error(error) from error
