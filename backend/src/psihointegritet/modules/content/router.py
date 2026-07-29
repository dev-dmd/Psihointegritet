"""CMS Core content API (CG-B4).

Pattern: `modules/privacy/router.py` / `modules/guidance/router.py`'s
`team_router` — Clerk JWT via `CurrentIdentity`, PostgreSQL-resolved
membership via `resolve_staff_actor`, `org_admin` required for every mutation
(rules §10.3 — authentication is not authorization).
"""

from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, HTTPException, status

from psihointegritet.api.dependencies import AppSettings, CurrentIdentity, DatabaseSession
from psihointegritet.modules.content.models import ContentType
from psihointegritet.modules.content.schemas import (
    ContentRevisionOut,
    CreateContentEntryRequest,
    PublishBlockOut,
    RecordReviewDecisionRequest,
    TransitionRequest,
    UpdateContentRevisionRequest,
)
from psihointegritet.modules.content.service import (
    ContentConflictError,
    ContentForbiddenError,
    ContentNotFoundError,
    ContentService,
)
from psihointegritet.modules.guidance.authorization import (
    IntakeAuthorizationError,
    StaffActor,
    resolve_staff_actor,
)

router = APIRouter(prefix="/content", tags=["content"])


async def _org_admin_actor(
    session: DatabaseSession, settings: AppSettings, identity: CurrentIdentity
) -> StaffActor:
    try:
        return await resolve_staff_actor(session, identity, settings.default_organization_slug)
    except IntakeAuthorizationError as error:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(error)) from error


def _handle(error: Exception) -> HTTPException:
    if isinstance(error, ContentNotFoundError):
        return HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(error))
    if isinstance(error, ContentForbiddenError):
        return HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(error))
    if isinstance(error, ContentConflictError):
        return HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(error))
    if isinstance(error, ValueError):
        return HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail=str(error))
    raise error


@router.get(
    "/entries", response_model=list[ContentRevisionOut], operation_id="list_content_entries"
)
async def list_content_entries(
    identity: CurrentIdentity,
    session: DatabaseSession,
    settings: AppSettings,
    content_type: ContentType | None = None,
) -> list[ContentRevisionOut]:
    async with session.begin():
        actor = await _org_admin_actor(session, settings, identity)
        return await ContentService(session).list_entries(actor, content_type)


@router.post(
    "/entries",
    response_model=ContentRevisionOut,
    status_code=status.HTTP_201_CREATED,
    operation_id="create_content_entry",
)
async def create_content_entry(
    request: CreateContentEntryRequest,
    identity: CurrentIdentity,
    session: DatabaseSession,
    settings: AppSettings,
) -> ContentRevisionOut:
    try:
        async with session.begin():
            actor = await _org_admin_actor(session, settings, identity)
            return await ContentService(session).create_entry(actor, request)
    except (ContentConflictError, ContentForbiddenError, ValueError) as error:
        raise _handle(error) from error


@router.get(
    "/entries/{entry_id}", response_model=ContentRevisionOut, operation_id="get_content_entry"
)
async def get_content_entry(
    entry_id: UUID, identity: CurrentIdentity, session: DatabaseSession, settings: AppSettings
) -> ContentRevisionOut:
    try:
        async with session.begin():
            actor = await _org_admin_actor(session, settings, identity)
            return await ContentService(session).get_entry(actor, entry_id)
    except ContentNotFoundError as error:
        raise _handle(error) from error


@router.patch(
    "/entries/{entry_id}/revisions/{revision_id}",
    response_model=ContentRevisionOut,
    operation_id="update_content_revision",
)
async def update_content_revision(
    entry_id: UUID,
    revision_id: UUID,
    request: UpdateContentRevisionRequest,
    identity: CurrentIdentity,
    session: DatabaseSession,
    settings: AppSettings,
) -> ContentRevisionOut:
    try:
        async with session.begin():
            actor = await _org_admin_actor(session, settings, identity)
            return await ContentService(session).update_revision(
                actor, entry_id, revision_id, request
            )
    except (
        ContentNotFoundError,
        ContentForbiddenError,
        ContentConflictError,
        ValueError,
    ) as error:
        raise _handle(error) from error


@router.get(
    "/entries/{entry_id}/revisions/{revision_id}/publish-check",
    response_model=PublishBlockOut | None,
    operation_id="check_content_publishable",
)
async def check_content_publishable(
    entry_id: UUID,
    revision_id: UUID,
    identity: CurrentIdentity,
    session: DatabaseSession,
    settings: AppSettings,
) -> PublishBlockOut | None:
    try:
        async with session.begin():
            actor = await _org_admin_actor(session, settings, identity)
            result = await ContentService(session).check_publish(actor, entry_id, revision_id)
            return result.block
    except ContentNotFoundError as error:
        raise _handle(error) from error


@router.post(
    "/entries/{entry_id}/revisions/{revision_id}/transition",
    response_model=ContentRevisionOut,
    operation_id="transition_content_revision",
)
async def transition_content_revision(
    entry_id: UUID,
    revision_id: UUID,
    request: TransitionRequest,
    identity: CurrentIdentity,
    session: DatabaseSession,
    settings: AppSettings,
) -> ContentRevisionOut:
    try:
        async with session.begin():
            actor = await _org_admin_actor(session, settings, identity)
            return await ContentService(session).transition(actor, entry_id, revision_id, request)
    except (
        ContentNotFoundError,
        ContentForbiddenError,
        ContentConflictError,
        ValueError,
    ) as error:
        raise _handle(error) from error


@router.post(
    "/entries/{entry_id}/revisions/{revision_id}/reviews",
    response_model=ContentRevisionOut,
    operation_id="record_content_review_decision",
)
async def record_content_review_decision(
    entry_id: UUID,
    revision_id: UUID,
    request: RecordReviewDecisionRequest,
    identity: CurrentIdentity,
    session: DatabaseSession,
    settings: AppSettings,
) -> ContentRevisionOut:
    try:
        async with session.begin():
            actor = await _org_admin_actor(session, settings, identity)
            return await ContentService(session).record_review_decision(
                actor, entry_id, revision_id, request
            )
    except (ContentNotFoundError, ContentForbiddenError) as error:
        raise _handle(error) from error


@router.delete(
    "/entries/{entry_id}/revisions/{revision_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    operation_id="delete_content_revision",
)
async def delete_content_revision(
    entry_id: UUID,
    revision_id: UUID,
    identity: CurrentIdentity,
    session: DatabaseSession,
    settings: AppSettings,
) -> None:
    try:
        async with session.begin():
            actor = await _org_admin_actor(session, settings, identity)
            await ContentService(session).delete_revision(actor, entry_id, revision_id)
    except (ContentNotFoundError, ContentForbiddenError, ContentConflictError) as error:
        raise _handle(error) from error
