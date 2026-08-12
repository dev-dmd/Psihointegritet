from collections.abc import Mapping
from typing import cast

from psihointegritet.main import create_app
from psihointegritet.modules.content.compass_schemas import (
    CompassRecommendationOut,
    CompassTaxonomyPageOut,
)


def _operation(path: str, method: str) -> dict[str, object]:
    schema = create_app().openapi()
    paths = cast(dict[str, dict[str, dict[str, object]]], schema["paths"])
    return paths[path][method]


def test_public_compass_routes_are_registered_with_stable_operation_ids() -> None:
    aggregate = _operation("/api/v1/public/compass/taxonomy/pages/{route_kind}/{slug}", "get")
    recommendations = _operation("/api/v1/public/compass/recommendations", "post")

    assert aggregate["operationId"] == "get_public_compass_taxonomy_page"
    assert recommendations["operationId"] == "get_public_compass_recommendations"
    assert "308" in cast(dict[str, object], aggregate["responses"])


def _property_names(value: object) -> set[str]:
    if isinstance(value, Mapping):
        mapping = cast(Mapping[str, object], value)
        result: set[str] = set()
        properties = mapping.get("properties")
        if isinstance(properties, Mapping):
            property_mapping = cast(Mapping[object, object], properties)
            result.update(str(key) for key in property_mapping)
        for nested in mapping.values():
            result.update(_property_names(nested))
        return result
    if isinstance(value, list):
        result: set[str] = set()
        for nested in cast(list[object], value):
            result.update(_property_names(nested))
        return result
    return set()


def test_public_output_models_have_no_score_therapist_raw_slots_or_free_url_field() -> None:
    recommendation_fields = _property_names(CompassRecommendationOut.model_json_schema())
    aggregate_fields = _property_names(CompassTaxonomyPageOut.model_json_schema())
    all_fields = recommendation_fields | aggregate_fields

    assert (
        not {
            "score",
            "therapistId",
            "therapistIds",
            "route",
            "url",
            "href",
            "slotData",
        }
        & all_fields
    )
    assert {
        "taxonomyVersion",
        "normalizedSelection",
        "recommendations",
        "handoffCandidate",
    } <= recommendation_fields
    assert {"term", "parent", "children", "relatedTerms", "contentCards"} <= aggregate_fields
