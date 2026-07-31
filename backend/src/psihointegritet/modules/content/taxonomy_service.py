"""Application service for the D-053 / ADR-022 Kompas registry."""

from __future__ import annotations

import unicodedata
from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy import delete, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm.exc import StaleDataError

from psihointegritet.modules.content.models import ReviewOutcome
from psihointegritet.modules.content.taxonomy_models import (
    MANAGED_TAXONOMY_AXES,
    TaxonomyAxis,
    TaxonomyIntakeLink,
    TaxonomyIntakeLinkReviewDecision,
    TaxonomyPublicationEvent,
    TaxonomyRelationKind,
    TaxonomyReviewDecision,
    TaxonomyTerm,
    TaxonomyTermRelation,
    TaxonomyTermRevision,
    TaxonomyTermSearchTerm,
)
from psihointegritet.modules.content.taxonomy_schemas import (
    CreateTaxonomyIntakeLinkRequest,
    CreateTaxonomyTermRequest,
    PublicTaxonomyOut,
    PublicTaxonomyTermOut,
    TaxonomyEventOut,
    TaxonomyIntakeLinkOut,
    TaxonomyIntakeLinkReviewRequest,
    TaxonomyIntakeLinkTransitionRequest,
    TaxonomyRelationOut,
    TaxonomyReviewDecisionOut,
    TaxonomyReviewDecisionRequest,
    TaxonomyTermOut,
    TaxonomyTransitionRequest,
    UpdateTaxonomyRevisionRequest,
)
from psihointegritet.modules.guidance.authorization import StaffActor
from psihointegritet.modules.identity.models import InternalUser
from psihointegritet.modules.identity.schemas import ActorSummaryOut
from psihointegritet.shared.domain.publication import (
    ApprovalCapability,
    RevisionStatus,
    require_transition,
)

TAXONOMY_VERSION = "kompas-taxonomy-v1"
TERM_REQUIRED_APPROVALS = frozenset({ApprovalCapability.CLINICAL, ApprovalCapability.BUSINESS})
LINK_REQUIRED_APPROVALS = frozenset({ApprovalCapability.CLINICAL})


class TaxonomyError(RuntimeError):
    def __init__(self, code: str, message: str, field_path: str | None = None) -> None:
        super().__init__(message)
        self.code = code
        self.message = message
        self.field_path = field_path


class TaxonomyNotFoundError(TaxonomyError):
    pass


class TaxonomyConflictError(TaxonomyError):
    pass


class TaxonomyValidationError(TaxonomyError):
    pass


class TaxonomyForbiddenError(TaxonomyError):
    pass


def _normalize_search_term(value: str) -> str:
    normalized = unicodedata.normalize("NFKC", value).casefold().strip()
    return " ".join(normalized.split())


def _next_version_label(current: str) -> str:
    if current.startswith("v") and current[1:].isdigit():
        return f"v{int(current[1:]) + 1}"
    return f"{current}-next"


class TaxonomyService:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    @staticmethod
    def _require_org_admin(actor: StaffActor) -> None:
        if not actor.is_org_admin:
            raise TaxonomyForbiddenError(
                "TAX-AUTH-001", "Samo administrator organizacije može da uređuje Kompas registar."
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

    async def _term(self, actor: StaffActor, term_id: UUID) -> TaxonomyTerm:
        term = await self._session.scalar(
            select(TaxonomyTerm).where(
                TaxonomyTerm.id == term_id,
                or_(
                    TaxonomyTerm.organization_id == actor.organization_id,
                    TaxonomyTerm.system_defined.is_(True),
                ),
            )
        )
        if term is None:
            raise TaxonomyNotFoundError(
                "TAX-REF-001", "Tražena vrednost registra ne postoji.", "termId"
            )
        return term

    async def _revision(
        self, actor: StaffActor, term: TaxonomyTerm, revision_id: UUID
    ) -> TaxonomyTermRevision:
        revision = await self._session.scalar(
            select(TaxonomyTermRevision).where(
                TaxonomyTermRevision.id == revision_id,
                TaxonomyTermRevision.term_id == term.id,
                or_(
                    TaxonomyTermRevision.organization_id == actor.organization_id,
                    TaxonomyTermRevision.organization_id.is_(None),
                ),
            )
        )
        if revision is None:
            raise TaxonomyNotFoundError(
                "TAX-REF-002", "Tražena verzija registra ne postoji.", "revisionId"
            )
        return revision

    async def _latest_effective_revision(
        self, term: TaxonomyTerm, organization_id: UUID, locale: str
    ) -> TaxonomyTermRevision | None:
        tenant_revision = await self._session.scalar(
            select(TaxonomyTermRevision)
            .where(
                TaxonomyTermRevision.term_id == term.id,
                TaxonomyTermRevision.organization_id == organization_id,
                TaxonomyTermRevision.locale == locale,
            )
            .order_by(TaxonomyTermRevision.created_at.desc())
            .limit(1)
        )
        if tenant_revision is not None:
            return tenant_revision
        if not term.system_defined:
            return None
        return await self._session.scalar(
            select(TaxonomyTermRevision)
            .where(
                TaxonomyTermRevision.term_id == term.id,
                TaxonomyTermRevision.organization_id.is_(None),
                TaxonomyTermRevision.locale == locale,
            )
            .order_by(TaxonomyTermRevision.created_at.desc())
            .limit(1)
        )

    async def _published_effective_revision(
        self, term: TaxonomyTerm, organization_id: UUID, locale: str
    ) -> TaxonomyTermRevision | None:
        tenant_revision = await self._session.scalar(
            select(TaxonomyTermRevision).where(
                TaxonomyTermRevision.term_id == term.id,
                TaxonomyTermRevision.organization_id == organization_id,
                TaxonomyTermRevision.locale == locale,
                TaxonomyTermRevision.status == RevisionStatus.PUBLISHED,
            )
        )
        if tenant_revision is not None:
            return tenant_revision
        if not term.system_defined:
            return None
        return await self._session.scalar(
            select(TaxonomyTermRevision).where(
                TaxonomyTermRevision.term_id == term.id,
                TaxonomyTermRevision.organization_id.is_(None),
                TaxonomyTermRevision.locale == locale,
                TaxonomyTermRevision.status == RevisionStatus.PUBLISHED,
            )
        )

    async def _reference_term(
        self,
        actor: StaffActor,
        term_id: UUID,
        *,
        axis: TaxonomyAxis,
        field_path: str,
        published: bool = False,
        locale: str = "sr-Latn",
    ) -> TaxonomyTerm:
        term = await self._term(actor, term_id)
        if term.axis is not axis:
            raise TaxonomyValidationError(
                "TAX-REF-003",
                f"Izabrana vrednost ne pripada registru „{axis.value}”.",
                field_path,
            )
        if term.organization_id not in (None, actor.organization_id):
            raise TaxonomyValidationError(
                "TAX-TENANT-001", "Nije moguće povezati vrednost drugog tenant-a.", field_path
            )
        revision = (
            await self._published_effective_revision(term, actor.organization_id, locale)
            if published
            else await self._latest_effective_revision(term, actor.organization_id, locale)
        )
        if revision is None or revision.status is RevisionStatus.ARCHIVED:
            raise TaxonomyValidationError(
                "TAX-REF-004", "Izabrana vrednost nije aktivna.", field_path
            )
        return term

    async def _validate_shape(
        self,
        actor: StaffActor,
        term: TaxonomyTerm,
        revision: TaxonomyTermRevision,
        related_topic_ids: list[UUID],
        replacement_term_id: UUID | None,
        *,
        published: bool = False,
    ) -> None:
        if revision.icon_key and revision.asset_id:
            raise TaxonomyValidationError(
                "TAX-ASSET-001",
                "Izaberite ikonu ili asset, ne oba istovremeno.",
                "iconKey",
            )
        if term.axis is TaxonomyAxis.TOPIC:
            if revision.primary_parent_term_id is None:
                raise TaxonomyValidationError(
                    "TAX-HIER-001",
                    "Tema mora pripadati jednoj primarnoj grupi.",
                    "primaryParentTermId",
                )
            if revision.journey_intent_term_id is None:
                raise TaxonomyValidationError(
                    "TAX-JOURNEY-001",
                    "Tema mora imati izabran put korisnika.",
                    "journeyIntentTermId",
                )
            await self._reference_term(
                actor,
                revision.primary_parent_term_id,
                axis=TaxonomyAxis.TOPIC_GROUP,
                field_path="primaryParentTermId",
                published=published,
                locale=revision.locale,
            )
            await self._reference_term(
                actor,
                revision.journey_intent_term_id,
                axis=TaxonomyAxis.JOURNEY_INTENT,
                field_path="journeyIntentTermId",
                published=published,
                locale=revision.locale,
            )
        elif (
            revision.primary_parent_term_id is not None
            or revision.journey_intent_term_id is not None
        ):
            raise TaxonomyValidationError(
                "TAX-HIER-002",
                "Samo konkretna tema može imati primarnu grupu i put korisnika.",
                "primaryParentTermId",
            )

        if related_topic_ids and term.axis is not TaxonomyAxis.TOPIC:
            raise TaxonomyValidationError(
                "TAX-REL-001",
                "Povezane teme mogu se birati samo za konkretnu temu.",
                "relatedTopicIds",
            )
        for target_id in set(related_topic_ids):
            if target_id == term.id:
                raise TaxonomyValidationError(
                    "TAX-REL-002", "Tema ne može biti povezana sama sa sobom.", "relatedTopicIds"
                )
            await self._reference_term(
                actor,
                target_id,
                axis=TaxonomyAxis.TOPIC,
                field_path="relatedTopicIds",
                published=published,
                locale=revision.locale,
            )
        if replacement_term_id is not None:
            if replacement_term_id == term.id:
                raise TaxonomyValidationError(
                    "TAX-REL-003", "Zamena ne može biti ista vrednost.", "replacementTermId"
                )
            replacement = await self._reference_term(
                actor,
                replacement_term_id,
                axis=term.axis,
                field_path="replacementTermId",
                published=published,
                locale=revision.locale,
            )
            if replacement.organization_id != term.organization_id:
                raise TaxonomyValidationError(
                    "TAX-REL-004",
                    "Zamenska vrednost mora pripadati istoj osi i organizaciji.",
                    "replacementTermId",
                )

    async def _search_terms(self, revision_id: UUID) -> list[TaxonomyTermSearchTerm]:
        return list(
            (
                await self._session.scalars(
                    select(TaxonomyTermSearchTerm)
                    .where(TaxonomyTermSearchTerm.revision_id == revision_id)
                    .order_by(TaxonomyTermSearchTerm.original_value)
                )
            ).all()
        )

    async def _relations(self, revision_id: UUID) -> list[TaxonomyTermRelation]:
        return list(
            (
                await self._session.scalars(
                    select(TaxonomyTermRelation).where(
                        TaxonomyTermRelation.source_revision_id == revision_id
                    )
                )
            ).all()
        )

    async def _replace_search_terms(self, revision_id: UUID, values: list[str]) -> None:
        await self._session.execute(
            delete(TaxonomyTermSearchTerm).where(TaxonomyTermSearchTerm.revision_id == revision_id)
        )
        seen: set[str] = set()
        for original in values:
            normalized = _normalize_search_term(original)
            if not normalized or normalized in seen:
                continue
            seen.add(normalized)
            self._session.add(
                TaxonomyTermSearchTerm(
                    revision_id=revision_id,
                    original_value=original.strip(),
                    normalized_value=normalized,
                )
            )

    async def _replace_relations(
        self,
        revision: TaxonomyTermRevision,
        term_id: UUID,
        related_topic_ids: list[UUID],
        replacement_term_id: UUID | None,
    ) -> None:
        await self._session.execute(
            delete(TaxonomyTermRelation).where(
                TaxonomyTermRelation.source_revision_id == revision.id
            )
        )
        self._session.add_all(
            [
                TaxonomyTermRelation(
                    source_revision_id=revision.id,
                    source_term_id=term_id,
                    target_term_id=target_id,
                    relation_kind=TaxonomyRelationKind.RELATED_TOPIC,
                )
                for target_id in dict.fromkeys(related_topic_ids)
            ]
        )
        if replacement_term_id is not None:
            self._session.add(
                TaxonomyTermRelation(
                    source_revision_id=revision.id,
                    source_term_id=term_id,
                    target_term_id=replacement_term_id,
                    relation_kind=TaxonomyRelationKind.REPLACEMENT,
                )
            )

    async def _term_decisions(self, revision_id: UUID) -> list[TaxonomyReviewDecision]:
        return list(
            (
                await self._session.scalars(
                    select(TaxonomyReviewDecision).where(
                        TaxonomyReviewDecision.revision_id == revision_id
                    )
                )
            ).all()
        )

    async def _events(
        self, *, revision_id: UUID | None = None, link_id: UUID | None = None
    ) -> list[TaxonomyPublicationEvent]:
        query = select(TaxonomyPublicationEvent).order_by(
            TaxonomyPublicationEvent.created_at.desc()
        )
        if revision_id is not None:
            query = query.where(TaxonomyPublicationEvent.term_revision_id == revision_id)
        else:
            query = query.where(TaxonomyPublicationEvent.intake_link_id == link_id)
        return list((await self._session.scalars(query)).all())

    async def _event_out(self, event: TaxonomyPublicationEvent) -> TaxonomyEventOut:
        return TaxonomyEventOut(
            from_status=event.from_status,
            to_status=event.to_status,
            actor=await self._actor_summary(event.actor_user_id),
            reason=event.reason,
            created_at=event.created_at,
        )

    async def _decision_out(
        self, decision: TaxonomyReviewDecision | TaxonomyIntakeLinkReviewDecision
    ) -> TaxonomyReviewDecisionOut:
        return TaxonomyReviewDecisionOut(
            capability=decision.capability,
            outcome=decision.outcome,
            decided_by=await self._actor_summary(decision.decided_by_user_id),
            decided_at=decision.decided_at,
            note=decision.note,
        )

    async def _term_out(
        self, term: TaxonomyTerm, revision: TaxonomyTermRevision
    ) -> TaxonomyTermOut:
        search_terms = await self._search_terms(revision.id)
        relations = await self._relations(revision.id)
        decisions = await self._term_decisions(revision.id)
        parent = (
            await self._session.get(TaxonomyTerm, revision.primary_parent_term_id)
            if revision.primary_parent_term_id
            else None
        )
        journey = (
            await self._session.get(TaxonomyTerm, revision.journey_intent_term_id)
            if revision.journey_intent_term_id
            else None
        )
        relation_outputs: list[TaxonomyRelationOut] = []
        for relation in relations:
            target = await self._session.get(TaxonomyTerm, relation.target_term_id)
            if target is not None:
                relation_outputs.append(
                    TaxonomyRelationOut(
                        kind=relation.relation_kind,
                        target_term_id=target.id,
                        target_stable_id=target.stable_id,
                    )
                )
        return TaxonomyTermOut(
            term_id=term.id,
            revision_id=revision.id,
            organization_id=revision.organization_id,
            axis=term.axis,
            stable_id=term.stable_id,
            system_defined=term.system_defined,
            locale=revision.locale,
            public_label=revision.public_label,
            short_description=revision.short_description,
            internal_expert_note=revision.internal_expert_note,
            primary_parent_term_id=revision.primary_parent_term_id,
            primary_parent_stable_id=parent.stable_id if parent else None,
            journey_intent_term_id=revision.journey_intent_term_id,
            journey_intent=journey.stable_id if journey else None,
            sort_order=revision.sort_order,
            icon_key=revision.icon_key,
            asset_id=revision.asset_id,
            public_visible=revision.public_visible,
            compass_enabled=revision.compass_enabled,
            status=revision.status,
            version_label=revision.version_label,
            lock_version=revision.lock_version,
            search_terms=[item.original_value for item in search_terms],
            relations=relation_outputs,
            decisions=[await self._decision_out(item) for item in decisions],
            events=[
                await self._event_out(item) for item in await self._events(revision_id=revision.id)
            ],
            created_by=await self._actor_summary(revision.created_by_user_id),
            updated_by=await self._actor_summary(revision.updated_by_user_id),
            created_at=revision.created_at,
            updated_at=revision.updated_at,
        )

    async def list_terms(
        self,
        actor: StaffActor,
        *,
        axis: TaxonomyAxis | None = None,
        status: RevisionStatus | None = None,
        query: str | None = None,
        locale: str = "sr-Latn",
    ) -> list[TaxonomyTermOut]:
        self._require_org_admin(actor)
        statement = select(TaxonomyTerm).where(
            or_(
                TaxonomyTerm.organization_id == actor.organization_id,
                TaxonomyTerm.system_defined.is_(True),
            )
        )
        if axis is not None:
            statement = statement.where(TaxonomyTerm.axis == axis)
        terms = (await self._session.scalars(statement.order_by(TaxonomyTerm.axis))).all()
        normalized_query = _normalize_search_term(query or "")
        results: list[TaxonomyTermOut] = []
        for term in terms:
            revision = await self._latest_effective_revision(term, actor.organization_id, locale)
            if revision is None or (status is not None and revision.status is not status):
                continue
            output = await self._term_out(term, revision)
            haystack = " ".join(
                [
                    term.stable_id,
                    output.public_label,
                    output.short_description,
                    *output.search_terms,
                ]
            )
            if normalized_query and normalized_query not in _normalize_search_term(haystack):
                continue
            results.append(output)
        return sorted(
            results, key=lambda item: (item.axis.value, item.sort_order, item.public_label)
        )

    async def get_term(
        self, actor: StaffActor, term_id: UUID, locale: str = "sr-Latn"
    ) -> TaxonomyTermOut:
        self._require_org_admin(actor)
        term = await self._term(actor, term_id)
        revision = await self._latest_effective_revision(term, actor.organization_id, locale)
        if revision is None:
            raise TaxonomyNotFoundError(
                "TAX-REF-005", "Vrednost nema dostupnu verziju za izabrani jezik.", "locale"
            )
        return await self._term_out(term, revision)

    async def create_term(
        self, actor: StaffActor, request: CreateTaxonomyTermRequest
    ) -> TaxonomyTermOut:
        self._require_org_admin(actor)
        if request.axis not in MANAGED_TAXONOMY_AXES:
            raise TaxonomyValidationError(
                "TAX-SYSTEM-001",
                "Sistemske vrednosti se ne kreiraju kroz tenant panel.",
                "axis",
            )
        existing = await self._session.scalar(
            select(TaxonomyTerm.id).where(
                TaxonomyTerm.organization_id == actor.organization_id,
                TaxonomyTerm.axis == request.axis,
                TaxonomyTerm.stable_id == request.stable_id,
            )
        )
        if existing is not None:
            raise TaxonomyConflictError(
                "TAX-ID-001", "Ovaj stabilni ID već postoji u registru.", "stableId"
            )
        term = TaxonomyTerm(
            organization_id=actor.organization_id,
            axis=request.axis,
            stable_id=request.stable_id,
            system_defined=False,
            created_by_user_id=actor.user_id,
        )
        self._session.add(term)
        try:
            await self._session.flush()
        except IntegrityError as error:
            raise TaxonomyConflictError(
                "TAX-ID-001", "Ovaj stabilni ID već postoji u registru.", "stableId"
            ) from error
        revision = TaxonomyTermRevision(
            term_id=term.id,
            organization_id=actor.organization_id,
            version_label="v1",
            locale=request.locale,
            public_label=request.public_label.strip(),
            short_description=request.short_description.strip(),
            internal_expert_note=request.internal_expert_note,
            primary_parent_term_id=request.primary_parent_term_id,
            journey_intent_term_id=request.journey_intent_term_id,
            sort_order=request.sort_order,
            icon_key=request.icon_key,
            asset_id=request.asset_id,
            public_visible=request.public_visible,
            compass_enabled=request.compass_enabled,
            status=RevisionStatus.DRAFT,
            created_by_user_id=actor.user_id,
            updated_by_user_id=actor.user_id,
        )
        self._session.add(revision)
        await self._session.flush()
        await self._validate_shape(actor, term, revision, request.related_topic_ids, None)
        await self._replace_search_terms(revision.id, request.search_terms)
        await self._replace_relations(revision, term.id, request.related_topic_ids, None)
        self._log_term_event(revision.id, None, RevisionStatus.DRAFT, actor)
        await self._session.flush()
        await self._session.refresh(revision)
        return await self._term_out(term, revision)

    async def _copy_revision(
        self,
        source: TaxonomyTermRevision,
        actor: StaffActor,
        *,
        version_label: str,
    ) -> TaxonomyTermRevision:
        copied = TaxonomyTermRevision(
            term_id=source.term_id,
            organization_id=actor.organization_id,
            version_label=version_label,
            locale=source.locale,
            public_label=source.public_label,
            short_description=source.short_description,
            internal_expert_note=source.internal_expert_note,
            primary_parent_term_id=source.primary_parent_term_id,
            journey_intent_term_id=source.journey_intent_term_id,
            sort_order=source.sort_order,
            icon_key=source.icon_key,
            asset_id=source.asset_id,
            public_visible=source.public_visible,
            compass_enabled=source.compass_enabled,
            status=RevisionStatus.DRAFT,
            created_by_user_id=actor.user_id,
            updated_by_user_id=actor.user_id,
        )
        self._session.add(copied)
        await self._session.flush()
        await self._replace_search_terms(
            copied.id, [item.original_value for item in await self._search_terms(source.id)]
        )
        source_relations = await self._relations(source.id)
        await self._replace_relations(
            copied,
            source.term_id,
            [
                item.target_term_id
                for item in source_relations
                if item.relation_kind is TaxonomyRelationKind.RELATED_TOPIC
            ],
            next(
                (
                    item.target_term_id
                    for item in source_relations
                    if item.relation_kind is TaxonomyRelationKind.REPLACEMENT
                ),
                None,
            ),
        )
        self._log_term_event(copied.id, None, RevisionStatus.DRAFT, actor, "reissued")
        return copied

    async def _editable_revision(
        self,
        term: TaxonomyTerm,
        revision: TaxonomyTermRevision,
        actor: StaffActor,
    ) -> TaxonomyTermRevision:
        if revision.organization_id is None:
            if not term.system_defined:
                raise TaxonomyForbiddenError(
                    "TAX-TENANT-002", "Globalna verzija nije dostupna za tenant izmenu."
                )
            existing_overlay = await self._session.scalar(
                select(TaxonomyTermRevision.id).where(
                    TaxonomyTermRevision.term_id == term.id,
                    TaxonomyTermRevision.organization_id == actor.organization_id,
                    TaxonomyTermRevision.locale == revision.locale,
                )
            )
            if existing_overlay is not None:
                raise TaxonomyConflictError(
                    "TAX-SYSTEM-005",
                    "Lokalna verzija već postoji — osvežite registar pre izmene.",
                )
            return await self._copy_revision(revision, actor, version_label="v1")
        if revision.organization_id != actor.organization_id:
            raise TaxonomyNotFoundError("TAX-REF-002", "Tražena verzija registra ne postoji.")
        if revision.status in (RevisionStatus.APPROVED, RevisionStatus.ARCHIVED):
            return await self._copy_revision(
                revision, actor, version_label=_next_version_label(revision.version_label)
            )
        if revision.status is not RevisionStatus.DRAFT:
            raise TaxonomyConflictError(
                "TAX-STATE-001",
                "Verzija nije izmenjiva. Vratite je u radnu verziju pre izmene.",
            )
        return revision

    async def update_revision(
        self,
        actor: StaffActor,
        term_id: UUID,
        revision_id: UUID,
        request: UpdateTaxonomyRevisionRequest,
    ) -> TaxonomyTermOut:
        self._require_org_admin(actor)
        term = await self._term(actor, term_id)
        revision = await self._revision(actor, term, revision_id)
        if request.lock_version != revision.lock_version:
            raise TaxonomyConflictError(
                "TAX-LOCK-001",
                "Registar je izmenjen u međuvremenu — osvežite i pokušajte ponovo.",
                "lockVersion",
            )
        revision = await self._editable_revision(term, revision, actor)
        fields = request.model_fields_set
        required_fields = {
            "public_label",
            "short_description",
            "sort_order",
            "public_visible",
            "compass_enabled",
        }
        if any(name in fields and getattr(request, name) is None for name in required_fields):
            raise TaxonomyValidationError("TAX-FIELD-001", "Obavezno polje ne može biti prazno.")
        if term.system_defined:
            allowed_system_fields = {
                "lock_version",
                "public_label",
                "short_description",
                "internal_expert_note",
            }
            if fields - allowed_system_fields:
                raise TaxonomyValidationError(
                    "TAX-SYSTEM-002",
                    "Sistemskoj vrednosti može se menjati samo odobrena javna labela i opis.",
                )
        for name in (
            "public_label",
            "short_description",
            "internal_expert_note",
            "primary_parent_term_id",
            "journey_intent_term_id",
            "sort_order",
            "icon_key",
            "asset_id",
            "public_visible",
            "compass_enabled",
        ):
            if name in fields:
                setattr(revision, name, getattr(request, name))
        current_relations = await self._relations(revision.id)
        related = (
            request.related_topic_ids
            if request.related_topic_ids is not None
            else [
                item.target_term_id
                for item in current_relations
                if item.relation_kind is TaxonomyRelationKind.RELATED_TOPIC
            ]
        )
        replacement = (
            request.replacement_term_id
            if "replacement_term_id" in fields
            else next(
                (
                    item.target_term_id
                    for item in current_relations
                    if item.relation_kind is TaxonomyRelationKind.REPLACEMENT
                ),
                None,
            )
        )
        await self._validate_shape(actor, term, revision, related, replacement)
        if request.search_terms is not None:
            await self._replace_search_terms(revision.id, request.search_terms)
        if request.related_topic_ids is not None or "replacement_term_id" in fields:
            await self._replace_relations(revision, term.id, related, replacement)
        revision.updated_by_user_id = actor.user_id
        revision.updated_at = datetime.now(UTC)
        try:
            await self._session.flush()
        except StaleDataError as error:
            raise TaxonomyConflictError(
                "TAX-LOCK-001",
                "Registar je izmenjen u međuvremenu — osvežite i pokušajte ponovo.",
                "lockVersion",
            ) from error
        await self._session.refresh(revision)
        return await self._term_out(term, revision)

    async def record_review(
        self,
        actor: StaffActor,
        term_id: UUID,
        revision_id: UUID,
        request: TaxonomyReviewDecisionRequest,
    ) -> TaxonomyTermOut:
        self._require_org_admin(actor)
        term = await self._term(actor, term_id)
        revision = await self._revision(actor, term, revision_id)
        if revision.organization_id != actor.organization_id:
            raise TaxonomyForbiddenError(
                "TAX-SYSTEM-003", "Globalni sistemski ugovor ne odobrava se kroz tenant panel."
            )
        if revision.status is not RevisionStatus.IN_REVIEW:
            raise TaxonomyConflictError(
                "TAX-STATE-002", "Odluka se može uneti samo dok je verzija na pregledu."
            )
        if request.capability not in TERM_REQUIRED_APPROVALS:
            raise TaxonomyValidationError(
                "TAX-APPROVAL-001",
                "Za registar su dozvoljena Stručno i Poslovno odobrenje.",
                "capability",
            )
        existing = await self._session.scalar(
            select(TaxonomyReviewDecision).where(
                TaxonomyReviewDecision.revision_id == revision.id,
                TaxonomyReviewDecision.capability == request.capability,
            )
        )
        if existing is None:
            self._session.add(
                TaxonomyReviewDecision(
                    revision_id=revision.id,
                    capability=request.capability,
                    outcome=request.outcome,
                    decided_by_user_id=actor.user_id,
                    note=request.note,
                )
            )
        else:
            existing.outcome = request.outcome
            existing.decided_by_user_id = actor.user_id
            existing.decided_at = datetime.now(UTC)
            existing.note = request.note
        revision.updated_by_user_id = actor.user_id
        revision.updated_at = datetime.now(UTC)
        try:
            await self._session.flush()
        except StaleDataError as error:
            raise TaxonomyConflictError(
                "TAX-LOCK-001",
                "Registar je izmenjen u međuvremenu — osvežite i pokušajte ponovo.",
                "lockVersion",
            ) from error
        await self._session.refresh(revision)
        return await self._term_out(term, revision)

    async def _require_term_approvals(self, revision_id: UUID) -> None:
        approved = {
            item.capability
            for item in await self._term_decisions(revision_id)
            if item.outcome is ReviewOutcome.APPROVED
        }
        missing = TERM_REQUIRED_APPROVALS - approved
        if missing:
            labels = ", ".join(sorted(item.value for item in missing))
            raise TaxonomyConflictError("TAX-APPROVAL-002", f"Nedostaju odobrenja: {labels}.")

    async def transition(
        self,
        actor: StaffActor,
        term_id: UUID,
        revision_id: UUID,
        request: TaxonomyTransitionRequest,
    ) -> TaxonomyTermOut:
        self._require_org_admin(actor)
        term = await self._term(actor, term_id)
        revision = await self._revision(actor, term, revision_id)
        if revision.lock_version != request.lock_version:
            raise TaxonomyConflictError(
                "TAX-LOCK-001",
                "Registar je izmenjen u međuvremenu — osvežite i pokušajte ponovo.",
                "lockVersion",
            )
        if revision.organization_id != actor.organization_id:
            raise TaxonomyForbiddenError(
                "TAX-SYSTEM-003", "Globalni sistemski ugovor ne menja se kroz tenant panel."
            )
        if request.target is RevisionStatus.DRAFT and revision.status in (
            RevisionStatus.APPROVED,
            RevisionStatus.ARCHIVED,
        ):
            revision = await self._copy_revision(
                revision, actor, version_label=_next_version_label(revision.version_label)
            )
            await self._session.flush()
            await self._session.refresh(revision)
            return await self._term_out(term, revision)
        require_transition(revision.status, request.target)
        if request.target is RevisionStatus.APPROVED:
            relations = await self._relations(revision.id)
            await self._validate_shape(
                actor,
                term,
                revision,
                [
                    item.target_term_id
                    for item in relations
                    if item.relation_kind is TaxonomyRelationKind.RELATED_TOPIC
                ],
                next(
                    (
                        item.target_term_id
                        for item in relations
                        if item.relation_kind is TaxonomyRelationKind.REPLACEMENT
                    ),
                    None,
                ),
                published=True,
            )
            await self._require_term_approvals(revision.id)
        if request.target is RevisionStatus.PUBLISHED:
            relations = await self._relations(revision.id)
            await self._validate_shape(
                actor,
                term,
                revision,
                [
                    item.target_term_id
                    for item in relations
                    if item.relation_kind is TaxonomyRelationKind.RELATED_TOPIC
                ],
                next(
                    (
                        item.target_term_id
                        for item in relations
                        if item.relation_kind is TaxonomyRelationKind.REPLACEMENT
                    ),
                    None,
                ),
                published=True,
            )
            await self._archive_other_published(term, revision, actor)
            revision.published_at = datetime.now(UTC)
        if request.target is RevisionStatus.ARCHIVED:
            revision.archived_at = datetime.now(UTC)
        if request.target is RevisionStatus.DRAFT:
            await self._session.execute(
                delete(TaxonomyReviewDecision).where(
                    TaxonomyReviewDecision.revision_id == revision.id
                )
            )
        from_status = revision.status
        revision.status = request.target
        revision.updated_by_user_id = actor.user_id
        revision.updated_at = datetime.now(UTC)
        self._log_term_event(revision.id, from_status, request.target, actor)
        try:
            await self._session.flush()
        except StaleDataError as error:
            raise TaxonomyConflictError(
                "TAX-LOCK-001",
                "Registar je izmenjen u međuvremenu — osvežite i pokušajte ponovo.",
                "lockVersion",
            ) from error
        await self._session.refresh(revision)
        return await self._term_out(term, revision)

    async def _archive_other_published(
        self, term: TaxonomyTerm, revision: TaxonomyTermRevision, actor: StaffActor
    ) -> None:
        other = await self._session.scalar(
            select(TaxonomyTermRevision).where(
                TaxonomyTermRevision.term_id == term.id,
                TaxonomyTermRevision.organization_id == revision.organization_id,
                TaxonomyTermRevision.locale == revision.locale,
                TaxonomyTermRevision.status == RevisionStatus.PUBLISHED,
                TaxonomyTermRevision.id != revision.id,
            )
        )
        if other is None:
            return
        other.status = RevisionStatus.ARCHIVED
        other.archived_at = datetime.now(UTC)
        other.updated_by_user_id = actor.user_id
        self._log_term_event(
            other.id, RevisionStatus.PUBLISHED, RevisionStatus.ARCHIVED, actor, "superseded"
        )

    def _log_term_event(
        self,
        revision_id: UUID,
        from_status: RevisionStatus | None,
        to_status: RevisionStatus,
        actor: StaffActor,
        reason: str | None = None,
    ) -> None:
        self._session.add(
            TaxonomyPublicationEvent(
                term_revision_id=revision_id,
                from_status=from_status,
                to_status=to_status,
                actor_user_id=actor.user_id,
                reason=reason,
            )
        )

    async def list_public(
        self, organization_id: UUID, locale: str = "sr-Latn"
    ) -> PublicTaxonomyOut:
        terms = (
            await self._session.scalars(
                select(TaxonomyTerm).where(
                    or_(
                        TaxonomyTerm.organization_id == organization_id,
                        TaxonomyTerm.system_defined.is_(True),
                    )
                )
            )
        ).all()
        outputs: list[PublicTaxonomyTermOut] = []
        for term in terms:
            revision = await self._published_effective_revision(term, organization_id, locale)
            if revision is None or not revision.public_visible or not revision.compass_enabled:
                continue
            parent = (
                await self._session.get(TaxonomyTerm, revision.primary_parent_term_id)
                if revision.primary_parent_term_id
                else None
            )
            journey = (
                await self._session.get(TaxonomyTerm, revision.journey_intent_term_id)
                if revision.journey_intent_term_id
                else None
            )
            if term.axis is TaxonomyAxis.TOPIC:
                parent_revision = (
                    await self._published_effective_revision(parent, organization_id, locale)
                    if parent is not None
                    else None
                )
                journey_revision = (
                    await self._published_effective_revision(journey, organization_id, locale)
                    if journey is not None
                    else None
                )
                if (
                    parent_revision is None
                    or not parent_revision.public_visible
                    or not parent_revision.compass_enabled
                    or journey_revision is None
                    or not journey_revision.public_visible
                    or not journey_revision.compass_enabled
                ):
                    continue
            relations = await self._relations(revision.id)
            related_ids: list[str] = []
            for relation in relations:
                if relation.relation_kind is not TaxonomyRelationKind.RELATED_TOPIC:
                    continue
                target = await self._session.get(TaxonomyTerm, relation.target_term_id)
                target_revision = (
                    await self._published_effective_revision(target, organization_id, locale)
                    if target is not None
                    else None
                )
                if (
                    target is not None
                    and target_revision is not None
                    and target_revision.public_visible
                    and target_revision.compass_enabled
                ):
                    related_ids.append(target.stable_id)
            outputs.append(
                PublicTaxonomyTermOut(
                    term_id=term.id,
                    axis=term.axis,
                    stable_id=term.stable_id,
                    public_label=revision.public_label,
                    short_description=revision.short_description,
                    parent_stable_id=parent.stable_id if parent else None,
                    journey_intent=journey.stable_id if journey else None,
                    sort_order=revision.sort_order,
                    icon_key=revision.icon_key,
                    asset_id=revision.asset_id,
                    search_terms=[
                        item.original_value for item in await self._search_terms(revision.id)
                    ],
                    related_stable_ids=sorted(related_ids),
                )
            )
        return PublicTaxonomyOut(
            taxonomy_version=TAXONOMY_VERSION,
            locale=locale,
            terms=sorted(
                outputs, key=lambda item: (item.axis.value, item.sort_order, item.public_label)
            ),
        )

    async def _link(self, actor: StaffActor, link_id: UUID) -> TaxonomyIntakeLink:
        link = await self._session.scalar(
            select(TaxonomyIntakeLink).where(
                TaxonomyIntakeLink.id == link_id,
                TaxonomyIntakeLink.organization_id == actor.organization_id,
            )
        )
        if link is None:
            raise TaxonomyNotFoundError("TAX-LINK-001", "Povezivanje ne postoji.", "linkId")
        return link

    async def _link_decisions(self, link_id: UUID) -> list[TaxonomyIntakeLinkReviewDecision]:
        return list(
            (
                await self._session.scalars(
                    select(TaxonomyIntakeLinkReviewDecision).where(
                        TaxonomyIntakeLinkReviewDecision.link_id == link_id
                    )
                )
            ).all()
        )

    async def _link_out(self, actor: StaffActor, link: TaxonomyIntakeLink) -> TaxonomyIntakeLinkOut:
        topic = await self._session.get(TaxonomyTerm, link.topic_term_id)
        support = await self._session.get(TaxonomyTerm, link.support_area_term_id)
        if topic is None or support is None:
            raise TaxonomyConflictError("TAX-LINK-002", "Povezivanje sadrži nepostojeću referencu.")
        topic_revision = await self._latest_effective_revision(
            topic, actor.organization_id, "sr-Latn"
        )
        support_revision = await self._latest_effective_revision(
            support, actor.organization_id, "sr-Latn"
        )
        if topic_revision is None or support_revision is None:
            raise TaxonomyConflictError("TAX-LINK-002", "Povezivanje sadrži nedostupnu referencu.")
        return TaxonomyIntakeLinkOut(
            link_id=link.id,
            topic_term_id=topic.id,
            topic_stable_id=topic.stable_id,
            topic_label=topic_revision.public_label,
            support_area_term_id=support.id,
            support_area_stable_id=support.stable_id,
            support_area_label=support_revision.public_label,
            status=link.status,
            lock_version=link.lock_version,
            decisions=[
                await self._decision_out(item) for item in await self._link_decisions(link.id)
            ],
            events=[await self._event_out(item) for item in await self._events(link_id=link.id)],
            created_by=await self._actor_summary(link.created_by_user_id),
            updated_by=await self._actor_summary(link.updated_by_user_id),
            created_at=link.created_at,
            updated_at=link.updated_at,
        )

    async def list_intake_links(self, actor: StaffActor) -> list[TaxonomyIntakeLinkOut]:
        self._require_org_admin(actor)
        links = (
            await self._session.scalars(
                select(TaxonomyIntakeLink)
                .where(TaxonomyIntakeLink.organization_id == actor.organization_id)
                .order_by(TaxonomyIntakeLink.created_at)
            )
        ).all()
        return [await self._link_out(actor, item) for item in links]

    async def create_intake_link(
        self, actor: StaffActor, request: CreateTaxonomyIntakeLinkRequest
    ) -> TaxonomyIntakeLinkOut:
        self._require_org_admin(actor)
        topic = await self._reference_term(
            actor,
            request.topic_term_id,
            axis=TaxonomyAxis.TOPIC,
            field_path="topicTermId",
        )
        support = await self._reference_term(
            actor,
            request.support_area_term_id,
            axis=TaxonomyAxis.SUPPORT_AREA,
            field_path="supportAreaTermId",
        )
        if topic.organization_id != actor.organization_id or not support.system_defined:
            raise TaxonomyValidationError(
                "TAX-LINK-003", "Tema i Intake oblast nisu u dozvoljenom opsegu."
            )
        existing = await self._session.scalar(
            select(TaxonomyIntakeLink.id).where(
                TaxonomyIntakeLink.organization_id == actor.organization_id,
                TaxonomyIntakeLink.topic_term_id == topic.id,
                TaxonomyIntakeLink.support_area_term_id == support.id,
            )
        )
        if existing is not None:
            raise TaxonomyConflictError("TAX-LINK-004", "Ovo povezivanje već postoji.")
        link = TaxonomyIntakeLink(
            organization_id=actor.organization_id,
            topic_term_id=topic.id,
            support_area_term_id=support.id,
            status=RevisionStatus.DRAFT,
            created_by_user_id=actor.user_id,
            updated_by_user_id=actor.user_id,
        )
        self._session.add(link)
        try:
            await self._session.flush()
        except IntegrityError as error:
            raise TaxonomyConflictError("TAX-LINK-004", "Ovo povezivanje već postoji.") from error
        self._log_link_event(link.id, None, RevisionStatus.DRAFT, actor)
        await self._session.flush()
        await self._session.refresh(link)
        return await self._link_out(actor, link)

    async def review_intake_link(
        self,
        actor: StaffActor,
        link_id: UUID,
        request: TaxonomyIntakeLinkReviewRequest,
    ) -> TaxonomyIntakeLinkOut:
        self._require_org_admin(actor)
        link = await self._link(actor, link_id)
        if link.status is not RevisionStatus.IN_REVIEW:
            raise TaxonomyConflictError(
                "TAX-LINK-STATE-001", "Povezivanje nije poslato na pregled."
            )
        if request.capability not in LINK_REQUIRED_APPROVALS:
            raise TaxonomyValidationError(
                "TAX-LINK-APPROVAL-001",
                "Topic → Intake povezivanje traži Stručno odobrenje.",
                "capability",
            )
        decision = await self._session.scalar(
            select(TaxonomyIntakeLinkReviewDecision).where(
                TaxonomyIntakeLinkReviewDecision.link_id == link.id,
                TaxonomyIntakeLinkReviewDecision.capability == request.capability,
            )
        )
        if decision is None:
            self._session.add(
                TaxonomyIntakeLinkReviewDecision(
                    link_id=link.id,
                    capability=request.capability,
                    outcome=request.outcome,
                    decided_by_user_id=actor.user_id,
                    note=request.note,
                )
            )
        else:
            decision.outcome = request.outcome
            decision.decided_by_user_id = actor.user_id
            decision.decided_at = datetime.now(UTC)
            decision.note = request.note
        link.updated_by_user_id = actor.user_id
        link.updated_at = datetime.now(UTC)
        try:
            await self._session.flush()
        except StaleDataError as error:
            raise TaxonomyConflictError(
                "TAX-LOCK-001", "Povezivanje je izmenjeno u međuvremenu."
            ) from error
        await self._session.refresh(link)
        return await self._link_out(actor, link)

    async def transition_intake_link(
        self,
        actor: StaffActor,
        link_id: UUID,
        request: TaxonomyIntakeLinkTransitionRequest,
    ) -> TaxonomyIntakeLinkOut:
        self._require_org_admin(actor)
        link = await self._link(actor, link_id)
        if link.lock_version != request.lock_version:
            raise TaxonomyConflictError(
                "TAX-LOCK-001",
                "Povezivanje je izmenjeno u međuvremenu — osvežite stranicu.",
                "lockVersion",
            )
        require_transition(link.status, request.target)
        if request.target is RevisionStatus.APPROVED:
            approved = {
                item.capability
                for item in await self._link_decisions(link.id)
                if item.outcome is ReviewOutcome.APPROVED
            }
            if not LINK_REQUIRED_APPROVALS.issubset(approved):
                raise TaxonomyConflictError(
                    "TAX-LINK-APPROVAL-002", "Nedostaje Stručno odobrenje povezivanja."
                )
        if request.target is RevisionStatus.PUBLISHED:
            await self._reference_term(
                actor,
                link.topic_term_id,
                axis=TaxonomyAxis.TOPIC,
                field_path="topicTermId",
                published=True,
            )
            await self._reference_term(
                actor,
                link.support_area_term_id,
                axis=TaxonomyAxis.SUPPORT_AREA,
                field_path="supportAreaTermId",
                published=True,
            )
            link.published_at = datetime.now(UTC)
        if request.target is RevisionStatus.ARCHIVED:
            link.archived_at = datetime.now(UTC)
        if request.target is RevisionStatus.DRAFT:
            await self._session.execute(
                delete(TaxonomyIntakeLinkReviewDecision).where(
                    TaxonomyIntakeLinkReviewDecision.link_id == link.id
                )
            )
        if request.target is RevisionStatus.DRAFT and link.status is RevisionStatus.ARCHIVED:
            link.published_at = None
            link.archived_at = None
        from_status = link.status
        link.status = request.target
        link.updated_by_user_id = actor.user_id
        link.updated_at = datetime.now(UTC)
        self._log_link_event(link.id, from_status, request.target, actor)
        try:
            await self._session.flush()
        except StaleDataError as error:
            raise TaxonomyConflictError(
                "TAX-LOCK-001", "Povezivanje je izmenjeno u međuvremenu."
            ) from error
        await self._session.refresh(link)
        return await self._link_out(actor, link)

    async def delete_intake_link(self, actor: StaffActor, link_id: UUID) -> None:
        self._require_org_admin(actor)
        link = await self._link(actor, link_id)
        if link.status is not RevisionStatus.DRAFT:
            raise TaxonomyConflictError(
                "TAX-LINK-DELETE-001",
                "Može se obrisati samo povezivanje koje je još radna verzija.",
            )
        event_ids = (
            await self._session.scalars(
                select(TaxonomyPublicationEvent.id)
                .where(TaxonomyPublicationEvent.intake_link_id == link.id)
                .limit(2)
            )
        ).all()
        if len(event_ids) > 1:
            raise TaxonomyConflictError(
                "TAX-LINK-DELETE-002",
                "Povezivanje ima istoriju i ne može se obrisati; koristite Arhiviraj.",
            )
        await self._session.delete(link)
        await self._session.flush()

    def _log_link_event(
        self,
        link_id: UUID,
        from_status: RevisionStatus | None,
        to_status: RevisionStatus,
        actor: StaffActor,
        reason: str | None = None,
    ) -> None:
        self._session.add(
            TaxonomyPublicationEvent(
                intake_link_id=link_id,
                from_status=from_status,
                to_status=to_status,
                actor_user_id=actor.user_id,
                reason=reason,
            )
        )
