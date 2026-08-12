from datetime import UTC, datetime
from uuid import uuid4

from psihointegritet.modules.compass.result_composer import compose_result
from psihointegritet.modules.compass.schemas import CompassFlowVersionOut
from psihointegritet.modules.content.compass_schemas import CompassRecommendationOut
from psihointegritet.modules.content.taxonomy_schemas import PublicTaxonomyOut


def term(axis: str, stable_id: str, label: str, **extra: object) -> dict[str, object]:
    return {
        "termId": str(uuid4()),
        "axis": axis,
        "stableId": stable_id,
        "canonicalPath": f"/kompas/{stable_id}",
        "publicLabel": label,
        "shortDescription": "",
        "sortOrder": 1,
        "searchTerms": [],
        "relatedStableIds": [],
        **extra,
    }


def item(key: str, goal_ids: list[str]) -> dict[str, object]:
    return {
        "card": {
            "itemKey": key,
            "contentType": "program",
            "slug": key,
            "locale": "sr-Latn",
            "template": "program_detail",
            "seo": {"title": key, "description": "Opis"},
            "contentFormat": "program",
            "accessLevel": "public",
            "publishedAt": datetime.now(UTC).isoformat(),
        },
        "reasons": [{"code": "goal", "text": "Razlog"}],
        "goalIds": goal_ids,
    }


def test_composer_groups_deduplicates_and_separates_related_axes() -> None:
    flow = CompassFlowVersionOut.model_validate(
        {
            "flowId": str(uuid4()),
            "versionId": str(uuid4()),
            "stableId": "main-kompas",
            "version": 1,
            "locale": "sr-Latn",
            "status": "published",
            "lockVersion": 1,
            "definition": {
                "schemaVersion": 1,
                "entryQuestionId": "start",
                "questions": [
                    {
                        "questionId": "start",
                        "prompt": "Početak",
                        "selectionTarget": "none",
                        "inputMode": "single_select",
                        "optionSource": "static",
                        "staticOptions": [
                            {"optionId": "done", "label": "Kraj", "terminal": "results"}
                        ],
                        "terminal": "results",
                    }
                ],
                "resultSections": [
                    {
                        "sectionId": "understanding",
                        "title": "Za bolje razumevanje",
                        "goalIds": ["understand"],
                    },
                    {
                        "sectionId": "practical-tools",
                        "title": "Praktični alati",
                        "goalIds": ["practical-step"],
                    },
                    {"sectionId": "related-areas", "title": "Srodne oblasti"},
                    {"sectionId": "related-topics", "title": "Srodne teme"},
                    {
                        "sectionId": "other-topics-in-area",
                        "title": "Druge teme u oblasti",
                    },
                    {
                        "sectionId": "professional-support",
                        "title": "Stručna podrška",
                        "locked": True,
                        "emptyBehavior": "show",
                    },
                ],
            },
        }
    )
    related_topic = term("topic", "relationships", "Odnosi", parentStableId="relationships-area")
    taxonomy = PublicTaxonomyOut.model_validate(
        {
            "locale": "sr-Latn",
            "terms": [
                term("topic_group", "stress", "Stres"),
                term("topic_group", "relationships-area", "Odnosi i bliskost"),
                term("topic", "burnout", "Sagorevanje", parentStableId="stress"),
                term("topic", "sleep", "San", parentStableId="stress"),
                related_topic,
            ],
        }
    )
    ranked = CompassRecommendationOut.model_validate(
        {
            "taxonomyVersion": "kompas-taxonomy-v1",
            "ruleVersion": "compass-rules-v1",
            "locale": "sr-Latn",
            "normalizedSelection": {
                "topicGroupId": "stress",
                "topicIds": ["burnout"],
                "goalIds": [],
            },
            "selectionAdjustments": [],
            "recommendations": [
                item("both", ["understand", "practical-step"]),
                item("tool", ["practical-step"]),
            ],
            "relatedTopics": [related_topic],
            "handoffCandidate": {
                "taxonomyVersion": "kompas-taxonomy-v1",
                "topicIds": ["burnout"],
                "audienceIds": [],
            },
            "pagination": {"offset": 0, "limit": 12, "total": 2, "hasMore": False},
        }
    )

    output = compose_result(flow, ranked, taxonomy)
    by_id = {section.section_id: section for section in output.sections}
    assert [item.card.item_key for item in by_id["understanding"].content_items] == ["both"]
    assert [item.card.item_key for item in by_id["practical-tools"].content_items] == ["tool"]
    assert [item.stable_id for item in by_id["related-areas"].taxonomy_items] == [
        "relationships-area"
    ]
    assert [item.stable_id for item in by_id["related-topics"].taxonomy_items] == ["relationships"]
    assert [item.stable_id for item in by_id["other-topics-in-area"].taxonomy_items] == ["sleep"]
    assert by_id["professional-support"].locked is True
