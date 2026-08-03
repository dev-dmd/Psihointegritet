from typing import cast

import pytest
from pydantic import ValidationError

from psihointegritet.modules.compass.schemas import (
    CompassFlowDefinition,
    FlowEvaluationRequest,
)
from psihointegritet.modules.compass.service import evaluate_flow


def definition(**updates: object) -> dict[str, object]:
    value: dict[str, object] = {
        "schemaVersion": 1,
        "entryQuestionId": "area",
        "questions": [
            {
                "questionId": "area",
                "prompt": "Koja oblast vam je najbliža?",
                "selectionTarget": "topic_group",
                "inputMode": "single_select",
                "optionSource": "taxonomy_axis",
                "taxonomyAxis": "topic_group",
                "allowedTermIds": ["stress"],
                "defaultNextQuestionId": "topics",
                "skipNextQuestionId": "topics",
            },
            {
                "questionId": "topics",
                "prompt": "Izaberite do dve teme.",
                "selectionTarget": "topics",
                "inputMode": "multi_select",
                "optionSource": "taxonomy_axis",
                "taxonomyAxis": "topic",
                "allowedTermIds": ["burnout", "sleep"],
                "filterTopicsBySelectedArea": True,
                "maxSelections": 2,
                "defaultNextQuestionId": "certainty",
                "skipNextQuestionId": "certainty",
            },
            {
                "questionId": "certainty",
                "prompt": "Da li želite preporuke?",
                "selectionTarget": "none",
                "inputMode": "single_select",
                "optionSource": "static",
                "staticOptions": [
                    {"optionId": "show", "label": "Da", "terminal": "results"},
                    {
                        "optionId": "unsure",
                        "label": "Nisam siguran/na šta mi se događa",
                        "terminal": "starting_package",
                    },
                ],
                "terminal": "results",
            },
        ],
        "resultSections": [
            {
                "sectionId": "understanding",
                "title": "Za bolje razumevanje",
                "goalIds": ["understand"],
            },
            {
                "sectionId": "professional-support",
                "title": "Stručna podrška",
                "locked": True,
                "emptyBehavior": "show",
            },
        ],
    }
    value.update(updates)
    return value


def test_flow_rejects_cycle() -> None:
    raw = definition()
    questions = cast(list[dict[str, object]], raw["questions"])
    last = questions[-1]
    last.pop("terminal")
    last["defaultNextQuestionId"] = "area"
    with pytest.raises(ValidationError, match="ciklus"):
        CompassFlowDefinition.model_validate(raw)


def test_flow_rejects_unreachable_question() -> None:
    raw = definition()
    questions = cast(list[dict[str, object]], raw["questions"])
    questions.append(
        {
            "questionId": "orphan",
            "prompt": "Nedostižno",
            "selectionTarget": "none",
            "inputMode": "single_select",
            "optionSource": "static",
            "staticOptions": [{"optionId": "done", "label": "Kraj", "terminal": "results"}],
            "terminal": "results",
        }
    )
    with pytest.raises(ValidationError, match="dostižna"):
        CompassFlowDefinition.model_validate(raw)


def test_answers_map_deterministically_to_selection() -> None:
    flow = CompassFlowDefinition.model_validate(definition())
    output = evaluate_flow(
        flow,
        FlowEvaluationRequest.model_validate(
            {
                "answers": [
                    {"questionId": "area", "optionIds": ["stress"]},
                    {"questionId": "topics", "optionIds": ["sleep", "burnout"]},
                    {"questionId": "certainty", "optionIds": ["show"]},
                ]
            }
        ),
    )
    assert output.topic_group_id == "stress"
    assert output.topic_ids == ["sleep", "burnout"]
    assert output.starting_package is False


def test_sentinel_returns_starting_package() -> None:
    flow = CompassFlowDefinition.model_validate(definition())
    output = evaluate_flow(
        flow,
        FlowEvaluationRequest.model_validate(
            {"answers": [{"questionId": "certainty", "optionIds": ["unsure"]}]}
        ),
    )
    assert output.starting_package is True
    assert output.topic_ids == []


def test_more_than_two_topics_is_rejected() -> None:
    with pytest.raises(ValidationError):
        FlowEvaluationRequest.model_validate(
            {
                "answers": [
                    {"questionId": "topics", "optionIds": ["a", "b", "c"]},
                ]
            }
        )
