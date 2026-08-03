import pytest
from pydantic import ValidationError

from psihointegritet.modules.research.models import (
    ResearchSubmissionSurface,
    ResearchSubmissionTrigger,
)
from psihointegritet.modules.research.schemas import (
    SubmitResearchRequest,
    SurveyQuestionSchema,
)


def schema(**updates: object) -> dict[str, object]:
    value: dict[str, object] = {
        "schemaVersion": 1,
        "introTitle": "Kratka anketa",
        "introDescription": "Kontrolisana pitanja bez slobodnog teksta.",
        "allowsFreeText": False,
        "questions": [
            {
                "questionId": "useful",
                "prompt": "Da li je bilo korisno?",
                "options": [
                    {"optionId": "yes", "label": "Da"},
                    {"optionId": "no", "label": "Ne"},
                ],
            }
        ],
    }
    value.update(updates)
    return value


def submission(**updates: object) -> dict[str, object]:
    value: dict[str, object] = {
        "surveyStableId": "online-experience",
        "answers": [{"questionId": "useful", "optionIds": ["yes"]}],
        "surface": ResearchSubmissionSurface.RESEARCH_DRAWER,
        "trigger": ResearchSubmissionTrigger.MANUAL,
        "locale": "sr-Latn",
    }
    value.update(updates)
    return value


def test_schema_rejects_duplicate_question_ids() -> None:
    question = {
        "questionId": "useful",
        "prompt": "Da li je bilo korisno?",
        "options": [
            {"optionId": "yes", "label": "Da"},
            {"optionId": "no", "label": "Ne"},
        ],
    }
    with pytest.raises(ValidationError, match="questionId mora biti jedinstven"):
        SurveyQuestionSchema.model_validate(schema(questions=[question, question]))


def test_schema_rejects_duplicate_option_ids() -> None:
    with pytest.raises(ValidationError, match="optionId mora biti jedinstven"):
        SurveyQuestionSchema.model_validate(
            schema(
                questions=[
                    {
                        "questionId": "useful",
                        "prompt": "Da li je bilo korisno?",
                        "options": [
                            {"optionId": "yes", "label": "Da"},
                            {"optionId": "yes", "label": "Isto"},
                        ],
                    }
                ]
            )
        )


def test_submission_rejects_duplicate_option_ids() -> None:
    with pytest.raises(ValidationError, match="duplirane optionIds"):
        SubmitResearchRequest.model_validate(
            submission(answers=[{"questionId": "useful", "optionIds": ["yes", "yes"]}])
        )


@pytest.mark.parametrize(
    ("stable_id", "surface", "trigger"),
    [
        ("online-experience", "compass-feedback", "finish"),
        ("compass-experience", "research-drawer", "manual"),
    ],
)
def test_submission_rejects_wrong_surface_trigger_combination(
    stable_id: str, surface: str, trigger: str
) -> None:
    with pytest.raises(ValidationError, match="nisu dozvoljeni"):
        SubmitResearchRequest.model_validate(
            submission(surveyStableId=stable_id, surface=surface, trigger=trigger)
        )


def test_submission_accepts_both_compass_feedback_triggers() -> None:
    for trigger in ("after-results", "finish"):
        request = SubmitResearchRequest.model_validate(
            submission(
                surveyStableId="compass-experience",
                surface="compass-feedback",
                trigger=trigger,
            )
        )
        assert request.survey_stable_id == "compass-experience"
        assert request.trigger.value == trigger
