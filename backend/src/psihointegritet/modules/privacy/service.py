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

from psihointegritet.core.config import Settings
from psihointegritet.modules.guidance.authorization import StaffActor
from psihointegritet.modules.identity.models import InternalUser
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
from psihointegritet.shared.domain.publication import (
    CannotDeleteRevisionError,
    RevisionStatus,
    reissues_revision,
    require_transition,
)
from psihointegritet.shared.domain.rich_doc import (
    HeadingBlock,
    LinkMark,
    Mark,
    ParagraphBlock,
    QuoteBlock,
    RichBlock,
    RichDoc,
    Span,
    parse_rich_doc,
)
from psihointegritet.shared.parsing.docx_import import (
    DocxImportLimits,
    DocxImportRejectedError,
    convert_docx_bytes,
)

_EMPTY_BODY: dict[str, object] = {"schemaVersion": 1, "blocks": []}
_DOCX_CONVERSION_TIMEOUT_SECONDS = 20


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

    def _to_schema(
        self, document: LegalDocument, revision: LegalDocumentRevision
    ) -> LegalDocumentRevisionOut:
        approvals = [ApprovalEvidenceOut.model_validate(entry) for entry in revision.approvals]
        return LegalDocumentRevisionOut(
            document_id=document.id,
            revision_id=revision.id,
            kind=document.kind,
            title=revision.title,
            slug=revision.slug,
            body=revision.body,
            status=revision.status,
            version_label=revision.version_label,
            approvals=approvals,
            # No dedicated `updated_at` column on the revision yet — the
            # panel only uses this for display, and `created_at` already
            # changes on every reissue (A.2), which covers the common case.
            updated_at=revision.created_at,
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
                results.append(self._to_schema(document, revision))
        return results

    async def get_document(self, actor: StaffActor, document_id: UUID) -> LegalDocumentRevisionOut:
        document = await self._document(actor, document_id)
        revision = await self._latest_revision(document.id)
        if revision is None:
            raise LegalDocumentNotFoundError(f"Document {document_id} has no revision")
        return self._to_schema(document, revision)

    async def create_document(
        self, actor: StaffActor, request: CreateLegalDocumentRequest
    ) -> LegalDocumentRevisionOut:
        self._require_org_admin(actor)
        if not is_valid_slug(request.slug):
            raise ValueError("Slug is not valid")

        existing = await self._session.scalar(
            select(LegalDocument).where(
                LegalDocument.organization_id == actor.organization_id,
                LegalDocument.kind == request.kind,
            )
        )
        if existing is not None:
            raise LegalDocumentConflictError(f"A document of kind {request.kind} already exists")

        document = LegalDocument(organization_id=actor.organization_id, kind=request.kind)
        self._session.add(document)
        await self._session.flush()

        revision = LegalDocumentRevision(
            document_id=document.id,
            version_label="v1",
            title=request.title,
            slug=request.slug,
            body=dict(_EMPTY_BODY),
            status=RevisionStatus.DRAFT,
            approvals=[],
            created_by_user_id=actor.user_id,
        )
        self._session.add(revision)
        await self._session.flush()
        await self._log_event(revision.id, None, RevisionStatus.DRAFT, actor)
        return self._to_schema(document, revision)

    async def import_docx(
        self, actor: StaffActor, document_id: UUID, data: bytes
    ) -> ImportDocxResponse:
        """Preview-only: converts the upload and returns the result without
        writing anything. The panel applies it via `update_revision`
        (ADR-017 §8 — an import never silently discards or auto-saves)."""
        self._require_org_admin(actor)
        await self._document(actor, document_id)  # tenant check; 404s before we touch the file

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
            body=_rich_doc_to_json(result.document),
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
            revision.slug = patch.slug
        if patch.body is not None:
            # Structural well-formedness only — a body with RICH-0xx
            # findings is still saved (they matter at publish time via
            # `check_publishable`, not while drafting).
            parse_rich_doc(patch.body)
            revision.body = patch.body

        await self._session.flush()
        return self._to_schema(document, revision)

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
            await self._log_event(revision.id, from_status, revision.status, actor)
        elif reissues_revision(revision.status, request.target):
            require_transition(revision.status, request.target)
            reissued = await self._reissue_if_needed(revision, actor)
            revision = reissued
        else:
            require_transition(revision.status, request.target)
            from_status = revision.status
            revision.status = request.target
            if request.target is RevisionStatus.ARCHIVED:
                revision.archived_at = datetime.now(UTC)
            await self._log_event(revision.id, from_status, revision.status, actor)

        await self._session.flush()
        return self._to_schema(document, revision)

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

        await self._session.flush()
        return self._to_schema(document, revision)

    async def _actor_label(self, actor: StaffActor) -> str:
        """Fallback approver label when the panel doesn't collect one yet
        (no reviewer-identity UI — D-033 defers that to real staff accounts).
        Best-effort: the acting user's email, or their bare id if missing."""
        user = await self._session.get(InternalUser, actor.user_id)
        if user is not None and user.email:
            return user.email
        return str(actor.user_id)

    async def delete_revision(
        self, actor: StaffActor, document_id: UUID, revision_id: UUID
    ) -> None:
        self._require_org_admin(actor)
        revision = await self._revision(actor, document_id, revision_id)
        try:
            require_deletable(revision.status)
        except CannotDeleteRevisionError as error:
            raise LegalDocumentConflictError(str(error)) from error
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
        return await self._session.scalar(
            select(LegalDocumentRevision)
            .join(LegalDocument, LegalDocument.id == LegalDocumentRevision.document_id)
            .where(
                LegalDocument.organization_id == organization_id,
                LegalDocument.kind == kind,
                LegalDocumentRevision.status == RevisionStatus.PUBLISHED,
            )
        )

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


def _mark_to_json(mark: Mark) -> object:
    return {"type": "link", "href": mark.href} if isinstance(mark, LinkMark) else mark


def _span_to_json(span: Span) -> dict[str, object]:
    return {"text": span.text, "marks": [_mark_to_json(mark) for mark in span.marks]}


def _block_to_json(block: RichBlock) -> dict[str, object]:
    """Explicit per-variant conversion rather than `dataclasses.asdict`:
    `asdict` preserves tuples instead of converting them to lists, which is
    one more assumption than necessary at a JSON API boundary."""
    if isinstance(block, HeadingBlock):
        return {
            "id": block.id,
            "type": "heading",
            "level": block.level,
            "spans": [_span_to_json(span) for span in block.spans],
        }
    if isinstance(block, ParagraphBlock):
        return {
            "id": block.id,
            "type": "paragraph",
            "spans": [_span_to_json(span) for span in block.spans],
        }
    if isinstance(block, QuoteBlock):
        return {
            "id": block.id,
            "type": "quote",
            "spans": [_span_to_json(span) for span in block.spans],
        }
    # `block` is provably `ListBlock` here — the three prior branches cover
    # every other `RichBlock` variant, so an `isinstance` check on this last
    # one is redundant (pyright flags it as such).
    return {
        "id": block.id,
        "type": "list",
        "ordered": block.ordered,
        "items": [
            {"id": item.id, "spans": [_span_to_json(span) for span in item.spans]}
            for item in block.items
        ],
    }


def _rich_doc_to_json(document: RichDoc) -> dict[str, object]:
    """`convert_docx_bytes` returns dataclasses; the API contract is raw
    JSON (see module docstring), so this walks the tree once at the
    boundary rather than teaching Pydantic the union shape."""
    return {
        "schemaVersion": document.schema_version,
        "blocks": [_block_to_json(block) for block in document.blocks],
    }


def _next_version_label(current: str) -> str:
    if current.startswith("v") and current[1:].isdigit():
        return f"v{int(current[1:]) + 1}"
    return "v1"


async def resolve_intake_submission_ready(session: AsyncSession, settings: Settings) -> bool:
    """LD-6: published legal texts are the primary gate; `Settings`'s own
    env-string check remains available as an explicit local-dev override
    (ADR-014 §4 — "Env ostaje samo kao override za lokalni razvoj").

    Callers that already hold a session inside a transaction (like
    `GuidanceService.submit_public_case`) should call this instead of
    `Settings.intake_submission_ready` directly.
    """
    if not (settings.intake_matching_enabled and settings.intake_sensitive_submission_enabled):
        return False
    if settings.intake_submission_ready:
        # The env-string override is already satisfied (local dev without
        # seeded legal documents) — no need to touch the database.
        return True

    organization = await session.scalar(
        select(Organization).where(Organization.slug == settings.default_organization_slug)
    )
    if organization is None:
        return False
    return await LegalDocumentService(session).intake_gate_open(organization.id)
