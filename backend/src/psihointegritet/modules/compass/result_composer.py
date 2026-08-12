"""Backend-only grouping and deduplication of ranked Kompas recommendations."""

from psihointegritet.modules.compass.schemas import (
    CompassExperienceOut,
    CompassFlowVersionOut,
    ResultSectionOut,
    ResultSummaryOut,
)
from psihointegritet.modules.content.compass_schemas import CompassRecommendationOut
from psihointegritet.modules.content.taxonomy_models import TaxonomyAxis
from psihointegritet.modules.content.taxonomy_schemas import PublicTaxonomyOut


def compose_result(
    flow: CompassFlowVersionOut,
    ranked: CompassRecommendationOut,
    taxonomy: PublicTaxonomyOut,
) -> CompassExperienceOut:
    """Apply configured section priority once; the browser never re-groups.

    Ranking, eligibility, reasons and initial ordering already came from the
    Content engine. This function only assigns each item to its first matching
    configured section and builds reviewed/derived taxonomy sections.
    """
    terms_by_axis = {
        axis: {term.stable_id: term for term in taxonomy.terms if term.axis is axis}
        for axis in TaxonomyAxis
    }
    selected = ranked.normalized_selection
    has_selection = bool(
        selected.topic_group_id
        or selected.topic_ids
        or selected.audience_id
        or selected.goal_ids
        or selected.journey_intent
    )
    remaining = list(ranked.recommendations)
    sections: list[ResultSectionOut] = []

    related_topics = ranked.related_topics
    related_area_ids = {
        topic.parent_stable_id for topic in related_topics if topic.parent_stable_id is not None
    }
    related_areas = sorted(
        (
            terms_by_axis[TaxonomyAxis.TOPIC_GROUP][stable_id]
            for stable_id in related_area_ids
            if stable_id in terms_by_axis[TaxonomyAxis.TOPIC_GROUP]
            and stable_id != selected.topic_group_id
        ),
        key=lambda term: (term.sort_order, term.public_label, term.stable_id),
    )
    other_topics = sorted(
        (
            term
            for term in terms_by_axis[TaxonomyAxis.TOPIC].values()
            if selected.topic_group_id is not None
            and term.parent_stable_id == selected.topic_group_id
            and term.stable_id not in selected.topic_ids
        ),
        key=lambda term: (term.sort_order, term.public_label, term.stable_id),
    )

    for configured in flow.definition.result_sections:
        content_items = []
        taxonomy_items = []
        if configured.section_id in {"understanding", "practical-tools"}:
            goal_ids = set(configured.goal_ids)
            matches = [item for item in remaining if goal_ids.intersection(item.goal_ids)]
            content_items = matches[: configured.max_items]
            used = {item.card.item_key for item in content_items}
            remaining = [item for item in remaining if item.card.item_key not in used]
        elif configured.section_id == "related-areas":
            taxonomy_items = related_areas[: configured.max_items]
        elif configured.section_id == "related-topics":
            taxonomy_items = related_topics[: configured.max_items]
        elif configured.section_id == "other-topics-in-area":
            taxonomy_items = other_topics[: configured.max_items]

        if content_items or taxonomy_items or configured.empty_behavior.value == "show":
            sections.append(
                ResultSectionOut(
                    section_id=configured.section_id,
                    title=configured.title,
                    content_items=content_items,
                    taxonomy_items=taxonomy_items,
                    empty_behavior=configured.empty_behavior,
                    locked=configured.locked,
                )
            )

    return CompassExperienceOut(
        flow_version=flow.version,
        normalized_selection=selected,
        selection_adjustments=ranked.selection_adjustments,
        summary=ResultSummaryOut(
            title="Vaš prilagođeni prikaz" if has_selection else "Polazni prikaz",
            has_selection=has_selection,
        ),
        sections=sections,
        handoff_candidate=ranked.handoff_candidate,
    )
