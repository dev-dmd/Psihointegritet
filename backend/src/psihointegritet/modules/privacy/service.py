"""Application layer for the legal document registry API (LD-7).

Mirrors the panel's client-side rules in
`frontend/src/features/workspace/legal-documents.ts` and the shared
publication policy in `publication.py` — this module is the backend
authority those mirror, per ADR-014/ADR-016's publication-authority rule.
"""

from __future__ import annotations

import asyncio
from dataclasses import dataclass
from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from psihointegritet.core.config import Environment, Settings
from psihointegritet.modules.guidance.authorization import StaffActor
from psihointegritet.modules.identity.models import InternalUser
from psihointegritet.modules.identity.schemas import ActorSummaryOut
from psihointegritet.modules.organizations.models import Organization
from psihointegritet.modules.privacy.models import (
    LegalDocument,
    LegalDocumentEvent,
    LegalDocumentKind,
    LegalDocumentRevision,
)
from psihointegritet.modules.privacy.publication import (
    check_publishable,
    intake_gate_open,
    is_valid_slug,
    require_deletable,
)
from psihointegritet.modules.privacy.schemas import (
    ApprovalEvidenceOut,
    CreateLegalDocumentRequest,
    ImportDocxFinding,
    ImportDocxResponse,
    LegalDocumentRevisionOut,
    PublishBlockOut,
    RecordApprovalRequest,
    TransitionRequest,
    UpdateLegalDocumentRevisionRequest,
)
from psihointegritet.shared.domain.content_management import ContentManagement
from psihointegritet.shared.domain.publication import (
    ApprovalCapability,
    CannotDeleteRevisionError,
    RevisionStatus,
    reissues_revision,
    require_transition,
)
from psihointegritet.shared.domain.rich_doc import parse_rich_doc, rich_doc_to_json
from psihointegritet.shared.parsing.docx_import import (
    DocxImportLimits,
    DocxImportRejectedError,
    convert_docx_bytes,
)

_EMPTY_BODY: dict[str, object] = {"schemaVersion": 1, "blocks": []}
_DOCX_CONVERSION_TIMEOUT_SECONDS = 20
_RESERVED_CUSTOM_DOCUMENT_SLUGS = frozenset(
    {
        "booking-widget",
        "cene",
        "kolacici",
        "kontakt",
        "o-nama",
        "podrska-roditeljima",
        "pravila-zakazivanja",
        "privatnost",
        "pronadji-podrsku",
        "rad-sa-kompanijama",
        "radionice",
        "tim",
        "uslovi",
        "usluge",
        "zakazi",
        "znanje",
    }
)


class LegalDocumentNotFoundError(LookupError):
    """The document or revision does not exist inside the actor's tenant."""


class LegalDocumentConflictError(RuntimeError):
    """A document of this kind already exists, or the revision is not editable."""


class LegalDocumentForbiddenError(PermissionError):
    """The action requires `org_admin`; the actor does not hold it."""


class LegalDocumentImportError(ValueError):
    """The uploaded file itself was rejected before any content was produced."""


@dataclass(frozen=True, slots=True)
class PublishCheckResult:
    ok: bool
    block: PublishBlockOut | None


@dataclass(frozen=True, slots=True)
class IntakeConsentVersions:
    data_processing_notice: str
    request_acknowledgement: str


class LegalDocumentService:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    def _require_org_admin(self, actor: StaffActor) -> None:
        if not actor.is_org_admin:
            raise LegalDocumentForbiddenError("Only org_admin may manage legal documents")

    async def _document(self, actor: StaffActor, document_id: UUID) -> LegalDocument:
        document = await self._session.scalar(
            select(LegalDocument).where(
                LegalDocument.id == document_id,
                LegalDocument.organization_id == actor.organization_id,
            )
        )
        if document is None:
            raise LegalDocumentNotFoundError(f"Document {document_id} not found")
        return document

    async def _revision(
        self, actor: StaffActor, document_id: UUID, revision_id: UUID
    ) -> LegalDocumentRevision:
        await self._document(actor, document_id)  # tenant-scopes the lookup
        revision = await self._session.scalar(
            select(LegalDocumentRevision).where(
                LegalDocumentRevision.id == revision_id,
                LegalDocumentRevision.document_id == document_id,
            )
        )
        if revision is None:
            raise LegalDocumentNotFoundError(f"Revision {revision_id} not found")
        return revision

    async def _latest_revision(self, document_id: UUID) -> LegalDocumentRevision | None:
        return await self._session.scalar(
            select(LegalDocumentRevision)
            .where(LegalDocumentRevision.document_id == document_id)
            .order_by(LegalDocumentRevision.created_at.desc())
            .limit(1)
        )

    async def _actor_summary(self, user_id: UUID | None) -> ActorSummaryOut | None:
        if user_id is None:
            return None
        user = await self._session.get(InternalUser, user_id)
        if user is None:
            return None
        return ActorSummaryOut(
            user_id=user.id,
            display_name=user.display_name or user.email or str(user.id),
            is_superadmin=user.is_superadmin,
        )

    async def _to_schema(
        self, document: LegalDocument, revision: LegalDocumentRevision
    ) -> LegalDocumentRevisionOut:
        # `updated_at` is populated/onupdate-refreshed by PostgreSQL. Avoid
        # AsyncSession implicit I/O (MissingGreenlet) while serializing.
        await self._session.refresh(revision)
        approvals: list[ApprovalEvidenceOut] = []
        for entry in revision.approvals:
            approver_user_id = _uuid_or_none(entry.get("approver_user_id"))
            approvals.append(
                ApprovalEvidenceOut(
                    capability=ApprovalCapability(entry["capability"]),
                    approver=entry.get("approver"),
                    approver_user_id=approver_user_id,
                    approved_by=await self._actor_summary(approver_user_id),
                    approved_at=entry.get("approved_at"),
                    note=entry.get("note"),
                )
            )
        return LegalDocumentRevisionOut(
            document_id=document.id,
            revision_id=revision.id,
            kind=document.kind,
            management=ContentManagement.DOCUMENT,
            title=revision.title,
            slug=document.slug,
            body=revision.body,
            status=revision.status,
            version_label=revision.version_label,
            approvals=approvals,
            created_by=await self._actor_summary(revision.created_by_user_id),
            updated_by=await self._actor_summary(revision.updated_by_user_id),
            updated_at=revision.updated_at,
        )

    async def list_documents(self, actor: StaffActor) -> list[LegalDocumentRevisionOut]:
        documents = (
            await self._session.scalars(
                select(LegalDocument).where(LegalDocument.organization_id == actor.organization_id)
            )
        ).all()
        results: list[LegalDocumentRevisionOut] = []
        for document in documents:
            revision = await self._latest_revision(document.id)
            if revision is not None:
                results.append(await self._to_schema(document, revision))
        return results

    async def get_document(self, actor: StaffActor, document_id: UUID) -> LegalDocumentRevisionOut:
        document = await self._document(actor, document_id)
        revision = await self._latest_revision(document.id)
        if revision is None:
            raise LegalDocumentNotFoundError(f"Document {document_id} has no revision")
        return await self._to_schema(document, revision)

    async def create_document(
        self, actor: StaffActor, request: CreateLegalDocumentRequest
    ) -> LegalDocumentRevisionOut:
        self._require_org_admin(actor)
        if not is_valid_slug(request.slug):
            raise ValueError("Slug is not valid")

        if (
            request.kind is LegalDocumentKind.CUSTOM_DOCUMENT
            and request.slug in _RESERVED_CUSTOM_DOCUMENT_SLUGS
        ):
            raise LegalDocumentConflictError(
                "Slug is reserved by an existing system or internal page"
            )

        existing_slug = await self._session.scalar(
            select(LegalDocument).where(
                LegalDocument.organization_id == actor.organization_id,
                LegalDocument.slug == request.slug,
            )
        )
        if existing_slug is not None:
            raise LegalDocumentConflictError(f"A document with slug {request.slug} already exists")

        existing_kind = None
        if request.kind is not LegalDocumentKind.CUSTOM_DOCUMENT:
            existing_kind = await self._session.scalar(
                select(LegalDocument).where(
                    LegalDocument.organization_id == actor.organization_id,
                    LegalDocument.kind == request.kind,
                )
            )
        if existing_kind is not None:
            raise LegalDocumentConflictError(f"A document of kind {request.kind} already exists")

        body = request.body if request.body is not None else dict(_EMPTY_BODY)
        parse_rich_doc(body)

        document = LegalDocument(
            organization_id=actor.organization_id,
            kind=request.kind,
            slug=request.slug,
        )
        self._session.add(document)
        await self._session.flush()

        revision = LegalDocumentRevision(
            document_id=document.id,
            version_label="v1",
            title=request.title,
            slug=request.slug,
            body=body,
            status=RevisionStatus.DRAFT,
            approvals=[],
            created_by_user_id=actor.user_id,
            updated_by_user_id=actor.user_id,
        )
        self._session.add(revision)
        await self._session.flush()
        await self._log_event(revision.id, None, RevisionStatus.DRAFT, actor)
        return await self._to_schema(document, revision)

    async def import_docx(
        self, actor: StaffActor, document_id: UUID, data: bytes
    ) -> ImportDocxResponse:
        """Preview-only: converts the upload and returns the result without
        writing anything. The panel applies it via `update_revision`
        (ADR-017 §8 — an import never silently discards or auto-saves)."""
        self._require_org_admin(actor)
        await self._document(actor, document_id)  # tenant check; 404s before we touch the file
        return await self._convert_docx(data)

    async def preview_docx(self, actor: StaffActor, data: bytes) -> ImportDocxResponse:
        """Convert a file for the create form without requiring or creating
        a document. Applying the preview remains an explicit user action."""
        self._require_org_admin(actor)
        return await self._convert_docx(data)

    async def _convert_docx(self, data: bytes) -> ImportDocxResponse:
        try:
            # `convert_docx_bytes` is synchronous, CPU-bound work (mammoth +
            # the zip/HTML parsing) — never call it directly on the event
            # loop (rules §18). The timeout guards against a pathological
            # document that passes the size/ratio checks but is still slow
            # to walk (e.g. thousands of tiny runs).
            result = await asyncio.wait_for(
                asyncio.to_thread(convert_docx_bytes, data, DocxImportLimits()),
                timeout=_DOCX_CONVERSION_TIMEOUT_SECONDS,
            )
        except TimeoutError as error:
            raise LegalDocumentImportError("Konverzija dokumenta je istekla.") from error
        except DocxImportRejectedError as error:
            raise LegalDocumentImportError(str(error)) from error

        findings = [
            ImportDocxFinding(
                rule_id=f.rule_id,
                rule_version=f.rule_version,
                severity=f.severity,
                message=f.message,
                remediation=f.remediation,
                field_path=f.field_path,
            )
            for f in result.findings
        ]
        return ImportDocxResponse(
            body=rich_doc_to_json(result.document),
            findings=findings,
            # Informational only today: legal documents use a fixed
            # per-kind approval matrix (`REQUIRED_APPROVALS`), not the
            # dynamic-finding escalation `modules/content` has — a lossy
            # import (table/image dropped, unknown markup) is surfaced here
            # so the author notices, but does not yet reopen an approved
            # revision's approvals on its own. Wiring that through is
            # tracked as follow-up in CMS_TODO.md.
            requires_approval=any(f.severity in ("warning", "error") for f in result.findings),
        )

    async def _reissue_if_needed(
        self, revision: LegalDocumentRevision, actor: StaffActor
    ) -> LegalDocumentRevision:
        """Contract A.2: `approved -> draft` and `archived -> draft` must not
        mutate the immutable-once-reviewed row. Both issue a NEW draft
        revision instead, approvals dropped, version bumped — mirroring
        `legal-documents.ts::applyTransition`'s reissue branch. (`in_review
        -> draft` is the one return that reopens the SAME revision, so it is
        deliberately not handled here — see `update_revision`'s status
        guard, which never lets a caller reach this with `in_review`.)"""
        if revision.status not in (RevisionStatus.APPROVED, RevisionStatus.ARCHIVED):
            return revision

        next_label = _next_version_label(revision.version_label)
        reissued = LegalDocumentRevision(
            document_id=revision.document_id,
            version_label=next_label,
            title=revision.title,
            slug=revision.slug,
            body=revision.body,
            status=RevisionStatus.DRAFT,
            approvals=[],
            created_by_user_id=actor.user_id,
            updated_by_user_id=actor.user_id,
        )
        self._session.add(reissued)
        await self._session.flush()
        await self._log_event(reissued.id, None, RevisionStatus.DRAFT, actor, reason="reissued")
        return reissued

    async def update_revision(
        self,
        actor: StaffActor,
        document_id: UUID,
        revision_id: UUID,
        patch: UpdateLegalDocumentRevisionRequest,
    ) -> LegalDocumentRevisionOut:
        self._require_org_admin(actor)
        document = await self._document(actor, document_id)
        revision = await self._revision(actor, document_id, revision_id)

        if revision.status not in (RevisionStatus.DRAFT, RevisionStatus.APPROVED):
            raise LegalDocumentConflictError(
                f"Revision in status {revision.status} is not editable; return it to draft first."
            )

        revision = await self._reissue_if_needed(revision, actor)

        if patch.title is not None:
            revision.title = patch.title
        if patch.slug is not None:
            if not is_valid_slug(patch.slug):
                raise ValueError("Slug is not valid")
            if patch.slug != document.slug:
                raise LegalDocumentConflictError(
                    "A document slug is stable after creation and cannot be changed"
                )
        if patch.body is not None:
            # Structural well-formedness only — a body with RICH-0xx
            # findings is still saved (they matter at publish time via
            # `check_publishable`, not while drafting).
            parse_rich_doc(patch.body)
            revision.body = patch.body

        revision.updated_by_user_id = actor.user_id
        await self._session.flush()
        return await self._to_schema(document, revision)

    async def check_publish(
        self, actor: StaffActor, document_id: UUID, revision_id: UUID
    ) -> PublishCheckResult:
        document = await self._document(actor, document_id)
        revision = await self._revision(actor, document_id, revision_id)
        body, _ = parse_rich_doc(revision.body)
        outcome = check_publishable(
            document.kind, revision.status, revision.title, revision.slug, body, revision.approvals
        )
        if outcome.ok:
            return PublishCheckResult(ok=True, block=None)
        return PublishCheckResult(
            ok=False,
            block=PublishBlockOut(
                stage=outcome.stage or "content",
                content_problems=list(outcome.content_problems),
                missing=sorted(outcome.missing, key=lambda item: item.value),
            ),
        )

    async def transition(
        self,
        actor: StaffActor,
        document_id: UUID,
        revision_id: UUID,
        request: TransitionRequest,
    ) -> LegalDocumentRevisionOut:
        self._require_org_admin(actor)
        document = await self._document(actor, document_id)
        revision = await self._revision(actor, document_id, revision_id)

        if request.target is RevisionStatus.PUBLISHED:
            check = await self.check_publish(actor, document_id, revision_id)
            if not check.ok:
                raise LegalDocumentConflictError("Revision is not publishable yet")
            from_status = revision.status
            await self._archive_other_published(document.id, revision.id, actor)
            revision.status = RevisionStatus.PUBLISHED
            revision.published_at = datetime.now(UTC)
            revision.updated_by_user_id = actor.user_id
            await self._log_event(revision.id, from_status, revision.status, actor)
        elif reissues_revision(revision.status, request.target):
            require_transition(revision.status, request.target)
            reissued = await self._reissue_if_needed(revision, actor)
            revision = reissued
        else:
            require_transition(revision.status, request.target)
            from_status = revision.status
            revision.status = request.target
            revision.updated_by_user_id = actor.user_id
            if request.target is RevisionStatus.ARCHIVED:
                revision.archived_at = datetime.now(UTC)
            await self._log_event(revision.id, from_status, revision.status, actor)

        await self._session.flush()
        return await self._to_schema(document, revision)

    async def _archive_other_published(
        self, document_id: UUID, except_revision_id: UUID, actor: StaffActor
    ) -> None:
        """At most one published revision per document (`uq_legal_revision_published`).
        Publishing a new one archives whichever revision currently holds
        that slot, matching the frontend `screen-dokumenti.tsx::publish()`
        behaviour."""
        currently_published = await self._session.scalar(
            select(LegalDocumentRevision).where(
                LegalDocumentRevision.document_id == document_id,
                LegalDocumentRevision.status == RevisionStatus.PUBLISHED,
                LegalDocumentRevision.id != except_revision_id,
            )
        )
        if currently_published is None:
            return
        currently_published.status = RevisionStatus.ARCHIVED
        currently_published.archived_at = datetime.now(UTC)
        currently_published.updated_by_user_id = actor.user_id
        await self._log_event(
            currently_published.id, RevisionStatus.PUBLISHED, RevisionStatus.ARCHIVED, actor
        )

    async def record_approval(
        self,
        actor: StaffActor,
        document_id: UUID,
        revision_id: UUID,
        request: RecordApprovalRequest,
    ) -> LegalDocumentRevisionOut:
        self._require_org_admin(actor)
        document = await self._document(actor, document_id)
        revision = await self._revision(actor, document_id, revision_id)

        approver_label = request.approver_label or await self._actor_label(actor)
        entry = {
            "capability": request.capability.value,
            "approver": approver_label,
            "approver_user_id": str(actor.user_id),
            "approved_at": datetime.now(UTC).isoformat(),
        }
        if request.note:
            entry["note"] = request.note

        # JSON columns are not mutation-tracked — reassign, do not mutate
        # the existing list in place, or SQLAlchemy will not see a change.
        remaining = [
            item
            for item in revision.approvals
            if item.get("capability") != request.capability.value
        ]
        revision.approvals = [*remaining, entry]
        revision.updated_by_user_id = actor.user_id

        await self._session.flush()
        return await self._to_schema(document, revision)

    async def _actor_label(self, actor: StaffActor) -> str:
        """Fallback approver label when the panel doesn't collect one yet
        (no reviewer-identity UI — D-033 defers that to real staff accounts).
        Best-effort: the acting user's display name, email, or bare id."""
        user = await self._session.get(InternalUser, actor.user_id)
        if user is not None and user.display_name:
            return user.display_name
        if user is not None and user.email:
            return user.email
        return str(actor.user_id)

    async def delete_revision(
        self, actor: StaffActor, document_id: UUID, revision_id: UUID
    ) -> None:
        self._require_org_admin(actor)
        document = await self._document(actor, document_id)
        revision = await self._revision(actor, document_id, revision_id)
        try:
            require_deletable(revision.status)
        except CannotDeleteRevisionError as error:
            raise LegalDocumentConflictError(str(error)) from error
        other_revision = await self._session.scalar(
            select(LegalDocumentRevision.id).where(
                LegalDocumentRevision.document_id == document_id,
                LegalDocumentRevision.id != revision_id,
            )
        )
        if other_revision is None:
            await self._session.delete(document)
        else:
            await self._session.delete(revision)
        await self._session.flush()

    async def _log_event(
        self,
        revision_id: UUID,
        from_status: RevisionStatus | None,
        to_status: RevisionStatus,
        actor: StaffActor,
        reason: str | None = None,
    ) -> None:
        self._session.add(
            LegalDocumentEvent(
                revision_id=revision_id,
                from_status=from_status,
                to_status=to_status,
                actor_user_id=actor.user_id,
                reason=reason,
            )
        )

    async def get_published_by_kind(
        self, organization_id: UUID, kind: LegalDocumentKind
    ) -> LegalDocumentRevision | None:
        """Unauthenticated read path (public router): the one published
        revision for this kind, or None. No tenant actor here — the caller
        already resolved `organization_id` from the public default slug."""
        if kind is LegalDocumentKind.CUSTOM_DOCUMENT:
            return None
        return await self._session.scalar(
            select(LegalDocumentRevision)
            .join(LegalDocument, LegalDocument.id == LegalDocumentRevision.document_id)
            .where(
                LegalDocument.organization_id == organization_id,
                LegalDocument.kind == kind,
                LegalDocumentRevision.status == RevisionStatus.PUBLISHED,
            )
        )

    async def get_published_custom_by_slug(
        self, organization_id: UUID, slug: str
    ) -> tuple[LegalDocument, LegalDocumentRevision] | None:
        """Unauthenticated custom-document read path keyed by stable slug."""
        row = (
            await self._session.execute(
                select(LegalDocument, LegalDocumentRevision)
                .join(
                    LegalDocumentRevision,
                    LegalDocumentRevision.document_id == LegalDocument.id,
                )
                .where(
                    LegalDocument.organization_id == organization_id,
                    LegalDocument.kind == LegalDocumentKind.CUSTOM_DOCUMENT,
                    LegalDocument.slug == slug,
                    LegalDocumentRevision.status == RevisionStatus.PUBLISHED,
                )
            )
        ).one_or_none()
        if row is None:
            return None
        return row[0], row[1]

    async def intake_gate_open(self, organization_id: UUID) -> bool:
        """LD-6: reads published revisions directly rather than env strings."""
        published_kinds = (
            await self._session.scalars(
                select(LegalDocument.kind)
                .join(LegalDocumentRevision, LegalDocumentRevision.document_id == LegalDocument.id)
                .where(
                    LegalDocument.organization_id == organization_id,
                    LegalDocumentRevision.status == RevisionStatus.PUBLISHED,
                )
            )
        ).all()
        return intake_gate_open(published_kinds)


def _next_version_label(current: str) -> str:
    if current.startswith("v") and current[1:].isdigit():
        return f"v{int(current[1:]) + 1}"
    return "v1"


def _uuid_or_none(value: object) -> UUID | None:
    if not isinstance(value, str):
        return None
    try:
        return UUID(value)
    except ValueError:
        return None


async def resolve_intake_submission_ready(session: AsyncSession, settings: Settings) -> bool:
    """Compatibility helper for callers that need only the boolean gate."""
    return await resolve_intake_consent_versions(session, settings) is not None


async def resolve_intake_consent_versions(
    session: AsyncSession, settings: Settings
) -> IntakeConsentVersions | None:
    """Resolve the exact two versions a submitted consent must reference.

    Published database revisions are the authority in every environment
    (D-039). Environment strings are accepted only as an explicit local
    development fallback, never in staging/production and never ahead of a
    published revision.
    """
    if not (settings.intake_matching_enabled and settings.intake_sensitive_submission_enabled):
        return None

    organization = await session.scalar(
        select(Organization).where(Organization.slug == settings.default_organization_slug)
    )
    if organization is not None:
        service = LegalDocumentService(session)
        data_notice = await service.get_published_by_kind(
            organization.id, LegalDocumentKind.INTAKE_DATA_PROCESSING_NOTICE
        )
        request_acknowledgement = await service.get_published_by_kind(
            organization.id, LegalDocumentKind.INTAKE_REQUEST_ACKNOWLEDGEMENT
        )
        if data_notice is not None and request_acknowledgement is not None:
            return IntakeConsentVersions(
                data_processing_notice=data_notice.version_label,
                request_acknowledgement=request_acknowledgement.version_label,
            )

    if settings.environment is Environment.DEVELOPMENT and settings.intake_submission_ready:
        return IntakeConsentVersions(
            data_processing_notice=settings.intake_data_processing_notice_version,
            request_acknowledgement=settings.intake_request_acknowledgement_version,
        )
    return None
