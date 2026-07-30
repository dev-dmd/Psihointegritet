"""Application layer for CMS Core content (CG-B3 + CG-B4).

CG-B3 (optimistic locking) ships together with CG-B4 (router) rather than
alone: `modules/content/` had no service or router before this, so a lock
with no writer would be exactly the "empty placeholder abstraction" rules
§25 forbids. See `TODO.md` §5D for the sequencing note.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm.exc import StaleDataError

from psihointegritet.modules.content.health import (
    CONTENT_HEALTH_RULESET_VERSION,
    authored_content_findings,
)
from psihointegritet.modules.content.models import (
    ContentEntry,
    ContentPublicationEvent,
    ContentReviewDecision,
    ContentRevision,
    ContentType,
)
from psihointegritet.modules.content.publication import (
    ContentFinding,
    ContentPublishCheck,
    ReviewDecisionRecord,
    check_publishable,
    effective_required_approvals,
    granted_capabilities,
    require_deletable,
    structural_findings,
)
from psihointegritet.modules.content.schemas import (
    ContentFindingOut,
    ContentHealthOut,
    ContentRevisionOut,
    CreateContentEntryRequest,
    PublicContentRevisionOut,
    PublishBlockOut,
    RecordReviewDecisionRequest,
    ReviewDecisionOut,
    SeoFields,
    TransitionRequest,
    UpdateContentRevisionRequest,
)
from psihointegritet.modules.guidance.authorization import StaffActor
from psihointegritet.modules.identity.models import InternalUser
from psihointegritet.modules.identity.schemas import ActorSummaryOut
from psihointegritet.shared.domain.publication import (
    CannotDeleteRevisionError,
    RevisionStatus,
    reissues_revision,
    require_transition,
)

_EMPTY_SLOT_DATA: dict[str, object] = {}


class ContentNotFoundError(LookupError):
    """The entry or revision does not exist inside the actor's tenant."""


class ContentConflictError(RuntimeError):
    """A slug/type already exists, the revision is not editable, or the
    submitted `lock_version` is stale (CG-B3)."""


class ContentForbiddenError(PermissionError):
    """The action requires `org_admin`; the actor does not hold it."""


@dataclass(frozen=True, slots=True)
class PublishCheckResult:
    ok: bool
    block: PublishBlockOut | None
    outcome: ContentPublishCheck


class ContentService:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    def _require_org_admin(self, actor: StaffActor) -> None:
        if not actor.is_org_admin:
            raise ContentForbiddenError("Only org_admin may manage CMS content")

    async def _entry(self, actor: StaffActor, entry_id: UUID) -> ContentEntry:
        entry = await self._session.scalar(
            select(ContentEntry).where(
                ContentEntry.id == entry_id,
                ContentEntry.organization_id == actor.organization_id,
            )
        )
        if entry is None:
            raise ContentNotFoundError(f"Entry {entry_id} not found")
        return entry

    async def _revision(
        self, actor: StaffActor, entry_id: UUID, revision_id: UUID
    ) -> ContentRevision:
        await self._entry(actor, entry_id)  # tenant-scopes the lookup
        revision = await self._session.scalar(
            select(ContentRevision).where(
                ContentRevision.id == revision_id,
                ContentRevision.entry_id == entry_id,
            )
        )
        if revision is None:
            raise ContentNotFoundError(f"Revision {revision_id} not found")
        return revision

    async def _latest_revision(self, entry_id: UUID) -> ContentRevision | None:
        return await self._session.scalar(
            select(ContentRevision)
            .where(ContentRevision.entry_id == entry_id)
            .order_by(ContentRevision.created_at.desc())
            .limit(1)
        )

    async def _decisions(self, revision_id: UUID) -> list[ContentReviewDecision]:
        return list(
            (
                await self._session.scalars(
                    select(ContentReviewDecision).where(
                        ContentReviewDecision.revision_id == revision_id
                    )
                )
            ).all()
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
        self, entry: ContentEntry, revision: ContentRevision, decisions: list[ContentReviewDecision]
    ) -> ContentRevisionOut:
        created_by = await self._actor_summary(revision.created_by_user_id)
        updated_by = await self._actor_summary(revision.updated_by_user_id)
        return ContentRevisionOut(
            entry_id=entry.id,
            revision_id=revision.id,
            content_type=entry.content_type,
            slug=entry.slug,
            locale=entry.locale,
            template=revision.template,
            slot_data=revision.slot_data,
            seo=SeoFields.model_validate(revision.seo),
            status=revision.status,
            version_label=revision.version_label,
            lock_version=revision.lock_version,
            decisions=[
                ReviewDecisionOut(
                    capability=decision.capability,
                    outcome=decision.outcome,
                    decided_by_user_id=decision.decided_by_user_id,
                    decided_by=await self._actor_summary(decision.decided_by_user_id),
                    decided_at=decision.decided_at,
                    note=decision.note,
                )
                for decision in decisions
            ],
            created_by=created_by,
            updated_by=updated_by,
            updated_at=revision.updated_at,
        )

    async def _to_schema_loaded(
        self, entry: ContentEntry, revision: ContentRevision
    ) -> ContentRevisionOut:
        # `updated_at` is server/onupdate-owned. After a flush SQLAlchemy
        # expires it; reading that attribute implicitly is forbidden in an
        # AsyncSession and raises MissingGreenlet. Refresh explicitly before
        # serializing the response (caught by the real signed-in save smoke).
        await self._session.refresh(revision)
        return await self._to_schema(entry, revision, await self._decisions(revision.id))

    async def list_entries(
        self, actor: StaffActor, content_type: ContentType | None = None
    ) -> list[ContentRevisionOut]:
        self._require_org_admin(actor)
        query = select(ContentEntry).where(ContentEntry.organization_id == actor.organization_id)
        if content_type is not None:
            query = query.where(ContentEntry.content_type == content_type)
        entries = (await self._session.scalars(query)).all()
        results: list[ContentRevisionOut] = []
        for entry in entries:
            revision = await self._latest_revision(entry.id)
            if revision is not None:
                results.append(await self._to_schema_loaded(entry, revision))
        return results

    async def list_published(
        self, organization_id: UUID, locale: str = "sr-Latn"
    ) -> list[PublicContentRevisionOut]:
        """Read model for the unauthenticated public provider.

        Deliberately excludes actor IDs, lock versions, review notes and
        non-published revisions. The public site only needs the immutable
        payload selected by the publication lifecycle.
        """
        rows = (
            await self._session.execute(
                select(ContentEntry, ContentRevision)
                .join(ContentRevision, ContentRevision.entry_id == ContentEntry.id)
                .where(
                    ContentEntry.organization_id == organization_id,
                    ContentEntry.locale == locale,
                    ContentRevision.status == RevisionStatus.PUBLISHED,
                )
                .order_by(ContentEntry.content_type, ContentEntry.slug)
            )
        ).all()
        return [
            PublicContentRevisionOut(
                content_type=entry.content_type,
                slug=entry.slug,
                locale=entry.locale,
                template=revision.template,
                slot_data=revision.slot_data,
                seo=SeoFields.model_validate(revision.seo),
                published_at=revision.published_at or revision.updated_at,
            )
            for entry, revision in rows
        ]

    async def get_entry(self, actor: StaffActor, entry_id: UUID) -> ContentRevisionOut:
        self._require_org_admin(actor)
        entry = await self._entry(actor, entry_id)
        revision = await self._latest_revision(entry.id)
        if revision is None:
            raise ContentNotFoundError(f"Entry {entry_id} has no revision")
        return await self._to_schema_loaded(entry, revision)

    async def get_revision_preview(
        self, actor: StaffActor, entry_id: UUID, revision_id: UUID
    ) -> ContentRevisionOut:
        """Exact saved revision for the private staff preview (CG-D3).

        This deliberately does not use `list_published`: draft/review content
        is returned only after tenant scope and org_admin authorization.
        """

        self._require_org_admin(actor)
        entry = await self._entry(actor, entry_id)
        revision = await self._revision(actor, entry_id, revision_id)
        return await self._to_schema_loaded(entry, revision)

    async def create_entry(
        self, actor: StaffActor, request: CreateContentEntryRequest
    ) -> ContentRevisionOut:
        self._require_org_admin(actor)
        existing = await self._session.scalar(
            select(ContentEntry).where(
                ContentEntry.organization_id == actor.organization_id,
                ContentEntry.content_type == request.content_type,
                ContentEntry.locale == request.locale,
                ContentEntry.slug == request.slug,
            )
        )
        if existing is not None:
            raise ContentConflictError(
                f"An entry with slug {request.slug!r} already exists for this type and locale"
            )

        entry = ContentEntry(
            organization_id=actor.organization_id,
            content_type=request.content_type,
            slug=request.slug,
            locale=request.locale,
        )
        self._session.add(entry)
        await self._session.flush()

        revision = ContentRevision(
            entry_id=entry.id,
            version_label="v1",
            template=request.template,
            slot_data=dict(_EMPTY_SLOT_DATA),
            seo={"title": "", "description": ""},
            status=RevisionStatus.DRAFT,
            created_by_user_id=actor.user_id,
            updated_by_user_id=actor.user_id,
        )
        self._session.add(revision)
        await self._session.flush()
        await self._log_event(revision.id, None, RevisionStatus.DRAFT, actor)
        return await self._to_schema_loaded(entry, revision)

    async def _reissue_if_needed(
        self, revision: ContentRevision, actor: StaffActor
    ) -> ContentRevision:
        """Contract A.2 — same reissue rule as the legal registry
        (`modules/privacy/service.py::_reissue_if_needed`): `approved` and
        `archived` sources get a NEW draft revision, never a mutation of the
        reviewed row. Review decisions are bound to `revision_id`
        (`uq_content_review_capability`), so a reissued revision starts with
        none — no explicit "clear approvals" step needed here, unlike the
        legal registry's JSON list."""
        if revision.status not in (RevisionStatus.APPROVED, RevisionStatus.ARCHIVED):
            return revision

        next_label = _next_version_label(revision.version_label)
        reissued = ContentRevision(
            entry_id=revision.entry_id,
            version_label=next_label,
            template=revision.template,
            slot_data=revision.slot_data,
            seo=revision.seo,
            status=RevisionStatus.DRAFT,
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
        entry_id: UUID,
        revision_id: UUID,
        request: UpdateContentRevisionRequest,
    ) -> ContentRevisionOut:
        self._require_org_admin(actor)
        entry = await self._entry(actor, entry_id)
        revision = await self._revision(actor, entry_id, revision_id)

        if revision.status not in (RevisionStatus.DRAFT, RevisionStatus.APPROVED):
            raise ContentConflictError(
                f"Revision in status {revision.status} is not editable; return it to draft first."
            )
        if request.lock_version != revision.lock_version:
            raise ContentConflictError(
                "Revizija je izmenjena u međuvremenu — osvežite i pokušajte ponovo."
            )

        revision = await self._reissue_if_needed(revision, actor)
        if request.slot_data is not None:
            revision.slot_data = request.slot_data
        if request.seo is not None:
            revision.seo = request.seo.model_dump(
                by_alias=False,
                exclude_none=True,
            )
        revision.updated_by_user_id = actor.user_id

        try:
            await self._session.flush()
        except StaleDataError as error:
            # The narrow race SQLAlchemy's `version_id_col` catches at
            # flush time, on top of the explicit pre-check above.
            raise ContentConflictError(
                "Revizija je izmenjena u međuvremenu — osvežite i pokušajte ponovo."
            ) from error

        return await self._to_schema_loaded(entry, revision)

    async def check_publish(
        self, actor: StaffActor, entry_id: UUID, revision_id: UUID
    ) -> PublishCheckResult:
        self._require_org_admin(actor)
        entry = await self._entry(actor, entry_id)
        revision = await self._revision(actor, entry_id, revision_id)
        decisions = [
            ReviewDecisionRecord(capability=d.capability, outcome=d.outcome)
            for d in await self._decisions(revision.id)
        ]
        extra_findings = authored_content_findings(entry, revision)
        outcome: ContentPublishCheck = check_publishable(
            entry.content_type,
            revision.template,
            revision.status,
            revision.slot_data,
            decisions,
            extra_findings=extra_findings,
        )
        if outcome.ok:
            return PublishCheckResult(ok=True, block=None, outcome=outcome)
        return PublishCheckResult(
            ok=False,
            block=PublishBlockOut(
                stage=outcome.stage or "content",
                findings=[_finding_out(f) for f in outcome.findings],
                missing=sorted(outcome.missing, key=lambda item: item.value),
            ),
            outcome=outcome,
        )

    async def content_health(
        self, actor: StaffActor, entry_id: UUID, revision_id: UUID
    ) -> ContentHealthOut:
        """Always return findings for the saved revision, including warnings.

        Publish-check remains the staged lifecycle endpoint and can return
        `null` when publication is allowed. This endpoint is the read-only
        Content Health surface, so a clean revision and a warning-only
        revision remain distinguishable in the panel.
        """

        self._require_org_admin(actor)
        entry = await self._entry(actor, entry_id)
        revision = await self._revision(actor, entry_id, revision_id)
        decisions = [
            ReviewDecisionRecord(capability=item.capability, outcome=item.outcome)
            for item in await self._decisions(revision.id)
        ]
        findings = structural_findings(
            revision.template, revision.slot_data
        ) + authored_content_findings(entry, revision)
        required = effective_required_approvals(entry.content_type, revision.template, findings)
        missing = required - granted_capabilities(decisions)
        summary = {"info": 0, "warning": 0, "error": 0}
        for finding in findings:
            summary[finding.severity] += 1
        return ContentHealthOut(
            rule_set_version=CONTENT_HEALTH_RULESET_VERSION,
            checked_at=datetime.now(UTC),
            summary=summary,
            findings=[_finding_out(item) for item in findings],
            required_approvals=sorted(required, key=lambda item: item.value),
            missing_approvals=sorted(missing, key=lambda item: item.value),
        )

    async def transition(
        self,
        actor: StaffActor,
        entry_id: UUID,
        revision_id: UUID,
        request: TransitionRequest,
    ) -> ContentRevisionOut:
        self._require_org_admin(actor)
        entry = await self._entry(actor, entry_id)
        revision = await self._revision(actor, entry_id, revision_id)

        if request.target is RevisionStatus.PUBLISHED:
            check = await self.check_publish(actor, entry_id, revision_id)
            if not check.ok:
                raise ContentConflictError("Revision is not publishable yet")
            from_status = revision.status
            await self._archive_other_published(entry.id, revision.id, actor)
            revision.status = RevisionStatus.PUBLISHED
            revision.published_at = datetime.now(UTC)
            revision.validation_snapshot = _validation_snapshot(check.outcome.findings)
            revision.updated_by_user_id = actor.user_id
            await self._log_event(revision.id, from_status, revision.status, actor)
        elif reissues_revision(revision.status, request.target):
            require_transition(revision.status, request.target)
            revision = await self._reissue_if_needed(revision, actor)
        else:
            if request.target is RevisionStatus.APPROVED:
                decisions = [
                    ReviewDecisionRecord(capability=item.capability, outcome=item.outcome)
                    for item in await self._decisions(revision.id)
                ]
                findings = structural_findings(
                    revision.template, revision.slot_data
                ) + authored_content_findings(entry, revision)
                if any(item.severity == "error" for item in findings):
                    raise ContentConflictError(
                        "Revision cannot be approved while Content Health has blocking findings"
                    )
                required = effective_required_approvals(
                    entry.content_type, revision.template, findings
                )
                missing = required - granted_capabilities(decisions)
                if missing:
                    labels = ", ".join(sorted(item.value for item in missing))
                    raise ContentConflictError(
                        f"Revision cannot be approved; missing decisions: {labels}"
                    )
                revision.validation_snapshot = _validation_snapshot(findings)
            require_transition(revision.status, request.target)
            from_status = revision.status
            revision.status = request.target
            revision.updated_by_user_id = actor.user_id
            if request.target is RevisionStatus.ARCHIVED:
                revision.archived_at = datetime.now(UTC)
            await self._log_event(revision.id, from_status, revision.status, actor)

        await self._session.flush()
        return await self._to_schema_loaded(entry, revision)

    async def _archive_other_published(
        self, entry_id: UUID, except_revision_id: UUID, actor: StaffActor
    ) -> None:
        """At most one published revision per entry (`uq_content_revision_published`)."""
        currently_published = await self._session.scalar(
            select(ContentRevision).where(
                ContentRevision.entry_id == entry_id,
                ContentRevision.status == RevisionStatus.PUBLISHED,
                ContentRevision.id != except_revision_id,
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

    async def record_review_decision(
        self,
        actor: StaffActor,
        entry_id: UUID,
        revision_id: UUID,
        request: RecordReviewDecisionRequest,
    ) -> ContentRevisionOut:
        self._require_org_admin(actor)
        entry = await self._entry(actor, entry_id)
        revision = await self._revision(actor, entry_id, revision_id)
        if revision.status is not RevisionStatus.IN_REVIEW:
            raise ContentConflictError(
                "Review decisions may be recorded only while a revision is in review"
            )

        existing = await self._session.scalar(
            select(ContentReviewDecision).where(
                ContentReviewDecision.revision_id == revision.id,
                ContentReviewDecision.capability == request.capability,
            )
        )
        if existing is not None:
            existing.outcome = request.outcome
            existing.decided_by_user_id = actor.user_id
            existing.decided_at = datetime.now(UTC)
            existing.note = request.note
        else:
            self._session.add(
                ContentReviewDecision(
                    revision_id=revision.id,
                    capability=request.capability,
                    outcome=request.outcome,
                    decided_by_user_id=actor.user_id,
                    note=request.note,
                )
            )

        revision.updated_by_user_id = actor.user_id
        await self._session.flush()
        return await self._to_schema_loaded(entry, revision)

    async def delete_revision(self, actor: StaffActor, entry_id: UUID, revision_id: UUID) -> None:
        self._require_org_admin(actor)
        revision = await self._revision(actor, entry_id, revision_id)
        try:
            require_deletable(revision.status)
        except CannotDeleteRevisionError as error:
            raise ContentConflictError(str(error)) from error
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
            ContentPublicationEvent(
                revision_id=revision_id,
                from_status=from_status,
                to_status=to_status,
                actor_user_id=actor.user_id,
                reason=reason,
            )
        )


def _finding_out(finding: ContentFinding) -> ContentFindingOut:
    return ContentFindingOut(
        rule_id=finding.rule_id,
        rule_version=finding.rule_version,
        severity=finding.severity,
        message=finding.message,
        remediation=finding.remediation,
        field_path=finding.field_path,
        requires_approval=finding.requires_approval,
    )


def _validation_snapshot(findings: tuple[ContentFinding, ...]) -> dict[str, object]:
    """Durable evidence of the ruleset applied at approve/publish time."""

    return {
        "ruleSetVersion": CONTENT_HEALTH_RULESET_VERSION,
        "checkedAt": datetime.now(UTC).isoformat(),
        "findings": [
            {
                "ruleId": finding.rule_id,
                "ruleVersion": finding.rule_version,
                "severity": finding.severity,
                "fieldPath": finding.field_path,
                "requiresApproval": (
                    finding.requires_approval.value if finding.requires_approval else None
                ),
            }
            for finding in findings
        ],
    }


def _next_version_label(current: str) -> str:
    if current.startswith("v") and current[1:].isdigit():
        return f"v{int(current[1:]) + 1}"
    return "v1"
