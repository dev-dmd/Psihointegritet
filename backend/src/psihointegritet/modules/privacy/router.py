"""Legal document registry API (LD-7).

Pattern: `modules/guidance/router.py`'s `team_router` — Clerk JWT verification
via `CurrentIdentity`, then PostgreSQL-resolved membership via
`resolve_staff_actor` (authentication is not authorization, rules §10.3).
Every handler additionally requires `org_admin` (`service._require_org_admin`)
since this manages legally significant content, not just staff content.
"""

from __future__ import annotations

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, File, HTTPException, UploadFile, status
from sqlalchemy import select

from psihointegritet.api.dependencies import AppSettings, CurrentIdentity, DatabaseSession
from psihointegritet.modules.guidance.authorization import (
    IntakeAuthorizationError,
    StaffActor,
    resolve_staff_actor,
)
from psihointegritet.modules.organizations.models import Organization
from psihointegritet.modules.privacy.models import LegalDocumentKind
from psihointegritet.modules.privacy.schemas import (
    CreateLegalDocumentRequest,
    ImportDocxResponse,
    LegalDocumentRevisionOut,
    PublicLegalDocumentOut,
    PublishBlockOut,
    RecordApprovalRequest,
    TransitionRequest,
    UpdateLegalDocumentRevisionRequest,
)
from psihointegritet.modules.privacy.service import (
    LegalDocumentConflictError,
    LegalDocumentForbiddenError,
    LegalDocumentImportError,
    LegalDocumentNotFoundError,
    LegalDocumentService,
)

router = APIRouter(prefix="/privacy", tags=["privacy-documents"])
public_router = APIRouter(prefix="/public/privacy", tags=["public-privacy"])


@public_router.get(
    "/documents/{kind}",
    response_model=PublicLegalDocumentOut,
    operation_id="get_public_legal_document",
)
async def get_public_legal_document(
    kind: LegalDocumentKind, session: DatabaseSession, settings: AppSettings
) -> PublicLegalDocumentOut:
    """Unauthenticated: what `/privatnost`, `/uslovi`, `/kolacici`,
    `/pravila-zakazivanja` and the Intake consent checkboxes read. 404 when
    nothing is published — the caller renders its own static fallback text
    (D-038), never a broken page."""
    async with session.begin():
        organization = await session.scalar(
            select(Organization).where(Organization.slug == settings.default_organization_slug)
        )
        if organization is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not published")
        revision = await LegalDocumentService(session).get_published_by_kind(organization.id, kind)
    if revision is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not published")
    return PublicLegalDocumentOut(
        kind=kind,
        title=revision.title,
        slug=revision.slug,
        body=revision.body,
        version_label=revision.version_label,
        published_at=revision.published_at,
    )


# Multipart uploads for `.docx` are capped well below the 15 MB backend limit
# at the ASGI/proxy layer in production; this is the last line of defense.
_MAX_UPLOAD_BYTES = 15 * 1024 * 1024


async def _org_admin_actor(
    session: DatabaseSession, settings: AppSettings, identity: CurrentIdentity
) -> StaffActor:
    try:
        return await resolve_staff_actor(session, identity, settings.default_organization_slug)
    except IntakeAuthorizationError as error:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(error)) from error


def _handle(error: Exception) -> HTTPException:
    if isinstance(error, LegalDocumentNotFoundError):
        return HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(error))
    if isinstance(error, LegalDocumentForbiddenError):
        return HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(error))
    if isinstance(error, LegalDocumentConflictError):
        return HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(error))
    if isinstance(error, LegalDocumentImportError):
        return HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail=str(error))
    if isinstance(error, ValueError):
        return HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail=str(error))
    raise error


@router.get(
    "/documents", response_model=list[LegalDocumentRevisionOut], operation_id="list_legal_documents"
)
async def list_legal_documents(
    identity: CurrentIdentity, session: DatabaseSession, settings: AppSettings
) -> list[LegalDocumentRevisionOut]:
    async with session.begin():
        actor = await _org_admin_actor(session, settings, identity)
        return await LegalDocumentService(session).list_documents(actor)


@router.post(
    "/documents",
    response_model=LegalDocumentRevisionOut,
    status_code=status.HTTP_201_CREATED,
    operation_id="create_legal_document",
)
async def create_legal_document(
    request: CreateLegalDocumentRequest,
    identity: CurrentIdentity,
    session: DatabaseSession,
    settings: AppSettings,
) -> LegalDocumentRevisionOut:
    try:
        async with session.begin():
            actor = await _org_admin_actor(session, settings, identity)
            return await LegalDocumentService(session).create_document(actor, request)
    except (LegalDocumentConflictError, LegalDocumentForbiddenError, ValueError) as error:
        raise _handle(error) from error


@router.get(
    "/documents/{document_id}",
    response_model=LegalDocumentRevisionOut,
    operation_id="get_legal_document",
)
async def get_legal_document(
    document_id: UUID, identity: CurrentIdentity, session: DatabaseSession, settings: AppSettings
) -> LegalDocumentRevisionOut:
    try:
        async with session.begin():
            actor = await _org_admin_actor(session, settings, identity)
            return await LegalDocumentService(session).get_document(actor, document_id)
    except LegalDocumentNotFoundError as error:
        raise _handle(error) from error


@router.post(
    "/documents/{document_id}/import-docx",
    response_model=ImportDocxResponse,
    operation_id="import_legal_document_docx",
)
async def import_legal_document_docx(
    document_id: UUID,
    identity: CurrentIdentity,
    session: DatabaseSession,
    settings: AppSettings,
    file: Annotated[UploadFile, File()],
) -> ImportDocxResponse:
    if file.filename and not file.filename.lower().endswith(".docx"):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail=(
                "Samo .docx fajlovi su podržani. Sačuvajte dokument kao .docx i pokušajte ponovo."
            ),
        )
    data = await file.read(_MAX_UPLOAD_BYTES + 1)
    if len(data) > _MAX_UPLOAD_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="Fajl je odbijen: prevelik.",
        )
    try:
        async with session.begin():
            actor = await _org_admin_actor(session, settings, identity)
            return await LegalDocumentService(session).import_docx(actor, document_id, data)
    except (
        LegalDocumentNotFoundError,
        LegalDocumentForbiddenError,
        LegalDocumentImportError,
    ) as error:
        raise _handle(error) from error


@router.patch(
    "/documents/{document_id}/revisions/{revision_id}",
    response_model=LegalDocumentRevisionOut,
    operation_id="update_legal_document_revision",
)
async def update_legal_document_revision(
    document_id: UUID,
    revision_id: UUID,
    request: UpdateLegalDocumentRevisionRequest,
    identity: CurrentIdentity,
    session: DatabaseSession,
    settings: AppSettings,
) -> LegalDocumentRevisionOut:
    try:
        async with session.begin():
            actor = await _org_admin_actor(session, settings, identity)
            return await LegalDocumentService(session).update_revision(
                actor, document_id, revision_id, request
            )
    except (
        LegalDocumentNotFoundError,
        LegalDocumentForbiddenError,
        LegalDocumentConflictError,
        ValueError,
    ) as error:
        raise _handle(error) from error


@router.get(
    "/documents/{document_id}/revisions/{revision_id}/publish-check",
    response_model=PublishBlockOut | None,
    operation_id="check_legal_document_publishable",
)
async def check_legal_document_publishable(
    document_id: UUID,
    revision_id: UUID,
    identity: CurrentIdentity,
    session: DatabaseSession,
    settings: AppSettings,
) -> PublishBlockOut | None:
    """`None` means publishable — the panel calls this before attempting a
    publish transition, same order the frontend already checks locally via
    `checkPublishable()`."""
    try:
        async with session.begin():
            actor = await _org_admin_actor(session, settings, identity)
            result = await LegalDocumentService(session).check_publish(
                actor, document_id, revision_id
            )
            return result.block
    except LegalDocumentNotFoundError as error:
        raise _handle(error) from error


@router.post(
    "/documents/{document_id}/revisions/{revision_id}/transition",
    response_model=LegalDocumentRevisionOut,
    operation_id="transition_legal_document_revision",
)
async def transition_legal_document_revision(
    document_id: UUID,
    revision_id: UUID,
    request: TransitionRequest,
    identity: CurrentIdentity,
    session: DatabaseSession,
    settings: AppSettings,
) -> LegalDocumentRevisionOut:
    try:
        async with session.begin():
            actor = await _org_admin_actor(session, settings, identity)
            return await LegalDocumentService(session).transition(
                actor, document_id, revision_id, request
            )
    except (
        LegalDocumentNotFoundError,
        LegalDocumentForbiddenError,
        LegalDocumentConflictError,
        ValueError,
    ) as error:
        raise _handle(error) from error


@router.post(
    "/documents/{document_id}/revisions/{revision_id}/approvals",
    response_model=LegalDocumentRevisionOut,
    operation_id="record_legal_document_approval",
)
async def record_legal_document_approval(
    document_id: UUID,
    revision_id: UUID,
    request: RecordApprovalRequest,
    identity: CurrentIdentity,
    session: DatabaseSession,
    settings: AppSettings,
) -> LegalDocumentRevisionOut:
    try:
        async with session.begin():
            actor = await _org_admin_actor(session, settings, identity)
            return await LegalDocumentService(session).record_approval(
                actor, document_id, revision_id, request
            )
    except (LegalDocumentNotFoundError, LegalDocumentForbiddenError) as error:
        raise _handle(error) from error


@router.delete(
    "/documents/{document_id}/revisions/{revision_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    operation_id="delete_legal_document_revision",
)
async def delete_legal_document_revision(
    document_id: UUID,
    revision_id: UUID,
    identity: CurrentIdentity,
    session: DatabaseSession,
    settings: AppSettings,
) -> None:
    try:
        async with session.begin():
            actor = await _org_admin_actor(session, settings, identity)
            await LegalDocumentService(session).delete_revision(actor, document_id, revision_id)
    except (
        LegalDocumentNotFoundError,
        LegalDocumentForbiddenError,
        LegalDocumentConflictError,
    ) as error:
        raise _handle(error) from error
