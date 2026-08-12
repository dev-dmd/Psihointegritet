"""Application layer for CMS Core content (CG-B3 + CG-B4).

CG-B3 (optimistic locking) ships together with CG-B4 (router) rather than
alone: `modules/content/` had no service or router before this, so a lock
with no writer would be exactly the "empty placeholder abstraction" rules
§25 forbids. See `TODO.md` §5D for the sequencing note.
"""

from __future__ import annotations

import contextlib
import os
from dataclasses import dataclass
from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy import delete, func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm.exc import StaleDataError

from psihointegritet.modules.content.health import (
    CONTENT_HEALTH_RULESET_VERSION,
    authored_content_findings,
)
from psihointegritet.modules.content.identity import require_content_identity
from psihointegritet.modules.content.models import (
    ContentEntry,
    ContentPublicationEvent,
    ContentReviewAssignment,
    ContentReviewDecision,
    ContentRevision,
    ContentRevisionDiscovery,
    ContentRevisionRelation,
    ContentRevisionTaxonomyTerm,
    ContentSubmitIdempotency,
    ContentTaxonomyRole,
    ContentType,
    NotificationOutbox,
    ReviewOutcome,
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
    ContentDiscoveryMetadata,
    ContentFindingOut,
    ContentHealthOut,
    ContentReviewAssignmentOut,
    ContentReviewQueueItemOut,
    ContentRevisionChangeRequestOut,
    ContentRevisionOut,
    CreateContentEntryRequest,
    CreateContentReviewAssignmentRequest,
    NewContentDraftRequest,
    PublicContentRevisionOut,
    PublishBlockOut,
    RecordReviewDecisionRequest,
    ReviewDecisionOut,
    SeoFields,
    StaffUserOut,
    SubmitArticleForReviewRequest,
    TransitionRequest,
    UpdateContentRevisionRequest,
)
from psihointegritet.modules.content.system_catalog import is_system_content_definition
from psihointegritet.modules.content.taxonomy_models import (
    TaxonomyAxis,
    TaxonomyPublicationEvent,
    TaxonomyTerm,
    TaxonomyTermRevision,
)
from psihointegritet.modules.guidance.authorization import StaffActor
from psihointegritet.modules.identity.models import InternalUser
from psihointegritet.modules.identity.schemas import ActorSummaryOut
from psihointegritet.shared.domain.content_management import ContentManagement
from psihointegritet.shared.domain.publication import (
    ApprovalCapability,
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

    async def _discovery(self, revision_id: UUID) -> ContentDiscoveryMetadata:
        """Read stable IDs through their role; absent metadata is intentional.

        Existing system pages predate Kompas and stay editable/publishable. A
        separate eligibility finding explains why they are not catalogue
        material until an editor completes these controlled fields.
        """
        references = (
            await self._session.scalars(
                select(ContentRevisionTaxonomyTerm).where(
                    ContentRevisionTaxonomyTerm.revision_id == revision_id
                )
            )
        ).all()
        discovery = await self._session.get(ContentRevisionDiscovery, revision_id)
        relations = (
            await self._session.scalars(
                select(ContentRevisionRelation.target_entry_id).where(
                    ContentRevisionRelation.revision_id == revision_id
                )
            )
        ).all()
        by_role: dict[ContentTaxonomyRole, list[UUID]] = {}
        for reference in references:
            by_role.setdefault(reference.role, []).append(reference.term_id)
        return ContentDiscoveryMetadata(
            topic_group_term_id=(by_role.get(ContentTaxonomyRole.TOPIC_GROUP) or [None])[0],
            topic_term_ids=by_role.get(ContentTaxonomyRole.TOPIC, []),
            audience_term_ids=by_role.get(ContentTaxonomyRole.AUDIENCE, []),
            content_goal_term_ids=by_role.get(ContentTaxonomyRole.CONTENT_GOAL, []),
            journey_intent_term_id=(
                discovery.journey_intent_term_id if discovery is not None else None
            ),
            content_format_term_id=(
                discovery.content_format_term_id if discovery is not None else None
            ),
            access_level_term_id=(
                discovery.access_level_term_id if discovery is not None else None
            ),
            related_content_entry_ids=list(relations),
        )

    async def _require_taxonomy_term(
        self,
        actor: StaffActor,
        term_id: UUID,
        axis: TaxonomyAxis,
        locale: str,
        field_path: str,
        *,
        strict: bool = True,
    ) -> TaxonomyTermRevision:
        term = await self._session.get(TaxonomyTerm, term_id)
        if (
            term is None
            or term.axis is not axis
            or term.organization_id
            not in (
                None,
                actor.organization_id,
            )
        ):
            raise ValueError("Izaberite aktivnu vrednost iz odgovarajuće Kompas liste.")
        tenant_revision = await self._session.scalar(
            select(TaxonomyTermRevision).where(
                TaxonomyTermRevision.term_id == term.id,
                TaxonomyTermRevision.organization_id == actor.organization_id,
                TaxonomyTermRevision.locale == locale,
                TaxonomyTermRevision.status != "archived",
            )
        )
        revision = tenant_revision
        if revision is None and term.system_defined:
            revision = await self._session.scalar(
                select(TaxonomyTermRevision).where(
                    TaxonomyTermRevision.term_id == term.id,
                    TaxonomyTermRevision.organization_id.is_(None),
                    TaxonomyTermRevision.locale == locale,
                    TaxonomyTermRevision.status != "archived",
                )
            )
        if revision is None:
            raise ValueError(
                f"Izabrana Kompas vrednost za „{field_path}” ne postoji ili je arhivirana."
            )
        if strict and revision.status != RevisionStatus.PUBLISHED:
            raise ValueError(
                f"Izabrana Kompas vrednost za „{field_path}” nije objavljena i aktivna."
            )
        return revision

    async def _replace_discovery(
        self,
        actor: StaffActor,
        revision: ContentRevision,
        locale: str,
        metadata: ContentDiscoveryMetadata,
        *,
        strict: bool = False,
    ) -> None:
        """Persist only registry IDs, after validating every reference server-side.

        When `strict` is False (default during editing), draft/in-review terms
        are accepted — the gate moves to publish time (D-065)."""
        unique_topic_ids = list(dict.fromkeys(metadata.topic_term_ids))
        unique_audience_ids = list(dict.fromkeys(metadata.audience_term_ids))
        unique_goal_ids = list(dict.fromkeys(metadata.content_goal_term_ids))
        if metadata.topic_group_term_id is not None:
            await self._require_taxonomy_term(
                actor,
                metadata.topic_group_term_id,
                TaxonomyAxis.TOPIC_GROUP,
                locale,
                "oblast",
                strict=strict,
            )
        for term_id in unique_topic_ids:
            topic_revision = await self._require_taxonomy_term(
                actor, term_id, TaxonomyAxis.TOPIC, locale, "teme", strict=strict
            )
            if (
                metadata.topic_group_term_id is not None
                and topic_revision.primary_parent_term_id != metadata.topic_group_term_id
            ):
                raise ValueError("Svaka izabrana tema mora pripadati izabranoj oblasti.")
        for term_id in unique_audience_ids:
            await self._require_taxonomy_term(
                actor, term_id, TaxonomyAxis.AUDIENCE, locale, "publika", strict=strict
            )
        for term_id in unique_goal_ids:
            await self._require_taxonomy_term(
                actor, term_id, TaxonomyAxis.CONTENT_GOAL, locale, "cilj sadržaja", strict=strict
            )
        if metadata.journey_intent_term_id is not None:
            await self._require_taxonomy_term(
                actor,
                metadata.journey_intent_term_id,
                TaxonomyAxis.JOURNEY_INTENT,
                locale,
                "put korisnika",
                strict=strict,
            )
        if metadata.content_format_term_id is not None:
            await self._require_taxonomy_term(
                actor,
                metadata.content_format_term_id,
                TaxonomyAxis.CONTENT_FORMAT,
                locale,
                "format",
                strict=strict,
            )
        if metadata.access_level_term_id is not None:
            access = await self._require_taxonomy_term(
                actor,
                metadata.access_level_term_id,
                TaxonomyAxis.ACCESS_LEVEL,
                locale,
                "pristup",
                strict=strict,
            )
            # The only currently public CMS renderer is public. Do not let an
            # editor select an entitlement label the route cannot enforce.
            access_term = await self._session.get(TaxonomyTerm, access.term_id)
            if access_term is None or access_term.stable_id != "public":
                raise ValueError(
                    "Za postojeće CMS stranice trenutno je dostupan samo javni pristup."
                )
        related_entry_ids = list(dict.fromkeys(metadata.related_content_entry_ids))
        for target_entry_id in related_entry_ids:
            if target_entry_id == revision.entry_id:
                raise ValueError("Sadržaj ne može preporučiti samog sebe.")
            target = await self._session.scalar(
                select(ContentEntry).where(
                    ContentEntry.id == target_entry_id,
                    ContentEntry.organization_id == actor.organization_id,
                    ContentEntry.content_type.in_((ContentType.SERVICE, ContentType.PROGRAM)),
                )
            )
            if target is None:
                raise ValueError(
                    "Možete povezati samo postojeću uslugu ili program svoje organizacije."
                )
            published = await self._session.scalar(
                select(ContentRevision.id).where(
                    ContentRevision.entry_id == target.id,
                    ContentRevision.status == RevisionStatus.PUBLISHED,
                )
            )
            if published is None:
                raise ValueError("Povezana usluga ili program prvo mora biti objavljen.")

        await self._session.execute(
            delete(ContentRevisionTaxonomyTerm).where(
                ContentRevisionTaxonomyTerm.revision_id == revision.id
            )
        )
        await self._session.execute(
            delete(ContentRevisionRelation).where(
                ContentRevisionRelation.revision_id == revision.id
            )
        )
        role_values = (
            (
                ContentTaxonomyRole.TOPIC_GROUP,
                [metadata.topic_group_term_id] if metadata.topic_group_term_id else [],
            ),
            (ContentTaxonomyRole.TOPIC, unique_topic_ids),
            (ContentTaxonomyRole.AUDIENCE, unique_audience_ids),
            (ContentTaxonomyRole.CONTENT_GOAL, unique_goal_ids),
        )
        for role, term_ids in role_values:
            for term_id in term_ids:
                self._session.add(
                    ContentRevisionTaxonomyTerm(revision_id=revision.id, term_id=term_id, role=role)
                )
        for target_entry_id in related_entry_ids:
            self._session.add(
                ContentRevisionRelation(
                    revision_id=revision.id,
                    target_entry_id=target_entry_id,
                )
            )
        row = await self._session.get(ContentRevisionDiscovery, revision.id)
        if row is None:
            row = ContentRevisionDiscovery(revision_id=revision.id)
            self._session.add(row)
        row.journey_intent_term_id = metadata.journey_intent_term_id
        row.content_format_term_id = metadata.content_format_term_id
        row.access_level_term_id = metadata.access_level_term_id

    async def _to_schema(
        self, entry: ContentEntry, revision: ContentRevision, decisions: list[ContentReviewDecision]
    ) -> ContentRevisionOut:
        created_by = await self._actor_summary(revision.created_by_user_id)
        updated_by = await self._actor_summary(revision.updated_by_user_id)
        change_request: ContentRevisionChangeRequestOut | None = None
        if revision.source_revision_id:
            source_decisions = (
                await self._session.scalars(
                    select(ContentReviewDecision)
                    .where(
                        ContentReviewDecision.revision_id == revision.source_revision_id,
                        ContentReviewDecision.outcome == ReviewOutcome.REJECTED,
                    )
                    .order_by(ContentReviewDecision.decided_at.desc())
                    .limit(1)
                )
            ).first()
            if source_decisions:
                change_request = ContentRevisionChangeRequestOut(
                    requested_by=await self._actor_summary(source_decisions.decided_by_user_id),
                    requested_at=source_decisions.decided_at,
                    capability=source_decisions.capability,
                    note=source_decisions.note or "",
                    source_revision_id=revision.source_revision_id,
                )
        return ContentRevisionOut(
            entry_id=entry.id,
            revision_id=revision.id,
            content_type=entry.content_type,
            management=ContentManagement.SYSTEM,
            slug=entry.slug,
            locale=entry.locale,
            template=revision.template,
            slot_data=revision.slot_data,
            seo=SeoFields.model_validate(revision.seo),
            discovery=await self._discovery(revision.id),
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
            change_request=change_request,
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
                management=ContentManagement.SYSTEM,
                slug=entry.slug,
                locale=entry.locale,
                template=revision.template,
                slot_data=revision.slot_data,
                seo=SeoFields.model_validate(revision.seo),
                published_at=revision.published_at or revision.updated_at,
            )
            for entry, revision in rows
            if is_system_content_definition(
                entry.content_type,
                entry.slug,
                revision.template,
                entry.locale,
            )
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
        require_content_identity(
            request.content_type,
            request.slug,
            request.template,
            request.locale,
        )
        existing = await self._session.scalar(
            select(ContentEntry).where(
                ContentEntry.organization_id == actor.organization_id,
                ContentEntry.content_type == request.content_type,
                ContentEntry.locale == request.locale,
                ContentEntry.slug == request.slug,
            )
        )
        if existing is not None:
            # Older delete behavior could leave an entry with no revisions.
            # Reuse that stable identity so a protected page never gets stuck
            # behind a permanent 409.
            if await self._latest_revision(existing.id) is not None:
                raise ContentConflictError(
                    f"An entry with slug {request.slug!r} already exists for this type and locale"
                )
            entry = existing
        else:
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
        self, revision: ContentRevision, actor: StaffActor, locale: str
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
        previous_discovery = await self._discovery(revision.id)
        await self._replace_discovery(actor, reissued, locale, previous_discovery)
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

        revision = await self._reissue_if_needed(revision, actor, entry.locale)
        if request.slot_data is not None:
            revision.slot_data = request.slot_data
        if request.seo is not None:
            revision.seo = request.seo.model_dump(
                by_alias=False,
                exclude_none=True,
            )
        if request.discovery is not None:
            await self._replace_discovery(actor, revision, entry.locale, request.discovery)
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
        # D-065: re-validate discovery references in strict mode at publish time.
        # Draft/in-review terms that were accepted during editing are now
        # blocking findings.
        discovery_findings: tuple[ContentFinding, ...] = ()
        try:
            discovery = await self._discovery(revision.id)
            await self._replace_discovery(actor, revision, entry.locale, discovery, strict=True)
        except ValueError as exc:
            discovery_findings = (
                ContentFinding(
                    rule_id="KOMPAS-REF-001",
                    rule_version="1",
                    severity="error",
                    message=str(exc),
                    remediation="Objavite termin(e) u Kompasu, pa pošaljite tekst na pregled.",
                    field_path="discovery",
                ),
            )
        extra_findings = authored_content_findings(entry, revision) + discovery_findings
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
        findings = (
            structural_findings(revision.template, revision.slot_data)
            + authored_content_findings(entry, revision)
            + _discovery_findings(await self._discovery(revision.id))
        )
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
            revision = await self._reissue_if_needed(revision, actor, entry.locale)
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

        # ---- four-eyes rule (D-068 rule 4) --------------------------------
        if request.outcome == ReviewOutcome.APPROVED:
            submitters = await self._submission_actors(revision.id)
            if actor.user_id in submitters:
                raise ContentConflictError(
                    "Ne možete odobriti tekst koji ste sami poslali na pregled."
                    " Potreban je drugi član tima za odobrenje."
                )

        # ---- upsert decision -----------------------------------------------
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

        # ---- rejected → create new draft + supersede (RW-4) -----------------
        if request.outcome == ReviewOutcome.REJECTED:
            if not request.note:
                raise ValueError("Vraćanje na doradu zahteva obrazloženje.")
            next_label = _next_version_label(revision.version_label)
            draft = ContentRevision(
                entry_id=entry.id,
                version_label=next_label,
                template=revision.template,
                slot_data=revision.slot_data,
                seo=revision.seo,
                status=RevisionStatus.DRAFT,
                source_revision_id=revision.id,
                created_by_user_id=actor.user_id,  # the reviewer triggers the re-draft
                updated_by_user_id=actor.user_id,
            )
            self._session.add(draft)
            await self._session.flush()

            previous_discovery = await self._discovery(revision.id)
            await self._replace_discovery(actor, draft, entry.locale, previous_discovery)

            revision.superseded_at = datetime.now(UTC)
            revision.superseded_by_revision_id = draft.id

            await self._log_event(
                draft.id,
                None,
                RevisionStatus.DRAFT,
                actor,
                reason=f"changes_requested:{request.capability.value}",
            )
            await self._session.flush()

            # ---- outbox: notify the original submitter (RW-7) ---------------
            if revision.created_by_user_id:
                await self._record_notification(
                    "content.changes_requested",
                    organization_id=actor.organization_id,
                    aggregate_id=draft.id,
                    recipient_user_id=revision.created_by_user_id,
                    payload={
                        "entryId": str(entry.id),
                        "revisionId": str(draft.id),
                        "slug": entry.slug,
                        "capability": request.capability.value,
                        "note": request.note or "",
                    },
                )

            return await self._to_schema_loaded(entry, draft)

        await self._session.flush()

        # ---- auto-approve when all required capabilities are granted (RW-4) ---
        decisions = [
            ReviewDecisionRecord(capability=d.capability, outcome=d.outcome)
            for d in await self._decisions(revision.id)
        ]
        findings = structural_findings(
            revision.template, revision.slot_data
        ) + authored_content_findings(entry, revision)
        required = effective_required_approvals(entry.content_type, revision.template, findings)
        granted = granted_capabilities(decisions)
        if required.issubset(granted):
            from_status = revision.status
            revision.status = RevisionStatus.APPROVED
            await self._log_event(revision.id, from_status, RevisionStatus.APPROVED, actor)
            await self._session.flush()

            # ---- outbox: notify the original submitter (RW-7) ---------------
            if revision.created_by_user_id:
                await self._record_notification(
                    "content.review_approved",
                    organization_id=actor.organization_id,
                    aggregate_id=revision.id,
                    recipient_user_id=revision.created_by_user_id,
                    payload={
                        "entryId": str(entry.id),
                        "revisionId": str(revision.id),
                        "slug": entry.slug,
                        "versionLabel": revision.version_label,
                    },
                )

        return await self._to_schema_loaded(entry, revision)

    async def list_review_queue(
        self,
        actor: StaffActor,
    ) -> list[ContentReviewQueueItemOut]:
        """Return all pending review tasks for the calling user (RW-6).

        Filters to entries where:
        - The revision is ``in_review``
        - The user is NOT the submitter (four-eyes rule)
        - The user is assigned to at least one capability the revision needs,
          OR no assignments exist at all (implicit: any org_admin may review)
        """
        self._require_org_admin(actor)
        org_id = actor.organization_id

        # Capabilities the user is explicitly assigned to review.
        assigned_caps: set[ApprovalCapability] = {
            row[0]
            for row in (
                await self._session.execute(
                    select(ContentReviewAssignment.capability).where(
                        ContentReviewAssignment.organization_id == org_id,
                        ContentReviewAssignment.user_id == actor.user_id,
                        ContentReviewAssignment.active.is_(True),
                    )
                )
            ).all()
        }

        # If there are no assignments at all for this org, fall back to
        # implicit — any org_admin may review any capability.
        has_any_assignment = (
            await self._session.scalar(
                select(ContentReviewAssignment.id)
                .where(
                    ContentReviewAssignment.organization_id == org_id,
                )
                .limit(1)
            )
        ) is not None
        if has_any_assignment and not assigned_caps:
            return []  # Explicitly assigned reviewers exist, but this user isn't one.

        effective_caps = assigned_caps if has_any_assignment else set(ApprovalCapability)

        # All in-review revisions for this org, excluding those submitted by
        # the current actor (four-eyes rule).
        rows = (
            await self._session.execute(
                select(
                    ContentEntry.id,
                    ContentEntry.content_type,
                    ContentEntry.slug,
                    ContentRevision.id,
                    ContentRevision.version_label,
                    ContentRevision.updated_at,
                    ContentRevision.created_by_user_id,
                )
                .join(ContentRevision, ContentRevision.entry_id == ContentEntry.id)
                .where(
                    ContentEntry.organization_id == org_id,
                    ContentRevision.status == RevisionStatus.IN_REVIEW,
                    ContentRevision.superseded_at.is_(None),
                    ContentRevision.created_by_user_id != actor.user_id,
                )
                .order_by(ContentRevision.updated_at.desc())
            )
        ).all()

        if not rows:
            return []

        revision_ids = [row[3] for row in rows]
        # Batch-resolve submitter display names
        user_ids: set[UUID] = {row[6] for row in rows if row[6] is not None}
        user_names: dict[UUID, str] = {}
        if user_ids:
            for user in (
                await self._session.scalars(
                    select(InternalUser).where(InternalUser.id.in_(user_ids))
                )
            ).all():
                user_names[user.id] = user.display_name or user.email or str(user.id)

        # Batch-fetch all decisions for these revisions.
        all_decisions: dict[UUID, list[ContentReviewDecision]] = {rid: [] for rid in revision_ids}
        for dec in (
            await self._session.scalars(
                select(ContentReviewDecision).where(
                    ContentReviewDecision.revision_id.in_(revision_ids)
                )
            )
        ).all():
            all_decisions.setdefault(dec.revision_id, []).append(dec)

        # Batch-fetch required approvals per revision (simplified: use
        # structural + authored findings as in transition).
        results: list[ContentReviewQueueItemOut] = []
        for row in rows:
            entry_id, ctype, slug, rev_id, version_label, submitted_at, submitted_by_id = row
            submitted_by = user_names.get(submitted_by_id) if submitted_by_id else None
            decisions = all_decisions.get(rev_id, [])
            decided_caps = {d.capability for d in decisions}

            # For each capability the revision needs AND the user can review:
            for capability in ApprovalCapability:
                if capability not in effective_caps:
                    continue
                # Skip if no assignment and this is one we should filter.
                decision = next((d for d in decisions if d.capability == capability), None)
                results.append(
                    ContentReviewQueueItemOut(
                        entry_id=entry_id,
                        revision_id=rev_id,
                        content_type=ctype,
                        slug=slug,
                        version_label=version_label,
                        submitted_at=submitted_at,
                        submitted_by_display_name=submitted_by,
                        capability=capability,
                        already_decided=capability in decided_caps,
                        decided_outcome=decision.outcome if decision else None,
                    )
                )

        return results

    async def create_review_assignment(
        self,
        actor: StaffActor,
        request: CreateContentReviewAssignmentRequest,
    ) -> ContentReviewAssignmentOut:
        self._require_org_admin(actor)
        existing = await self._session.scalar(
            select(ContentReviewAssignment).where(
                ContentReviewAssignment.organization_id == actor.organization_id,
                ContentReviewAssignment.user_id == request.user_id,
                ContentReviewAssignment.capability == request.capability,
            )
        )
        if existing is not None:
            existing.active = request.active
            await self._session.flush()
            user = await self._session.get(InternalUser, request.user_id)
            display_name = (
                user.display_name or user.email or str(user.id) if user else str(request.user_id)
            )
            return ContentReviewAssignmentOut(
                assignment_id=existing.id,
                user_id=existing.user_id,
                display_name=display_name,
                capability=existing.capability,
                active=existing.active,
            )

        assignment = ContentReviewAssignment(
            organization_id=actor.organization_id,
            user_id=request.user_id,
            capability=request.capability,
            active=request.active,
        )
        self._session.add(assignment)
        await self._session.flush()
        user = await self._session.get(InternalUser, request.user_id)
        display_name = (
            user.display_name or user.email or str(user.id) if user else str(request.user_id)
        )
        return ContentReviewAssignmentOut(
            assignment_id=assignment.id,
            user_id=assignment.user_id,
            display_name=display_name,
            capability=assignment.capability,
            active=assignment.active,
        )

    async def list_review_assignments(
        self,
        organization_id: UUID,
    ) -> list[ContentReviewAssignmentOut]:
        rows = (
            await self._session.execute(
                select(ContentReviewAssignment, InternalUser.display_name)
                .join(
                    InternalUser,
                    InternalUser.id == ContentReviewAssignment.user_id,
                )
                .where(
                    ContentReviewAssignment.organization_id == organization_id,
                    ContentReviewAssignment.active.is_(True),
                )
                .order_by(ContentReviewAssignment.capability, InternalUser.display_name)
            )
        ).all()
        return [
            ContentReviewAssignmentOut(
                assignment_id=assignment.id,
                user_id=assignment.user_id,
                display_name=display_name or str(assignment.user_id),
                capability=assignment.capability,
                active=assignment.active,
            )
            for assignment, display_name in rows
        ]

    async def list_staff_users(
        self,
        organization_id: UUID,
    ) -> list[StaffUserOut]:
        """Return all internal users for the reviewer-assignment dropdown."""
        users = (
            await self._session.scalars(select(InternalUser).order_by(InternalUser.display_name))
        ).all()
        return [
            StaffUserOut(
                user_id=user.id,
                display_name=user.display_name or user.email or str(user.id),
                email=user.email or "",
            )
            for user in users
        ]

    async def _submission_actors(self, revision_id: UUID) -> set[UUID]:
        """Return the set of user IDs who submitted this revision for review."""
        events = (
            await self._session.scalars(
                select(ContentPublicationEvent).where(
                    ContentPublicationEvent.revision_id == revision_id,
                    ContentPublicationEvent.to_status == RevisionStatus.IN_REVIEW,
                )
            )
        ).all()
        return {event.actor_user_id for event in events if event.actor_user_id}

    async def _record_notification(
        self,
        event_type: str,
        *,
        organization_id: UUID,
        aggregate_id: UUID,
        recipient_user_id: UUID | None,
        payload: dict[str, object] | None = None,
    ) -> None:
        """Append a notification to the transactional outbox (RW-7)."""
        self._session.add(
            NotificationOutbox(
                organization_id=organization_id,
                event_type=event_type,
                aggregate_id=aggregate_id,
                recipient_user_id=recipient_user_id,
                payload=payload or {},
                available_at=datetime.now(UTC),
            )
        )

    async def submit_article_for_review(
        self,
        actor: StaffActor,
        entry_id: UUID,
        revision_id: UUID,
        request: SubmitArticleForReviewRequest,
    ) -> ContentRevisionOut:
        """Atomic save + submit: persist pending edits and move the revision
        to ``in_review`` in a single application command (D-068 / RW-1).

        Idempotent: when the revision is already ``in_review`` the method
        returns the current state (and the stored revision) unchanged, without
        a 409, a re-mutation or a duplicate event.  A fresh ``idempotency_key``
        on an already-in-review revision is still accepted — only the first
        key that caused the transition is recorded.
        """
        self._require_org_admin(actor)
        entry = await self._entry(actor, entry_id)
        revision = await self._revision(actor, entry_id, revision_id)

        # ---- idempotency: already in review → return current state ----------
        if revision.status == RevisionStatus.IN_REVIEW:
            return await self._to_schema_loaded(entry, revision)

        # ---- guard: must be draft -------------------------------------------
        if revision.status is not RevisionStatus.DRAFT:
            raise ContentConflictError(
                f"Cannot submit a revision in status {revision.status}; return it to draft first."
            )

        # ---- lock-guard -----------------------------------------------------
        if request.lock_version != revision.lock_version:
            raise ContentConflictError(
                "Revizija je izmenjena u međuvremenu — osvežite i pokušajte ponovo."
            )

        # ---- apply pending content edits ------------------------------------
        if request.slot_data is not None:
            revision.slot_data = request.slot_data
        if request.seo is not None:
            revision.seo = request.seo.model_dump(by_alias=False, exclude_none=True)
        if request.discovery is not None:
            await self._replace_discovery(actor, revision, entry.locale, request.discovery)

        revision.updated_by_user_id = actor.user_id

        # ---- Content Health check (blocking findings) -----------------------
        findings: tuple[ContentFinding, ...] = ()
        if revision.status is RevisionStatus.DRAFT:
            findings = structural_findings(
                revision.template, revision.slot_data
            ) + authored_content_findings(entry, revision)
            if any(item.severity == "error" for item in findings):
                raise ContentConflictError(
                    "Tekst ima blokirajuće nalaze i ne može se poslati na pregled."
                    " Otklonite greške iznad pre ponovnog slanja."
                )

        # ---- transition to in_review ----------------------------------------
        from_status = revision.status
        revision.status = RevisionStatus.IN_REVIEW
        revision.updated_by_user_id = actor.user_id

        await self._log_event(revision.id, from_status, RevisionStatus.IN_REVIEW, actor)

        try:
            await self._session.flush()
        except StaleDataError as error:
            raise ContentConflictError(
                "Revizija je izmenjena u međuvremenu — osvežite i pokušajte ponovo."
            ) from error

        # ---- record idempotency key alongside the transition event ----------
        await self._record_idempotency(revision.id, request.idempotency_key)

        # ---- transition draft taxonomy terms in the same package (RW-5) ----
        discovery = await self._discovery(revision.id)
        await self._submit_package_terms(actor, discovery, entry.locale)

        # ---- outbox: notify assigned reviewers (RW-7) ----------------------
        await self._notify_reviewers_of_new_submission(actor.organization_id, revision, entry)

        return await self._to_schema_loaded(entry, revision)

    async def _notify_reviewers_of_new_submission(
        self,
        organization_id: UUID,
        revision: ContentRevision,
        entry: ContentEntry,
    ) -> None:
        """Create outbox records for every reviewer eligible to review this
        revision (RW-7).  The submitter is excluded (four-eyes)."""
        assigned_rows = (
            await self._session.scalars(
                select(ContentReviewAssignment.user_id)
                .where(
                    ContentReviewAssignment.organization_id == organization_id,
                    ContentReviewAssignment.active.is_(True),
                )
                .distinct()
            )
        ).all()
        reviewer_ids = list(assigned_rows)
        if not reviewer_ids:
            # No assigned reviewers — fall back to superadmin email (NULL recipient)
            if os.getenv("SUPERADMIN_EMAIL"):
                await self._record_notification(
                    "content.review_requested",
                    organization_id=organization_id,
                    aggregate_id=revision.id,
                    recipient_user_id=None,
                    payload={
                        "entryId": str(entry.id),
                        "revisionId": str(revision.id),
                        "slug": entry.slug,
                        "versionLabel": revision.version_label,
                        "contentType": entry.content_type.value,
                        "_fallback": "no_assigned_reviewers",
                    },
                )
            return

        payload: dict[str, object] = {
            "entryId": str(entry.id),
            "revisionId": str(revision.id),
            "slug": entry.slug,
            "versionLabel": revision.version_label,
            "contentType": entry.content_type.value,
        }
        for user_id in reviewer_ids:
            if user_id == revision.created_by_user_id:
                continue
            await self._record_notification(
                "content.review_requested",
                organization_id=organization_id,
                aggregate_id=revision.id,
                recipient_user_id=user_id,
                payload=payload,
            )

    async def _submit_package_terms(
        self,
        actor: StaffActor,
        discovery: ContentDiscoveryMetadata,
        locale: str,
    ) -> None:
        """Transition all draft tenant taxonomy terms referenced by this
        article's discovery metadata to ``in_review`` (RW-5 / D-068 rule 1).

        Already-published and already-in-review terms are left unchanged.
        Only tenant-owned terms (not system-defined) are considered.
        """
        import itertools

        term_ids: list[UUID] = list(
            itertools.chain(
                [discovery.topic_group_term_id] if discovery.topic_group_term_id else [],
                discovery.topic_term_ids,
            )
        )
        if not term_ids:
            return

        org_id = actor.organization_id

        # Batch-fetch latest tenant revisions for all referenced terms at once.
        tenant_latest_sub = (
            select(
                TaxonomyTermRevision.term_id,
                func.max(TaxonomyTermRevision.created_at).label("max_at"),
            )
            .where(
                TaxonomyTermRevision.term_id.in_(term_ids),
                TaxonomyTermRevision.organization_id == org_id,
                TaxonomyTermRevision.locale == locale,
            )
            .group_by(TaxonomyTermRevision.term_id)
        ).subquery("pkg_tenant_latest")

        revisions: dict[UUID, TaxonomyTermRevision] = {}
        for rev in (
            await self._session.scalars(
                select(TaxonomyTermRevision)
                .join(
                    tenant_latest_sub,
                    (TaxonomyTermRevision.term_id == tenant_latest_sub.c.term_id)
                    & (TaxonomyTermRevision.created_at == tenant_latest_sub.c.max_at),
                )
                .where(
                    TaxonomyTermRevision.organization_id == org_id,
                    TaxonomyTermRevision.locale == locale,
                )
            )
        ).all():
            revisions.setdefault(rev.term_id, rev)

        # Fetch the TaxonomyTerm rows so we have stable_ids for events.
        terms: dict[UUID, TaxonomyTerm] = {}
        for term in (
            await self._session.scalars(select(TaxonomyTerm).where(TaxonomyTerm.id.in_(term_ids)))
        ).all():
            terms[term.id] = term

        for term_id in term_ids:
            term = terms.get(term_id)
            revision = revisions.get(term_id)
            if term is None or revision is None:
                continue
            # Only transition tenant-owned drafts
            if term.organization_id != org_id:
                continue
            if revision.status is not RevisionStatus.DRAFT:
                continue

            from_status = revision.status
            revision.status = RevisionStatus.IN_REVIEW
            revision.updated_by_user_id = actor.user_id

            self._session.add(
                TaxonomyPublicationEvent(
                    term_revision_id=revision.id,
                    from_status=from_status,
                    to_status=RevisionStatus.IN_REVIEW,
                    actor_user_id=actor.user_id,
                    reason="submitted_via_article_package",
                )
            )

    async def create_new_draft(
        self,
        actor: StaffActor,
        entry_id: UUID,
        revision_id: UUID,
        request: NewContentDraftRequest,
    ) -> ContentRevisionOut:
        """Creates a new DRAFT revision copying the content from the given
        source revision, without mutating the source (RW-3 / D-068 rule 3).

        Supported reasons (D-068 rule 3):
          - ``author_withdrawal`` — author pulls ``in_review`` back to draft
          - ``edit_after_approval`` — new draft from an ``approved`` revision
          - ``edit_published_content`` — new draft from ``published``, source
            stays published
          - ``edit_archived_content`` — new draft from ``archived``
        """
        self._require_org_admin(actor)
        entry = await self._entry(actor, entry_id)
        source = await self._revision(actor, entry_id, revision_id)

        if source.status is RevisionStatus.DRAFT:
            raise ContentConflictError("Revizija je već u statusu draft.")

        next_label = _next_version_label(source.version_label)
        draft = ContentRevision(
            entry_id=entry.id,
            version_label=next_label,
            template=source.template,
            slot_data=source.slot_data,
            seo=source.seo,
            status=RevisionStatus.DRAFT,
            source_revision_id=source.id,
            created_by_user_id=actor.user_id,
            updated_by_user_id=actor.user_id,
        )
        self._session.add(draft)
        await self._session.flush()

        # Copy discovery metadata
        previous_discovery = await self._discovery(source.id)
        await self._replace_discovery(actor, draft, entry.locale, previous_discovery)

        # Mark source as superseded by this draft only for in_review / approved.
        # Published and archived revisions retain their public status until the
        # new draft is itself published or the source is explicitly archived.
        if source.status in (RevisionStatus.IN_REVIEW, RevisionStatus.APPROVED):
            source.superseded_at = datetime.now(UTC)
            source.superseded_by_revision_id = draft.id

        await self._log_event(draft.id, None, RevisionStatus.DRAFT, actor, reason=request.reason)
        await self._session.flush()
        return await self._to_schema_loaded(entry, draft)

    async def _record_idempotency(self, revision_id: UUID, idempotency_key: UUID) -> None:
        """Record that *this* key was used to submit *this* revision.

        The table is append-only: a different key on an already-in-review
        revision is silently accepted — the endpoint returns the existing
        state without a new transition.  Only the first arrival receives
        the unique constraint's guarantee.

        The unique constraint ``(revision_id, idempotency_key)`` ensures
        the same key cannot produce a second transition, even across
        concurrent requests (serialized by the transaction).
        """
        self._session.add(
            ContentSubmitIdempotency(
                revision_id=revision_id,
                idempotency_key=idempotency_key,
                processed_at=datetime.now(UTC),
            )
        )
        with contextlib.suppress(IntegrityError):
            await self._session.flush()

    async def delete_revision(self, actor: StaffActor, entry_id: UUID, revision_id: UUID) -> None:
        self._require_org_admin(actor)
        entry = await self._entry(actor, entry_id)
        revision = await self._revision(actor, entry_id, revision_id)
        try:
            require_deletable(revision.status)
        except CannotDeleteRevisionError as error:
            raise ContentConflictError(str(error)) from error
        await self._session.delete(revision)
        await self._session.flush()
        remaining_revision_id = await self._session.scalar(
            select(ContentRevision.id).where(ContentRevision.entry_id == entry.id).limit(1)
        )
        if remaining_revision_id is None:
            await self._session.delete(entry)
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


def _discovery_findings(metadata: ContentDiscoveryMetadata) -> tuple[ContentFinding, ...]:
    """Eligibility is informative now: it never unpublishes a CMS route."""
    missing: list[str] = []
    if metadata.topic_group_term_id is None:
        missing.append("oblast")
    if not metadata.topic_term_ids:
        missing.append("najmanje jednu temu")
    if metadata.journey_intent_term_id is None:
        missing.append("put korisnika")
    if not metadata.content_goal_term_ids:
        missing.append("cilj sadržaja")
    if not metadata.audience_term_ids:
        missing.append("publiku")
    if metadata.content_format_term_id is None:
        missing.append("format")
    if metadata.access_level_term_id is None:
        missing.append("nivo pristupa")
    if not missing:
        return ()
    return (
        ContentFinding(
            rule_id="KOMPAS-ELIGIBILITY-001",
            rule_version="1",
            severity="warning",
            message="Sadržaj još nema kompletne Kompas metapodatke.",
            remediation="Dopunite: "
            + ", ".join(missing)
            + ". Stranica može ostati objavljena, ali se neće prikazivati u Kompas preporukama.",
            field_path="discovery",
        ),
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
