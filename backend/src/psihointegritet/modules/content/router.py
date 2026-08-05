"""CMS Core content API (CG-B4).

Pattern: `modules/privacy/router.py` / `modules/guidance/router.py`'s
`team_router` — Clerk JWT via `CurrentIdentity`, PostgreSQL-resolved
membership via `resolve_staff_actor`, `org_admin` required for every mutation
(rules §10.3 — authentication is not authorization).
"""

from __future__ import annotations

import asyncio
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, File, HTTPException, UploadFile, status
from sqlalchemy import select

from psihointegritet.api.dependencies import AppSettings, CurrentIdentity, DatabaseSession
from psihointegritet.modules.content.models import ContentType
from psihointegritet.modules.content.schemas import (
    ContentHealthOut,
    ContentRevisionOut,
    CreateContentEntryRequest,
    NewContentDraftRequest,
    NormalizeRichHtmlRequest,
    NormalizeRichHtmlResponse,
    PublicContentRevisionOut,
    PublishBlockOut,
    RecordReviewDecisionRequest,
    RichDocFindingOut,
    SubmitArticleForReviewRequest,
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
    staff_authorization_message,
)
from psihointegritet.modules.organizations.models import Organization
from psihointegritet.shared.domain.rich_doc import rich_doc_to_json
from psihointegritet.shared.parsing.docx_import import (
    DocxImportLimits,
    DocxImportRejectedError,
    convert_docx_bytes,
)
from psihointegritet.shared.parsing.html_normalize import normalize_html_to_rich_doc
from psihointegritet.shared.parsing.upload import read_docx_upload

router = APIRouter(prefix="/content", tags=["content"])
public_router = APIRouter(prefix="/public/content", tags=["public-content"])


@public_router.get(
    "/published",
    response_model=list[PublicContentRevisionOut],
    operation_id="list_public_content",
)
async def list_public_content(
    session: DatabaseSession,
    settings: AppSettings,
    locale: str = "sr-Latn",
) -> list[PublicContentRevisionOut]:
    """Only immutable published overrides for the configured public tenant."""
    async with session.begin():
        organization = await session.scalar(
            select(Organization).where(Organization.slug == settings.default_organization_slug)
        )
        if organization is None:
            return []
        return await ContentService(session).list_published(organization.id, locale)


async def _org_admin_actor(
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
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only org_admin may manage CMS content",
        )
    return actor


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


#: Guards a document that passes the size checks but is still slow to walk
#: (thousands of tiny runs). Same budget the legal registry uses.
_DOCX_CONVERSION_TIMEOUT_SECONDS = 20


@router.post(
    "/rich-doc/import-docx",
    response_model=NormalizeRichHtmlResponse,
    operation_id="import_rich_doc_docx",
)
async def import_rich_doc_docx(
    identity: CurrentIdentity,
    session: DatabaseSession,
    settings: AppSettings,
    file: Annotated[UploadFile, File()],
) -> NormalizeRichHtmlResponse:
    """Convert a `.docx` into RichDoc for any staff editor, writing nothing.

    Preview only, exactly like the legal registry's import (ADR-017 Amendment 1
    §A1.2): the panel shows the result and the author applies it by saving the
    revision. Same conversion, same limits, same findings — the article editor
    must not grow a second, subtly different importer.
    """
    data = await read_docx_upload(file)
    async with session.begin():
        await _org_admin_actor(session, settings, identity)
    try:
        # CPU-bound (mammoth + zip/HTML parsing) — never on the event loop
        # (rules §18).
        result = await asyncio.wait_for(
            asyncio.to_thread(convert_docx_bytes, data, DocxImportLimits()),
            timeout=_DOCX_CONVERSION_TIMEOUT_SECONDS,
        )
    except TimeoutError as error:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="Konverzija dokumenta je istekla.",
        ) from error
    except DocxImportRejectedError as error:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail=str(error),
        ) from error

    return NormalizeRichHtmlResponse(
        body=rich_doc_to_json(result.document),
        findings=[
            RichDocFindingOut(
                rule_id=finding.rule_id,
                rule_version=finding.rule_version,
                severity=finding.severity,
                message=finding.message,
                remediation=finding.remediation,
                field_path=finding.field_path,
            )
            for finding in result.findings
        ],
    )


@router.post(
    "/rich-doc/normalize-html",
    response_model=NormalizeRichHtmlResponse,
    operation_id="normalize_rich_html",
)
async def normalize_rich_html(
    request: NormalizeRichHtmlRequest,
    identity: CurrentIdentity,
    session: DatabaseSession,
    settings: AppSettings,
) -> NormalizeRichHtmlResponse:
    """One allowlist normalizer for paste in every staff RichDoc editor."""
    async with session.begin():
        await _org_admin_actor(session, settings, identity)
    document, findings = normalize_html_to_rich_doc(request.html)
    return NormalizeRichHtmlResponse(
        body=rich_doc_to_json(document),
        findings=[
            RichDocFindingOut(
                rule_id=finding.rule_id,
                rule_version=finding.rule_version,
                severity=finding.severity,
                message=finding.message,
                remediation=finding.remediation,
                field_path=finding.field_path,
            )
            for finding in findings
        ],
    )


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


@router.get(
    "/entries/{entry_id}/revisions/{revision_id}/preview",
    response_model=ContentRevisionOut,
    operation_id="get_content_revision_preview",
)
async def get_content_revision_preview(
    entry_id: UUID,
    revision_id: UUID,
    identity: CurrentIdentity,
    session: DatabaseSession,
    settings: AppSettings,
) -> ContentRevisionOut:
    """Private exact-revision source for the staff preview route (CG-D3)."""
    try:
        async with session.begin():
            actor = await _org_admin_actor(session, settings, identity)
            return await ContentService(session).get_revision_preview(actor, entry_id, revision_id)
    except (ContentNotFoundError, ContentForbiddenError) as error:
        raise _handle(error) from error


@router.get(
    "/entries/{entry_id}/revisions/{revision_id}/content-health",
    response_model=ContentHealthOut,
    operation_id="get_content_revision_health",
)
async def get_content_revision_health(
    entry_id: UUID,
    revision_id: UUID,
    identity: CurrentIdentity,
    session: DatabaseSession,
    settings: AppSettings,
) -> ContentHealthOut:
    """Authoritative saved-revision findings, including warnings (CG-D4)."""
    try:
        async with session.begin():
            actor = await _org_admin_actor(session, settings, identity)
            return await ContentService(session).content_health(actor, entry_id, revision_id)
    except (ContentNotFoundError, ContentForbiddenError) as error:
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
    "/entries/{entry_id}/revisions/{revision_id}/submit-review",
    response_model=ContentRevisionOut,
    operation_id="submit_article_for_review",
)
async def submit_article_for_review(
    entry_id: UUID,
    revision_id: UUID,
    request: SubmitArticleForReviewRequest,
    identity: CurrentIdentity,
    session: DatabaseSession,
    settings: AppSettings,
) -> ContentRevisionOut:
    """Atomic save + transition ``draft → in_review`` in one transaction.

    Idempotent: calling with the same ``idempotencyKey`` returns the
    already-in-review revision; calling without changes on an already-in-review
    revision also succeeds.  Only the first caller receives the side-effects
    (audit event, outbox record).
    """
    try:
        async with session.begin():
            actor = await _org_admin_actor(session, settings, identity)
            return await ContentService(session).submit_article_for_review(
                actor, entry_id, revision_id, request,
            )
    except (
        ContentNotFoundError,
        ContentForbiddenError,
        ContentConflictError,
        ValueError,
    ) as error:
        raise _handle(error) from error


@router.post(
    "/entries/{entry_id}/revisions/{revision_id}/new-draft",
    response_model=ContentRevisionOut,
    status_code=status.HTTP_201_CREATED,
    operation_id="new_content_draft",
)
async def new_content_draft(
    entry_id: UUID,
    revision_id: UUID,
    request: NewContentDraftRequest,
    identity: CurrentIdentity,
    session: DatabaseSession,
    settings: AppSettings,
) -> ContentRevisionOut:
    """Create a new DRAFT revision copying content from the current one (RW-3).

    Does not mutate the source revision.  Published and archived sources stay
    as-is; in_review and approved sources are marked as superseded.
    """
    try:
        async with session.begin():
            actor = await _org_admin_actor(session, settings, identity)
            return await ContentService(session).create_new_draft(
                actor, entry_id, revision_id, request,
            )
    except (
        ContentNotFoundError,
        ContentForbiddenError,
        ContentConflictError,
        ValueError,
    ) as error:
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
    except (ContentNotFoundError, ContentForbiddenError, ContentConflictError) as error:
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
