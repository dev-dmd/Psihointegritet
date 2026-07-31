"""Staff and public API for the governed Kompas taxonomy registry."""

from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy import select

from psihointegritet.api.dependencies import AppSettings, CurrentIdentity, DatabaseSession
from psihointegritet.api.errors import ApiProblem
from psihointegritet.modules.content.taxonomy_models import TaxonomyAxis
from psihointegritet.modules.content.taxonomy_schemas import (
    CreateTaxonomyIntakeLinkRequest,
    CreateTaxonomyTermRequest,
    PublicTaxonomyOut,
    TaxonomyIntakeLinkOut,
    TaxonomyIntakeLinkReviewRequest,
    TaxonomyIntakeLinkTransitionRequest,
    TaxonomyReviewDecisionRequest,
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

_ERROR_RESPONSES = {
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
    revision_status: RevisionStatus | None = Query(default=None, alias="status"),
    query: str | None = Query(default=None, max_length=160),
    locale: str = Query(default="sr-Latn", min_length=2, max_length=16),
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
