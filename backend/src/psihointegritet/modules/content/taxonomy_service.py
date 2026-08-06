"""Application service for the D-053 / ADR-022 Kompas registry."""

from __future__ import annotations

import re
import unicodedata
from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy import delete, func, or_, select
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
    TaxonomyRouteKind,
    TaxonomyTerm,
    TaxonomyTermRelation,
    TaxonomyTermRevision,
    TaxonomyTermRoute,
    TaxonomyTermSearchTerm,
)
from psihointegritet.modules.content.taxonomy_schemas import (
    ConfirmTaxonomyRouteRequest,
    CreateTaxonomyIntakeLinkRequest,
    CreateTaxonomyTermRequest,
    PublicTaxonomyOut,
    PublicTaxonomyTermOut,
    SuggestTaxonomyRouteRequest,
    TaxonomyEventOut,
    TaxonomyIntakeLinkOut,
    TaxonomyIntakeLinkReviewRequest,
    TaxonomyIntakeLinkTransitionRequest,
    TaxonomyRelationOut,
    TaxonomyReviewDecisionOut,
    TaxonomyReviewDecisionRequest,
    TaxonomyRouteOut,
    TaxonomyRouteSuggestionOut,
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
ROUTE_KIND_BY_AXIS = {
    TaxonomyAxis.TOPIC_GROUP: TaxonomyRouteKind.AREA,
    TaxonomyAxis.TOPIC: TaxonomyRouteKind.TOPIC,
}
ROUTE_PREFIX_BY_KIND = {
    TaxonomyRouteKind.AREA: "/kompas/oblast",
    TaxonomyRouteKind.TOPIC: "/kompas/tema",
}
_SLUG_SEPARATORS = re.compile(r"[^a-z0-9]+")
_SERBIAN_ASCII = str.maketrans({"č": "c", "ć": "c", "ž": "z", "š": "s", "đ": "dj"})


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


def _slugify(value: str) -> str:
    latin = value.casefold().translate(_SERBIAN_ASCII)
    ascii_value = unicodedata.normalize("NFKD", latin).encode("ascii", "ignore").decode("ascii")
    return _SLUG_SEPARATORS.sub("-", ascii_value).strip("-")[:160].rstrip("-")


def _canonical_path(route_kind: TaxonomyRouteKind, slug: str) -> str:
    return f"{ROUTE_PREFIX_BY_KIND[route_kind]}/{slug}"


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

    @staticmethod
    def _route_kind(term: TaxonomyTerm) -> TaxonomyRouteKind:
        route_kind = ROUTE_KIND_BY_AXIS.get(term.axis)
        if route_kind is None or term.system_defined or term.organization_id is None:
            raise TaxonomyValidationError(
                "TAX-ROUTE-003",
                "Javna putanja postoji samo za oblast ili konkretnu temu.",
                "termId",
            )
        return route_kind

    async def _canonical_route(self, term_id: UUID, locale: str) -> TaxonomyTermRoute | None:
        return await self._session.scalar(
            select(TaxonomyTermRoute).where(
                TaxonomyTermRoute.term_id == term_id,
                TaxonomyTermRoute.locale == locale,
                TaxonomyTermRoute.is_canonical.is_(True),
            )
        )

    async def _route_out(self, route: TaxonomyTermRoute) -> TaxonomyRouteOut:
        return TaxonomyRouteOut(
            route_id=route.id,
            term_id=route.term_id,
            locale=route.locale,
            route_kind=route.route_kind,
            slug=route.slug,
            canonical_path=_canonical_path(route.route_kind, route.slug),
            is_canonical=route.is_canonical,
            lock_version=route.lock_version,
            created_by=await self._actor_summary(route.created_by_user_id),
            updated_by=await self._actor_summary(route.updated_by_user_id),
            created_at=route.created_at,
            updated_at=route.updated_at,
            superseded_at=route.superseded_at,
        )

    async def list_routes(
        self, actor: StaffActor, term_id: UUID, locale: str = "sr-Latn"
    ) -> list[TaxonomyRouteOut]:
        self._require_org_admin(actor)
        term = await self._term(actor, term_id)
        self._route_kind(term)
        routes = (
            await self._session.scalars(
                select(TaxonomyTermRoute)
                .where(
                    TaxonomyTermRoute.term_id == term.id,
                    TaxonomyTermRoute.organization_id == actor.organization_id,
                    TaxonomyTermRoute.locale == locale,
                )
                .order_by(
                    TaxonomyTermRoute.is_canonical.desc(),
                    TaxonomyTermRoute.created_at.desc(),
                )
            )
        ).all()
        return [await self._route_out(route) for route in routes]

    async def suggest_route(
        self,
        actor: StaffActor,
        term_id: UUID,
        request: SuggestTaxonomyRouteRequest,
    ) -> TaxonomyRouteSuggestionOut:
        self._require_org_admin(actor)
        term = await self._term(actor, term_id)
        route_kind = self._route_kind(term)
        revision = await self._latest_effective_revision(
            term, actor.organization_id, request.locale
        )
        if revision is None:
            raise TaxonomyValidationError(
                "TAX-ROUTE-005",
                "Termin nema verziju za izabrani jezik.",
                "locale",
            )
        current = await self._canonical_route(term.id, request.locale)
        if current is not None:
            return TaxonomyRouteSuggestionOut(
                slug=current.slug,
                canonical_path=_canonical_path(route_kind, current.slug),
                available=True,
                current_route_id=current.id,
                current_lock_version=current.lock_version,
            )

        base = _slugify(revision.public_label) or term.stable_id
        if len(base) < 2:
            raise TaxonomyValidationError(
                "TAX-ROUTE-001",
                "Od javnog naziva nije moguće napraviti bezbednu putanju.",
                "publicLabel",
            )
        candidate = base
        suffix_number = 2
        while (
            await self._session.scalar(
                select(TaxonomyTermRoute.id).where(
                    TaxonomyTermRoute.organization_id == actor.organization_id,
                    TaxonomyTermRoute.locale == request.locale,
                    TaxonomyTermRoute.route_kind == route_kind,
                    TaxonomyTermRoute.slug == candidate,
                )
            )
            is not None
        ):
            suffix = f"-{suffix_number}"
            candidate = f"{base[: 160 - len(suffix)].rstrip('-')}{suffix}"
            suffix_number += 1
        return TaxonomyRouteSuggestionOut(
            slug=candidate,
            canonical_path=_canonical_path(route_kind, candidate),
            available=True,
        )

    async def confirm_route(
        self,
        actor: StaffActor,
        term_id: UUID,
        request: ConfirmTaxonomyRouteRequest,
    ) -> TaxonomyRouteOut:
        self._require_org_admin(actor)
        term = await self._term(actor, term_id)
        route_kind = self._route_kind(term)
        revision = await self._latest_effective_revision(
            term, actor.organization_id, request.locale
        )
        if revision is None:
            raise TaxonomyValidationError(
                "TAX-ROUTE-005",
                "Termin nema verziju za izabrani jezik.",
                "locale",
            )
        if _slugify(request.slug) != request.slug:
            raise TaxonomyValidationError(
                "TAX-ROUTE-001",
                "Javna putanja koristi mala ASCII slova, brojeve i crtice.",
                "slug",
            )

        current = await self._canonical_route(term.id, request.locale)
        if current is None and request.lock_version is not None:
            raise TaxonomyConflictError(
                "TAX-LOCK-001",
                "Putanja je izmenjena u međuvremenu — osvežite i pokušajte ponovo.",
                "lockVersion",
            )
        if current is not None:
            if request.lock_version is None or current.lock_version != request.lock_version:
                raise TaxonomyConflictError(
                    "TAX-LOCK-001",
                    "Putanja je izmenjena u međuvremenu — osvežite i pokušajte ponovo.",
                    "lockVersion",
                )
            if current.slug == request.slug:
                return await self._route_out(current)

        existing = await self._session.scalar(
            select(TaxonomyTermRoute).where(
                TaxonomyTermRoute.organization_id == actor.organization_id,
                TaxonomyTermRoute.locale == request.locale,
                TaxonomyTermRoute.route_kind == route_kind,
                TaxonomyTermRoute.slug == request.slug,
            )
        )
        if existing is not None:
            raise TaxonomyConflictError(
                "TAX-ROUTE-002",
                "Ova javna putanja je već rezervisana i ne može se ponovo koristiti.",
                "slug",
            )

        now = datetime.now(UTC)
        if current is not None:
            current.is_canonical = False
            current.superseded_at = now
            current.updated_by_user_id = actor.user_id
            current.updated_at = now
            try:
                await self._session.flush()
            except StaleDataError as error:
                raise TaxonomyConflictError(
                    "TAX-LOCK-001",
                    "Putanja je izmenjena u međuvremenu — osvežite i pokušajte ponovo.",
                    "lockVersion",
                ) from error

        route = TaxonomyTermRoute(
            organization_id=actor.organization_id,
            term_id=term.id,
            locale=request.locale,
            route_kind=route_kind,
            slug=request.slug,
            is_canonical=True,
            created_by_user_id=actor.user_id,
            updated_by_user_id=actor.user_id,
        )
        self._session.add(route)
        try:
            await self._session.flush()
        except IntegrityError as error:
            raise TaxonomyConflictError(
                "TAX-ROUTE-002",
                "Ova javna putanja je već rezervisana — osvežite i pokušajte ponovo.",
                "slug",
            ) from error
        await self._session.refresh(route)
        return await self._route_out(route)

    async def _require_canonical_route(
        self, term: TaxonomyTerm, locale: str
    ) -> TaxonomyTermRoute | None:
        if term.axis not in ROUTE_KIND_BY_AXIS:
            return None
        route = await self._canonical_route(term.id, locale)
        if route is None:
            raise TaxonomyConflictError(
                "TAX-ROUTE-004",
                "Pre objave potvrdite javnu putanju oblasti ili teme.",
                "canonicalPath",
            )
        return route

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
        allow_incomplete_topic_context: bool = False,
    ) -> None:
        if revision.icon_key and revision.asset_id:
            raise TaxonomyValidationError(
                "TAX-ASSET-001",
                "Izaberite ikonu ili asset, ne oba istovremeno.",
                "iconKey",
            )
        if term.axis is TaxonomyAxis.TOPIC:
            if revision.primary_parent_term_id is None:
                if not allow_incomplete_topic_context:
                    raise TaxonomyValidationError(
                        "TAX-HIER-001",
                        "Tema mora pripadati jednoj primarnoj grupi.",
                        "primaryParentTermId",
                    )
            else:
                await self._reference_term(
                    actor,
                    revision.primary_parent_term_id,
                    axis=TaxonomyAxis.TOPIC_GROUP,
                    field_path="primaryParentTermId",
                    published=published,
                    locale=revision.locale,
                )
            if revision.journey_intent_term_id is None:
                if not allow_incomplete_topic_context:
                    raise TaxonomyValidationError(
                        "TAX-JOURNEY-001",
                        "Tema mora imati izabran put korisnika.",
                        "journeyIntentTermId",
                    )
            else:
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
        canonical_route = (
            await self._canonical_route(term.id, revision.locale)
            if term.axis in ROUTE_KIND_BY_AXIS
            else None
        )
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
            canonical_path=(
                _canonical_path(canonical_route.route_kind, canonical_route.slug)
                if canonical_route is not None
                else None
            ),
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

    async def _batch_assemble_term_outs(
        self,
        terms: list[TaxonomyTerm],
        revisions: dict[UUID, TaxonomyTermRevision],
        locale: str,
    ) -> dict[UUID, TaxonomyTermOut]:
        """Assemble :class:`TaxonomyTermOut` per term_id from pre-fetched data.

        All sub-entity queries are batched: one query each for search terms,
        relations, decisions, events, canonical routes, related terms and
        actors.  Where the original ``_term_out`` loop issued ~10 queries per
        term, this method issues ~10 queries **total**.

        Keyed by ``term.id`` rather than returned positionally: not every
        term in *terms* has a revision (status filter, missing locale
        revision, ...), so the result is shorter than *terms* and callers
        must look up by id instead of assuming index alignment.
        """
        if not revisions:
            return {}

        revision_ids = list(revisions.keys())

        # ---- search terms (1 query) ----------------------------------------
        search_rows: dict[UUID, list[str]] = {rid: [] for rid in revision_ids}
        for row in (
            await self._session.scalars(
                select(TaxonomyTermSearchTerm)
                .where(TaxonomyTermSearchTerm.revision_id.in_(revision_ids))
                .order_by(TaxonomyTermSearchTerm.original_value)
            )
        ).all():
            search_rows.setdefault(row.revision_id, []).append(row.original_value)

        # ---- relations (1 query) --------------------------------------------
        relation_rows: dict[UUID, list[TaxonomyTermRelation]] = {rid: [] for rid in revision_ids}
        all_relations: list[TaxonomyTermRelation] = list(
            await self._session.scalars(
                select(TaxonomyTermRelation).where(
                    TaxonomyTermRelation.source_revision_id.in_(revision_ids)
                )
            )
        )
        for rel in all_relations:
            relation_rows.setdefault(rel.source_revision_id, []).append(rel)

        # ---- decisions (1 query) --------------------------------------------
        decision_rows: dict[UUID, list[TaxonomyReviewDecision]] = {rid: [] for rid in revision_ids}
        all_decisions: list[TaxonomyReviewDecision] = list(
            await self._session.scalars(
                select(TaxonomyReviewDecision).where(
                    TaxonomyReviewDecision.revision_id.in_(revision_ids)
                )
            )
        )
        for dec in all_decisions:
            decision_rows.setdefault(dec.revision_id, []).append(dec)

        # ---- events (1 query) -----------------------------------------------
        event_rows: dict[UUID, list[TaxonomyPublicationEvent]] = {rid: [] for rid in revision_ids}
        all_events: list[TaxonomyPublicationEvent] = list(
            await self._session.scalars(
                select(TaxonomyPublicationEvent)
                .where(TaxonomyPublicationEvent.term_revision_id.in_(revision_ids))
                .order_by(TaxonomyPublicationEvent.created_at.desc())
            )
        )
        for evt in all_events:
            event_rows.setdefault(evt.term_revision_id, []).append(evt)  # type: ignore[arg-type]

        # ---- canonical routes (1 query) -------------------------------------
        route_kind_term_ids = [t.id for t in terms if t.axis in ROUTE_KIND_BY_AXIS]
        canonical_routes: dict[UUID, TaxonomyTermRoute] = {}
        if route_kind_term_ids:
            for route in (
                await self._session.scalars(
                    select(TaxonomyTermRoute).where(
                        TaxonomyTermRoute.term_id.in_(route_kind_term_ids),
                        TaxonomyTermRoute.locale == locale,
                        TaxonomyTermRoute.is_canonical.is_(True),
                    )
                )
            ).all():
                canonical_routes[route.term_id] = route

        # ---- related TaxonomyTerm rows (1 query for parents + journeys + relation targets)
        related_term_ids: set[UUID] = set()
        for rev in revisions.values():
            if rev.primary_parent_term_id:
                related_term_ids.add(rev.primary_parent_term_id)
            if rev.journey_intent_term_id:
                related_term_ids.add(rev.journey_intent_term_id)
        for rel in all_relations:
            related_term_ids.add(rel.target_term_id)
        related_terms: dict[UUID, TaxonomyTerm] = {}
        if related_term_ids:
            for rt in (
                await self._session.scalars(
                    select(TaxonomyTerm).where(TaxonomyTerm.id.in_(related_term_ids))
                )
            ).all():
                related_terms[rt.id] = rt

        # ---- actors (1 query) -----------------------------------------------
        user_ids: set[UUID] = set()
        for rev in revisions.values():
            if rev.created_by_user_id:
                user_ids.add(rev.created_by_user_id)
            if rev.updated_by_user_id:
                user_ids.add(rev.updated_by_user_id)
        for dec in all_decisions:
            if dec.decided_by_user_id:
                user_ids.add(dec.decided_by_user_id)
        for evt in all_events:
            if evt.actor_user_id:
                user_ids.add(evt.actor_user_id)
        users: dict[UUID, InternalUser] = {}
        if user_ids:
            for user in (
                await self._session.scalars(
                    select(InternalUser).where(InternalUser.id.in_(user_ids))
                )
            ).all():
                users[user.id] = user

        # ---- helpers --------------------------------------------------------
        def _actor(uid: UUID | None) -> ActorSummaryOut | None:
            if uid is None:
                return None
            user = users.get(uid)
            if user is None:
                return None
            return ActorSummaryOut(
                user_id=user.id,
                display_name=user.display_name or user.email or str(user.id),
                is_superadmin=user.is_superadmin,
            )

        def _decision_out(dec: TaxonomyReviewDecision) -> TaxonomyReviewDecisionOut:
            return TaxonomyReviewDecisionOut(
                capability=dec.capability,
                outcome=dec.outcome,
                decided_by=_actor(dec.decided_by_user_id),
                decided_at=dec.decided_at,
                note=dec.note,
            )

        def _event_out(evt: TaxonomyPublicationEvent) -> TaxonomyEventOut:
            return TaxonomyEventOut(
                from_status=evt.from_status,
                to_status=evt.to_status,
                actor=_actor(evt.actor_user_id),
                reason=evt.reason,
                created_at=evt.created_at,
            )

        # ---- assemble -------------------------------------------------------
        results: dict[UUID, TaxonomyTermOut] = {}
        for term in terms:
            revision = revisions.get(term.id)
            if revision is None:
                continue
            rid = revision.id

            # relations for this revision
            rels = relation_rows.get(rid, [])
            relation_outputs: list[TaxonomyRelationOut] = []
            for rel in rels:
                target = related_terms.get(rel.target_term_id)
                if target is not None:
                    relation_outputs.append(
                        TaxonomyRelationOut(
                            kind=rel.relation_kind,
                            target_term_id=target.id,
                            target_stable_id=target.stable_id,
                        )
                    )

            parent = (
                related_terms.get(revision.primary_parent_term_id)
                if revision.primary_parent_term_id
                else None
            )  # type: ignore[arg-type]
            journey = (
                related_terms.get(revision.journey_intent_term_id)
                if revision.journey_intent_term_id
                else None
            )  # type: ignore[arg-type]
            cr = canonical_routes.get(term.id)

            results[term.id] = TaxonomyTermOut(
                term_id=term.id,
                revision_id=rid,
                organization_id=revision.organization_id,
                axis=term.axis,
                stable_id=term.stable_id,
                canonical_path=(
                    _canonical_path(cr.route_kind, cr.slug) if cr is not None else None
                ),
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
                search_terms=search_rows.get(rid, []),
                relations=relation_outputs,
                decisions=[_decision_out(d) for d in decision_rows.get(rid, [])],
                events=[_event_out(e) for e in event_rows.get(rid, [])],
                created_by=_actor(revision.created_by_user_id),
                updated_by=_actor(revision.updated_by_user_id),
                created_at=revision.created_at,
                updated_at=revision.updated_at,
            )
        return results

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
        terms: list[TaxonomyTerm] = list(
            await self._session.scalars(statement.order_by(TaxonomyTerm.axis))
        )

        if not terms:
            return []

        term_ids = [term.id for term in terms]
        org_id = actor.organization_id

        # ---- batch-fetch latest tenant revisions (1 query) ------------------
        tenant_latest = (
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
        ).subquery("tenant_latest")

        tenant_revs: dict[UUID, TaxonomyTermRevision] = {}
        for rev in (
            await self._session.scalars(
                select(TaxonomyTermRevision)
                .join(
                    tenant_latest,
                    (TaxonomyTermRevision.term_id == tenant_latest.c.term_id)
                    & (TaxonomyTermRevision.created_at == tenant_latest.c.max_at),
                )
                .where(
                    TaxonomyTermRevision.organization_id == org_id,
                    TaxonomyTermRevision.locale == locale,
                )
            )
        ).all():
            # If two revisions share the same max created_at, keep the first
            tenant_revs.setdefault(rev.term_id, rev)

        # ---- system fallback for system-defined terms without tenant rev -----
        system_term_ids = [t.id for t in terms if t.system_defined and t.id not in tenant_revs]
        if system_term_ids:
            sys_latest = (
                select(
                    TaxonomyTermRevision.term_id,
                    func.max(TaxonomyTermRevision.created_at).label("max_at"),
                )
                .where(
                    TaxonomyTermRevision.term_id.in_(system_term_ids),
                    TaxonomyTermRevision.organization_id.is_(None),
                    TaxonomyTermRevision.locale == locale,
                )
                .group_by(TaxonomyTermRevision.term_id)
            ).subquery("sys_latest")

            for rev in (
                await self._session.scalars(
                    select(TaxonomyTermRevision)
                    .join(
                        sys_latest,
                        (TaxonomyTermRevision.term_id == sys_latest.c.term_id)
                        & (TaxonomyTermRevision.created_at == sys_latest.c.max_at),
                    )
                    .where(
                        TaxonomyTermRevision.organization_id.is_(None),
                        TaxonomyTermRevision.locale == locale,
                    )
                )
            ).all():
                tenant_revs.setdefault(rev.term_id, rev)

        # ---- status filter --------------------------------------------------
        if status is not None:
            tenant_revs = {tid: rev for tid, rev in tenant_revs.items() if rev.status == status}

        # ---- batch-assemble all outputs (~7 more queries, total) ------------
        all_outputs = await self._batch_assemble_term_outs(terms, tenant_revs, locale)

        # ---- text search filter ---------------------------------------------
        normalized_query = _normalize_search_term(query or "")
        if normalized_query:
            results: list[TaxonomyTermOut] = []
            for term in terms:
                output = all_outputs.get(term.id)
                if output is None:
                    continue
                haystack = " ".join(
                    [
                        term.stable_id,
                        output.public_label,
                        output.short_description,
                        *output.search_terms,
                    ]
                )
                if normalized_query in _normalize_search_term(haystack):
                    results.append(output)
            return sorted(
                results,
                key=lambda item: (item.axis.value, item.sort_order, item.public_label),
            )
        return sorted(
            all_outputs.values(),
            key=lambda item: (item.axis.value, item.sort_order, item.public_label),
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
        await self._validate_shape(
            actor,
            term,
            revision,
            request.related_topic_ids,
            None,
            allow_incomplete_topic_context=True,
        )
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
        await self._validate_shape(
            actor,
            term,
            revision,
            related,
            replacement,
            allow_incomplete_topic_context=True,
        )
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

    async def delete_revision(self, actor: StaffActor, term_id: UUID, revision_id: UUID) -> None:
        """Delete a tenant-owned revision on explicit administrator request.

        This is intentionally stronger than lifecycle archive: the caller has
        asked to remove the saved version itself. System revisions and terms
        referenced by another registry object remain protected.
        """
        self._require_org_admin(actor)
        term = await self._term(actor, term_id)
        revision = await self._revision(actor, term, revision_id)
        if revision.organization_id != actor.organization_id:
            raise TaxonomyForbiddenError(
                "TAX-SYSTEM-003", "Globalna sistemska verzija ne može se obrisati iz tenant panela."
            )
        await self._session.delete(revision)
        await self._session.flush()
        # The stable term identity is never deleted or recycled (ADR-022/K1.7),
        # even when its last saved revision is removed. A later edit can create
        # a new tenant revision for this same stable ID.

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
        if request.target is RevisionStatus.IN_REVIEW:
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
            )
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
            await self._require_canonical_route(term, revision.locale)
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

    async def _public_term_out(
        self, term: TaxonomyTerm, organization_id: UUID, locale: str
    ) -> PublicTaxonomyTermOut | None:
        revision = await self._published_effective_revision(term, organization_id, locale)
        if revision is None or not revision.public_visible or not revision.compass_enabled:
            return None
        canonical_route = (
            await self._canonical_route(term.id, locale)
            if term.axis in ROUTE_KIND_BY_AXIS
            else None
        )
        if term.axis in ROUTE_KIND_BY_AXIS and canonical_route is None:
            return None
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
            parent_route = (
                await self._canonical_route(parent.id, locale) if parent is not None else None
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
                or parent_route is None
                or journey_revision is None
                or not journey_revision.public_visible
                or not journey_revision.compass_enabled
            ):
                return None
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
            target_route = (
                await self._canonical_route(target.id, locale) if target is not None else None
            )
            if (
                target is not None
                and target_revision is not None
                and target_revision.public_visible
                and target_revision.compass_enabled
                and target_route is not None
            ):
                related_ids.append(target.stable_id)
        return PublicTaxonomyTermOut(
            term_id=term.id,
            axis=term.axis,
            stable_id=term.stable_id,
            canonical_path=(
                _canonical_path(canonical_route.route_kind, canonical_route.slug)
                if canonical_route is not None
                else None
            ),
            public_label=revision.public_label,
            short_description=revision.short_description,
            parent_stable_id=parent.stable_id if parent else None,
            journey_intent=journey.stable_id if journey else None,
            sort_order=revision.sort_order,
            icon_key=revision.icon_key,
            asset_id=revision.asset_id,
            search_terms=[item.original_value for item in await self._search_terms(revision.id)],
            related_stable_ids=sorted(related_ids),
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
            output = await self._public_term_out(term, organization_id, locale)
            if output is not None:
                outputs.append(output)
        return PublicTaxonomyOut(
            taxonomy_version=TAXONOMY_VERSION,
            locale=locale,
            terms=sorted(
                outputs,
                key=lambda item: (
                    item.axis.value,
                    item.sort_order,
                    item.public_label,
                    item.stable_id,
                ),
            ),
        )

    async def resolve_public_route(
        self,
        organization_id: UUID,
        route_kind: TaxonomyRouteKind,
        slug: str,
        locale: str = "sr-Latn",
    ) -> tuple[PublicTaxonomyTermOut, bool]:
        route = await self._session.scalar(
            select(TaxonomyTermRoute).where(
                TaxonomyTermRoute.organization_id == organization_id,
                TaxonomyTermRoute.locale == locale,
                TaxonomyTermRoute.route_kind == route_kind,
                TaxonomyTermRoute.slug == slug,
            )
        )
        if route is None:
            raise TaxonomyNotFoundError(
                "TAX-ROUTE-404", "Tražena Kompas stranica ne postoji.", "slug"
            )
        term = await self._session.get(TaxonomyTerm, route.term_id)
        if (
            term is None
            or term.organization_id != organization_id
            or ROUTE_KIND_BY_AXIS.get(term.axis) != route_kind
        ):
            raise TaxonomyNotFoundError(
                "TAX-ROUTE-404", "Tražena Kompas stranica ne postoji.", "slug"
            )
        output = await self._public_term_out(term, organization_id, locale)
        if output is None or output.canonical_path is None:
            raise TaxonomyNotFoundError(
                "TAX-ROUTE-404", "Tražena Kompas stranica nije objavljena.", "slug"
            )
        return output, not route.is_canonical

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
        links: list[TaxonomyIntakeLink] = list(
            await self._session.scalars(
                select(TaxonomyIntakeLink)
                .where(TaxonomyIntakeLink.organization_id == actor.organization_id)
                .order_by(TaxonomyIntakeLink.created_at)
            )
        )

        if not links:
            return []

        org_id = actor.organization_id
        locale = "sr-Latn"

        # ---- batch-fetch referenced TaxonomyTerms (1 query) -----------------
        all_term_ids: set[UUID] = set()
        for link in links:
            all_term_ids.add(link.topic_term_id)
            all_term_ids.add(link.support_area_term_id)
        terms_by_id: dict[UUID, TaxonomyTerm] = {}
        if all_term_ids:
            for term in (
                await self._session.scalars(
                    select(TaxonomyTerm).where(TaxonomyTerm.id.in_(all_term_ids))
                )
            ).all():
                terms_by_id[term.id] = term

        # ---- batch-fetch latest revisions for referenced terms (2 queries) --
        revision_term_ids = list(all_term_ids)
        tenant_latest = (
            select(
                TaxonomyTermRevision.term_id,
                func.max(TaxonomyTermRevision.created_at).label("max_at"),
            )
            .where(
                TaxonomyTermRevision.term_id.in_(revision_term_ids),
                TaxonomyTermRevision.organization_id == org_id,
                TaxonomyTermRevision.locale == locale,
            )
            .group_by(TaxonomyTermRevision.term_id)
        ).subquery("link_tenant_latest")

        revs_by_term: dict[UUID, TaxonomyTermRevision] = {}
        for rev in (
            await self._session.scalars(
                select(TaxonomyTermRevision)
                .join(
                    tenant_latest,
                    (TaxonomyTermRevision.term_id == tenant_latest.c.term_id)
                    & (TaxonomyTermRevision.created_at == tenant_latest.c.max_at),
                )
                .where(
                    TaxonomyTermRevision.organization_id == org_id,
                    TaxonomyTermRevision.locale == locale,
                )
            )
        ).all():
            revs_by_term.setdefault(rev.term_id, rev)

        # system fallback for system-defined terms
        sys_ids = [
            tid
            for tid in revision_term_ids
            if tid not in revs_by_term
            and terms_by_id.get(tid) is not None
            and terms_by_id[tid].system_defined
        ]
        if sys_ids:
            sys_latest = (
                select(
                    TaxonomyTermRevision.term_id,
                    func.max(TaxonomyTermRevision.created_at).label("max_at"),
                )
                .where(
                    TaxonomyTermRevision.term_id.in_(sys_ids),
                    TaxonomyTermRevision.organization_id.is_(None),
                    TaxonomyTermRevision.locale == locale,
                )
                .group_by(TaxonomyTermRevision.term_id)
            ).subquery("link_sys_latest")
            for rev in (
                await self._session.scalars(
                    select(TaxonomyTermRevision)
                    .join(
                        sys_latest,
                        (TaxonomyTermRevision.term_id == sys_latest.c.term_id)
                        & (TaxonomyTermRevision.created_at == sys_latest.c.max_at),
                    )
                    .where(
                        TaxonomyTermRevision.organization_id.is_(None),
                        TaxonomyTermRevision.locale == locale,
                    )
                )
            ).all():
                revs_by_term.setdefault(rev.term_id, rev)

        # ---- batch-fetch decisions (1 query) --------------------------------
        link_ids = [link.id for link in links]
        decisions_by_link: dict[UUID, list[TaxonomyIntakeLinkReviewDecision]] = {
            lid: [] for lid in link_ids
        }
        for dec in (
            await self._session.scalars(
                select(TaxonomyIntakeLinkReviewDecision).where(
                    TaxonomyIntakeLinkReviewDecision.link_id.in_(link_ids)
                )
            )
        ).all():
            decisions_by_link.setdefault(dec.link_id, []).append(dec)

        # ---- batch-fetch events (1 query) -----------------------------------
        events_by_link: dict[UUID, list[TaxonomyPublicationEvent]] = {lid: [] for lid in link_ids}
        for evt in (
            await self._session.scalars(
                select(TaxonomyPublicationEvent)
                .where(TaxonomyPublicationEvent.intake_link_id.in_(link_ids))
                .order_by(TaxonomyPublicationEvent.created_at.desc())
            )
        ).all():
            if evt.intake_link_id:
                events_by_link.setdefault(evt.intake_link_id, []).append(evt)

        # ---- batch-fetch actors (1 query) -----------------------------------
        user_ids: set[UUID] = set()
        for link in links:
            if link.created_by_user_id:
                user_ids.add(link.created_by_user_id)
            if link.updated_by_user_id:
                user_ids.add(link.updated_by_user_id)
        for decs in decisions_by_link.values():
            for dec in decs:
                if dec.decided_by_user_id:
                    user_ids.add(dec.decided_by_user_id)
        for evts in events_by_link.values():
            for evt in evts:
                if evt.actor_user_id:
                    user_ids.add(evt.actor_user_id)
        users: dict[UUID, InternalUser] = {}
        if user_ids:
            for user in (
                await self._session.scalars(
                    select(InternalUser).where(InternalUser.id.in_(user_ids))
                )
            ).all():
                users[user.id] = user

        # ---- helpers --------------------------------------------------------
        def _actor(uid: UUID | None) -> ActorSummaryOut | None:
            if uid is None:
                return None
            user = users.get(uid)
            if user is None:
                return None
            return ActorSummaryOut(
                user_id=user.id,
                display_name=user.display_name or user.email or str(user.id),
                is_superadmin=user.is_superadmin,
            )

        def _decision_out(
            dec: TaxonomyIntakeLinkReviewDecision,
        ) -> TaxonomyReviewDecisionOut:
            return TaxonomyReviewDecisionOut(
                capability=dec.capability,
                outcome=dec.outcome,
                decided_by=_actor(dec.decided_by_user_id),
                decided_at=dec.decided_at,
                note=dec.note,
            )

        def _event_out(evt: TaxonomyPublicationEvent) -> TaxonomyEventOut:
            return TaxonomyEventOut(
                from_status=evt.from_status,
                to_status=evt.to_status,
                actor=_actor(evt.actor_user_id),
                reason=evt.reason,
                created_at=evt.created_at,
            )

        # ---- assemble -------------------------------------------------------
        results: list[TaxonomyIntakeLinkOut] = []
        for link in links:
            topic = terms_by_id.get(link.topic_term_id)
            support = terms_by_id.get(link.support_area_term_id)
            if topic is None or support is None:
                raise TaxonomyConflictError(
                    "TAX-LINK-002", "Povezivanje sadrži nepostojeću referencu."
                )
            topic_rev = revs_by_term.get(topic.id)
            support_rev = revs_by_term.get(support.id)
            if topic_rev is None or support_rev is None:
                raise TaxonomyConflictError(
                    "TAX-LINK-002", "Povezivanje sadrži nedostupnu referencu."
                )

            results.append(
                TaxonomyIntakeLinkOut(
                    link_id=link.id,
                    topic_term_id=topic.id,
                    topic_stable_id=topic.stable_id,
                    topic_label=topic_rev.public_label,
                    support_area_term_id=support.id,
                    support_area_stable_id=support.stable_id,
                    support_area_label=support_rev.public_label,
                    status=link.status,
                    lock_version=link.lock_version,
                    decisions=[_decision_out(d) for d in decisions_by_link.get(link.id, [])],
                    events=[_event_out(e) for e in events_by_link.get(link.id, [])],
                    created_by=_actor(link.created_by_user_id),
                    updated_by=_actor(link.updated_by_user_id),
                    created_at=link.created_at,
                    updated_at=link.updated_at,
                )
            )
        return results

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
