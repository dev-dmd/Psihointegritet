"""Anonymous Kompas read-model and deterministic recommendation service.

This service is a separate read boundary from ``ContentService.list_published``.
The latter powers ordinary public CMS overrides, including pages that do not
participate in Kompas.  Every query here is fail-closed around complete,
currently public taxonomy metadata and the explicit system access term
``public``.
"""

from __future__ import annotations

from collections import defaultdict
from dataclasses import dataclass
from typing import Final
from uuid import UUID

from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from psihointegritet.modules.content.compass_rules import (
    COMPASS_RULE_VERSION,
    CandidateSignals,
    RankingOutcome,
    ReasonKind,
    ReasonSignal,
    SelectionSignals,
    rank_candidates,
)
from psihointegritet.modules.content.compass_schemas import (
    CompassContentCardOut,
    CompassHandoffCandidateOut,
    CompassNormalizedSelectionOut,
    CompassPaginationOut,
    CompassReasonOut,
    CompassRecommendationItemOut,
    CompassRecommendationOut,
    CompassRecommendationRequest,
    CompassSelectionAdjustmentOut,
    CompassTaxonomyPageOut,
)
from psihointegritet.modules.content.models import (
    ContentEntry,
    ContentRevision,
    ContentRevisionDiscovery,
    ContentRevisionTaxonomyTerm,
    ContentTaxonomyRole,
    ContentType,
)
from psihointegritet.modules.content.schemas import SeoFields
from psihointegritet.modules.content.system_catalog import is_system_content_definition
from psihointegritet.modules.content.taxonomy_models import (
    ContentFormat,
    TaxonomyAxis,
    TaxonomyRouteKind,
    TaxonomyTerm,
    TaxonomyTermRevision,
)
from psihointegritet.modules.content.taxonomy_schemas import (
    PublicTaxonomyOut,
    PublicTaxonomyTermOut,
)
from psihointegritet.modules.content.taxonomy_service import TAXONOMY_VERSION, TaxonomyService
from psihointegritet.shared.domain.publication import RevisionStatus


class CompassError(RuntimeError):
    def __init__(self, code: str, message: str, field_path: str | None = None) -> None:
        super().__init__(message)
        self.code = code
        self.message = message
        self.field_path = field_path


class CompassVersionError(CompassError):
    pass


@dataclass(frozen=True, slots=True)
class _EligibleCandidate:
    entry_id: UUID
    card: CompassContentCardOut
    signals: CandidateSignals


_REASON_AXIS: Final[dict[ReasonKind, TaxonomyAxis]] = {
    "topic": TaxonomyAxis.TOPIC,
    "area": TaxonomyAxis.TOPIC_GROUP,
    "journey": TaxonomyAxis.JOURNEY_INTENT,
    "goal": TaxonomyAxis.CONTENT_GOAL,
    "audience": TaxonomyAxis.AUDIENCE,
    "related-topic": TaxonomyAxis.TOPIC,
}


def _terms_by_axis(
    taxonomy: PublicTaxonomyOut,
) -> dict[TaxonomyAxis, dict[str, PublicTaxonomyTermOut]]:
    output: dict[TaxonomyAxis, dict[str, PublicTaxonomyTermOut]] = {
        axis: {} for axis in TaxonomyAxis
    }
    for term in taxonomy.terms:
        output[term.axis][term.stable_id] = term
    return output


class CompassService:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session
        self._taxonomy = TaxonomyService(session)

    async def _published_system_terms(
        self,
        organization_id: UUID,
        locale: str,
        axis: TaxonomyAxis,
    ) -> dict[UUID, TaxonomyTerm]:
        """Return system terms with an effective published locale revision.

        Tenant label overlays take precedence when published, otherwise the
        immutable platform revision remains effective, matching the existing
        public taxonomy projection semantics.
        """

        rows = (
            await self._session.execute(
                select(TaxonomyTerm, TaxonomyTermRevision)
                .join(TaxonomyTermRevision, TaxonomyTermRevision.term_id == TaxonomyTerm.id)
                .where(
                    TaxonomyTerm.system_defined.is_(True),
                    TaxonomyTerm.organization_id.is_(None),
                    TaxonomyTerm.axis == axis,
                    TaxonomyTermRevision.locale == locale,
                    TaxonomyTermRevision.status == RevisionStatus.PUBLISHED,
                    or_(
                        TaxonomyTermRevision.organization_id == organization_id,
                        TaxonomyTermRevision.organization_id.is_(None),
                    ),
                )
            )
        ).all()
        effective: dict[UUID, tuple[int, TaxonomyTerm]] = {}
        for term, revision in rows:
            priority = int(revision.organization_id == organization_id)
            current = effective.get(term.id)
            if current is None or priority > current[0]:
                effective[term.id] = (priority, term)
        return {term_id: item[1] for term_id, item in effective.items()}

    async def _eligible_candidates(
        self,
        organization_id: UUID,
        locale: str,
        taxonomy: PublicTaxonomyOut,
    ) -> tuple[_EligibleCandidate, ...]:
        public_access_terms = await self._published_system_terms(
            organization_id, locale, TaxonomyAxis.ACCESS_LEVEL
        )
        public_access_id = next(
            (
                term_id
                for term_id, term in public_access_terms.items()
                if term.stable_id == "public"
            ),
            None,
        )
        if public_access_id is None:
            return ()

        published_formats = await self._published_system_terms(
            organization_id, locale, TaxonomyAxis.CONTENT_FORMAT
        )
        formats_by_id: dict[UUID, ContentFormat] = {}
        for term_id, term in published_formats.items():
            try:
                formats_by_id[term_id] = ContentFormat(term.stable_id)
            except ValueError:
                # A future format is not eligible until this service has an
                # explicit renderer contract for it.
                continue
        if not formats_by_id:
            return ()

        rows = (
            await self._session.execute(
                select(ContentEntry, ContentRevision, ContentRevisionDiscovery)
                .join(ContentRevision, ContentRevision.entry_id == ContentEntry.id)
                .join(
                    ContentRevisionDiscovery,
                    ContentRevisionDiscovery.revision_id == ContentRevision.id,
                )
                .where(
                    ContentEntry.organization_id == organization_id,
                    ContentEntry.locale == locale,
                    ContentEntry.content_type != ContentType.THERAPIST,
                    ContentRevision.status == RevisionStatus.PUBLISHED,
                    ContentRevisionDiscovery.access_level_term_id == public_access_id,
                    ContentRevisionDiscovery.content_format_term_id.in_(formats_by_id),
                )
                .order_by(ContentEntry.content_type, ContentEntry.slug)
            )
        ).all()
        if not rows:
            return ()

        revision_ids = [revision.id for _, revision, _ in rows]
        references = (
            await self._session.scalars(
                select(ContentRevisionTaxonomyTerm).where(
                    ContentRevisionTaxonomyTerm.revision_id.in_(revision_ids)
                )
            )
        ).all()
        references_by_revision: dict[UUID, dict[ContentTaxonomyRole, list[UUID]]] = defaultdict(
            lambda: defaultdict(list)
        )
        for reference in references:
            references_by_revision[reference.revision_id][reference.role].append(reference.term_id)

        public_by_term_id = {term.term_id: term for term in taxonomy.terms}
        candidates: list[_EligibleCandidate] = []
        for entry, revision, discovery in rows:
            if not is_system_content_definition(
                entry.content_type, entry.slug, revision.template, entry.locale
            ):
                continue
            roles = references_by_revision.get(revision.id, {})
            group_ids = roles.get(ContentTaxonomyRole.TOPIC_GROUP, [])
            topic_ids = roles.get(ContentTaxonomyRole.TOPIC, [])
            audience_ids = roles.get(ContentTaxonomyRole.AUDIENCE, [])
            goal_ids = roles.get(ContentTaxonomyRole.CONTENT_GOAL, [])
            if (
                len(group_ids) != 1
                or not topic_ids
                or not audience_ids
                or not goal_ids
                or discovery.journey_intent_term_id is None
                or discovery.content_format_term_id is None
            ):
                continue

            group = public_by_term_id.get(group_ids[0])
            topics = [public_by_term_id.get(term_id) for term_id in topic_ids]
            audiences = [public_by_term_id.get(term_id) for term_id in audience_ids]
            goals = [public_by_term_id.get(term_id) for term_id in goal_ids]
            journey = public_by_term_id.get(discovery.journey_intent_term_id)
            if (
                group is None
                or group.axis is not TaxonomyAxis.TOPIC_GROUP
                or journey is None
                or journey.axis is not TaxonomyAxis.JOURNEY_INTENT
                or any(item is None or item.axis is not TaxonomyAxis.TOPIC for item in topics)
                or any(item is None or item.axis is not TaxonomyAxis.AUDIENCE for item in audiences)
                or any(item is None or item.axis is not TaxonomyAxis.CONTENT_GOAL for item in goals)
            ):
                continue
            complete_topics = [item for item in topics if item is not None]
            complete_audiences = [item for item in audiences if item is not None]
            complete_goals = [item for item in goals if item is not None]
            if any(item.parent_stable_id != group.stable_id for item in complete_topics):
                continue

            content_format = formats_by_id.get(discovery.content_format_term_id)
            if content_format is None:
                continue
            stable_key = f"{entry.content_type.value}:{entry.slug}"
            candidates.append(
                _EligibleCandidate(
                    entry_id=entry.id,
                    card=CompassContentCardOut(
                        item_key=stable_key,
                        content_type=entry.content_type,
                        slug=entry.slug,
                        locale=entry.locale,
                        template=revision.template,
                        seo=SeoFields.model_validate(revision.seo),
                        content_format=content_format,
                        access_level="public",
                        published_at=revision.published_at or revision.updated_at,
                    ),
                    signals=CandidateSignals(
                        stable_key=stable_key,
                        topic_group_id=group.stable_id,
                        topic_ids=frozenset(item.stable_id for item in complete_topics),
                        journey_intent=journey.stable_id,
                        goal_ids=frozenset(item.stable_id for item in complete_goals),
                        audience_ids=frozenset(item.stable_id for item in complete_audiences),
                    ),
                )
            )
        return tuple(candidates)

    async def taxonomy_page(
        self,
        organization_id: UUID,
        route_kind: TaxonomyRouteKind,
        slug: str,
        locale: str = "sr-Latn",
    ) -> tuple[CompassTaxonomyPageOut, bool]:
        term, is_alias = await self._taxonomy.resolve_public_route(
            organization_id, route_kind, slug, locale
        )
        taxonomy = await self._taxonomy.list_public(organization_id, locale)
        by_axis = _terms_by_axis(taxonomy)
        parent = (
            by_axis[TaxonomyAxis.TOPIC_GROUP].get(term.parent_stable_id)
            if term.parent_stable_id is not None
            else None
        )
        children = (
            sorted(
                (
                    item
                    for item in taxonomy.terms
                    if item.axis is TaxonomyAxis.TOPIC and item.parent_stable_id == term.stable_id
                ),
                key=lambda item: (item.sort_order, item.public_label, item.stable_id),
            )
            if route_kind is TaxonomyRouteKind.AREA
            else []
        )
        related_terms = sorted(
            (
                by_axis[TaxonomyAxis.TOPIC][stable_id]
                for stable_id in term.related_stable_ids
                if stable_id in by_axis[TaxonomyAxis.TOPIC]
            ),
            key=lambda item: (item.sort_order, item.public_label, item.stable_id),
        )
        candidates = await self._eligible_candidates(organization_id, locale, taxonomy)
        if route_kind is TaxonomyRouteKind.AREA:
            child_ids = frozenset(item.stable_id for item in children)
            selected = [
                item
                for item in candidates
                if item.signals.topic_group_id == term.stable_id
                or bool(item.signals.topic_ids & child_ids)
            ]
        else:
            selected = [item for item in candidates if term.stable_id in item.signals.topic_ids]
        return (
            CompassTaxonomyPageOut(
                taxonomy_version=TAXONOMY_VERSION,
                locale=locale,
                term=term,
                parent=parent,
                children=children,
                related_terms=related_terms,
                content_cards=[item.card for item in selected],
            ),
            is_alias,
        )

    @staticmethod
    def _adjustment(
        code: str,
        field_path: str,
        message: str,
        removed_values: list[str] | None = None,
    ) -> CompassSelectionAdjustmentOut:
        return CompassSelectionAdjustmentOut(
            code=code,
            field_path=field_path,
            message=message,
            removed_values=removed_values or [],
        )

    def _normalize_selection(
        self,
        request: CompassRecommendationRequest,
        taxonomy: PublicTaxonomyOut,
    ) -> tuple[CompassNormalizedSelectionOut, list[CompassSelectionAdjustmentOut]]:
        by_axis = _terms_by_axis(taxonomy)
        adjustments: list[CompassSelectionAdjustmentOut] = []

        group = request.topic_group_id
        if group is not None and group not in by_axis[TaxonomyAxis.TOPIC_GROUP]:
            adjustments.append(
                self._adjustment(
                    "COMPASS-SELECTION-REMOVED",
                    "topicGroupId",
                    "Izabrana oblast više nije dostupna i uklonjena je iz izbora.",
                    [group],
                )
            )
            group = None

        topics: list[str] = []
        removed_topics: list[str] = []
        for topic_id in request.topic_ids:
            if topic_id in by_axis[TaxonomyAxis.TOPIC]:
                topics.append(topic_id)
            else:
                removed_topics.append(topic_id)
        if removed_topics:
            adjustments.append(
                self._adjustment(
                    "COMPASS-SELECTION-REMOVED",
                    "topicIds",
                    "Neke izabrane teme više nisu dostupne i uklonjene su iz izbora.",
                    removed_topics,
                )
            )

        if group is not None and topics:
            mismatched = [
                topic_id
                for topic_id in topics
                if by_axis[TaxonomyAxis.TOPIC][topic_id].parent_stable_id != group
            ]
            if mismatched:
                topics = [topic_id for topic_id in topics if topic_id not in mismatched]
                adjustments.append(
                    self._adjustment(
                        "COMPASS-TOPIC-OUTSIDE-AREA",
                        "topicIds",
                        "Tema koja ne pripada izabranoj oblasti uklonjena je iz izbora.",
                        mismatched,
                    )
                )
        elif group is None and topics:
            parent_ids = {
                by_axis[TaxonomyAxis.TOPIC][topic_id].parent_stable_id for topic_id in topics
            }
            parent_ids.discard(None)
            if len(parent_ids) == 1:
                group = next(iter(parent_ids))
                adjustments.append(
                    self._adjustment(
                        "COMPASS-AREA-DERIVED",
                        "topicGroupId",
                        "Oblast je izvedena iz izabrane teme.",
                    )
                )

        audience = request.audience_id
        if audience is not None and audience not in by_axis[TaxonomyAxis.AUDIENCE]:
            adjustments.append(
                self._adjustment(
                    "COMPASS-SELECTION-REMOVED",
                    "audienceId",
                    "Izabrana publika više nije dostupna i uklonjena je iz izbora.",
                    [audience],
                )
            )
            audience = None

        goals: list[str] = []
        removed_goals: list[str] = []
        for goal_id in request.goal_ids:
            if goal_id in by_axis[TaxonomyAxis.CONTENT_GOAL]:
                goals.append(goal_id)
            else:
                removed_goals.append(goal_id)
        if removed_goals:
            adjustments.append(
                self._adjustment(
                    "COMPASS-SELECTION-REMOVED",
                    "goalIds",
                    "Neki izabrani ciljevi više nisu dostupni i uklonjeni su iz izbora.",
                    removed_goals,
                )
            )

        journey = request.journey_intent
        if journey is not None and journey.value not in by_axis[TaxonomyAxis.JOURNEY_INTENT]:
            adjustments.append(
                self._adjustment(
                    "COMPASS-SELECTION-REMOVED",
                    "journeyIntent",
                    "Izabrani put više nije dostupan i uklonjen je iz izbora.",
                    [journey.value],
                )
            )
            journey = None

        return (
            CompassNormalizedSelectionOut(
                topic_group_id=group,
                topic_ids=topics,
                audience_id=audience,
                goal_ids=goals,
                journey_intent=journey,
            ),
            adjustments,
        )

    @staticmethod
    def _reason(
        signal: ReasonSignal,
        terms_by_axis: dict[TaxonomyAxis, dict[str, PublicTaxonomyTermOut]],
    ) -> CompassReasonOut:
        label = terms_by_axis[_REASON_AXIS[signal.kind]].get(signal.stable_id)
        public_label = label.public_label if label is not None else signal.stable_id
        messages = {
            "topic": f"Povezano je sa temom „{public_label}”.",
            "area": f"Pripada oblasti „{public_label}”.",
            "journey": f"Odgovara putu „{public_label}”.",
            "goal": f"Podržava cilj „{public_label}”.",
            "audience": f"Namenjeno je publici „{public_label}”.",
            "related-topic": f"Povezano je sa srodnom temom „{public_label}”.",
        }
        return CompassReasonOut(code=signal.code, text=messages[signal.kind])

    async def recommendations(
        self,
        organization_id: UUID,
        request: CompassRecommendationRequest,
    ) -> CompassRecommendationOut:
        if request.taxonomy_version != TAXONOMY_VERSION:
            raise CompassVersionError(
                "COMPASS-VERSION-TAXONOMY",
                "Verzija Kompas registra nije podržana. Osvežite izbor i pokušajte ponovo.",
                "taxonomyVersion",
            )
        if request.rule_version != COMPASS_RULE_VERSION:
            raise CompassVersionError(
                "COMPASS-VERSION-RULES",
                "Verzija pravila preporuke nije podržana. Osvežite stranicu.",
                "ruleVersion",
            )

        taxonomy = await self._taxonomy.list_public(organization_id, request.locale)
        normalized, adjustments = self._normalize_selection(request, taxonomy)
        candidates = await self._eligible_candidates(organization_id, request.locale, taxonomy)
        terms_by_axis = _terms_by_axis(taxonomy)
        topics_by_stable_id = terms_by_axis[TaxonomyAxis.TOPIC]
        related_ids: set[str] = set()
        for topic_id in normalized.topic_ids:
            topic = topics_by_stable_id.get(topic_id)
            if topic is not None:
                related_ids.update(topic.related_stable_ids)
        related_ids.difference_update(normalized.topic_ids)

        selection = SelectionSignals(
            topic_group_id=normalized.topic_group_id,
            topic_ids=tuple(normalized.topic_ids),
            journey_intent=(
                normalized.journey_intent.value if normalized.journey_intent is not None else None
            ),
            goal_ids=tuple(normalized.goal_ids),
            audience_id=normalized.audience_id,
        )
        request_had_selection = bool(
            request.topic_group_id
            or request.topic_ids
            or request.audience_id
            or request.goal_ids
            or request.journey_intent
        )
        normalized_has_selection = bool(
            normalized.topic_group_id
            or normalized.topic_ids
            or normalized.audience_id
            or normalized.goal_ids
            or normalized.journey_intent
        )
        if request_had_selection and not normalized_has_selection:
            # A stale selection must not silently become the unfiltered
            # catalogue. That would turn controlled adaptation into unrelated
            # recommendations precisely when every user signal disappeared.
            outcome = RankingOutcome(candidates=(), expansion="none")
            adjustments.append(
                self._adjustment(
                    "COMPASS-SELECTION-EMPTY",
                    "selection",
                    "Izabrane vrednosti više nisu dostupne; preporuke nisu "
                    "proširene na nepovezan sadržaj.",
                )
            )
        else:
            outcome = rank_candidates(
                tuple(item.signals for item in candidates),
                selection,
                related_topic_ids=frozenset(related_ids),
            )
        if outcome.expansion == "area" and normalized.topic_ids:
            adjustments.append(
                self._adjustment(
                    "COMPASS-EXPANDED-TO-AREA",
                    "topicIds",
                    "Nema tačnog rezultata za temu; prikazan je sadržaj iste oblasti.",
                )
            )
        elif outcome.expansion == "related":
            adjustments.append(
                self._adjustment(
                    "COMPASS-EXPANDED-TO-RELATED",
                    "topicIds",
                    "Nema rezultata za temu; prikazan je sadržaj potvrđene srodne teme.",
                )
            )

        candidate_by_key = {item.card.item_key: item for item in candidates}
        page = outcome.candidates[request.offset : request.offset + request.limit]
        recommendations: list[CompassRecommendationItemOut] = []
        for ranked in page:
            candidate = candidate_by_key[ranked.stable_key]
            reasons = [self._reason(signal, terms_by_axis) for signal in ranked.reasons]
            if not reasons:
                reasons = [
                    CompassReasonOut(
                        code="catalog:public",
                        text="Objavljen sadržaj dostupan u Kompasu.",
                    )
                ]
            recommendations.append(
                CompassRecommendationItemOut(
                    card=candidate.card,
                    reasons=reasons,
                    goal_ids=sorted(candidate.signals.goal_ids),
                )
            )

        related_topics = sorted(
            (
                topics_by_stable_id[stable_id]
                for stable_id in related_ids
                if stable_id in topics_by_stable_id
            ),
            key=lambda item: (item.sort_order, item.public_label, item.stable_id),
        )
        total = len(outcome.candidates)
        return CompassRecommendationOut(
            taxonomy_version=TAXONOMY_VERSION,
            rule_version=COMPASS_RULE_VERSION,
            locale=request.locale,
            normalized_selection=normalized,
            selection_adjustments=adjustments,
            recommendations=recommendations,
            related_topics=related_topics,
            handoff_candidate=CompassHandoffCandidateOut(
                taxonomy_version=TAXONOMY_VERSION,
                topic_group_id=normalized.topic_group_id,
                topic_ids=normalized.topic_ids,
                audience_ids=(
                    [normalized.audience_id] if normalized.audience_id is not None else []
                ),
                journey_intent=normalized.journey_intent,
            ),
            pagination=CompassPaginationOut(
                offset=request.offset,
                limit=request.limit,
                total=total,
                has_more=request.offset + request.limit < total,
            ),
        )
