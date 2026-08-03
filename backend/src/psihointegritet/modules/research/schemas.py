"""Boundary DTOs for the Research module.

The question schema is stored as JSON on the survey row, so it is validated
here rather than by the database. Every question and option carries a stable
id: submissions reference those ids, never the rendered Serbian text.
"""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, model_validator
from pydantic.alias_generators import to_camel

from .models import (
    ResearchSubmissionSurface,
    ResearchSubmissionTrigger,
    ResearchSurveyStatus,
)


class ResearchApiSchema(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
        extra="forbid",
        from_attributes=True,
    )


class SurveyOption(ResearchApiSchema):
    option_id: str = Field(min_length=1, max_length=80)
    label: str = Field(min_length=1, max_length=200)


class SurveyQuestion(ResearchApiSchema):
    question_id: str = Field(min_length=1, max_length=80)
    prompt: str = Field(min_length=1, max_length=300)
    options: list[SurveyOption] = Field(min_length=2, max_length=12)
    """`multi` allows more than one option; `optional` allows a skip."""

    multi: bool = False
    optional: bool = False

    @model_validator(mode="after")
    def option_ids_are_unique(self) -> SurveyQuestion:
        option_ids = [option.option_id for option in self.options]
        if len(option_ids) != len(set(option_ids)):
            raise ValueError("optionId mora biti jedinstven unutar pitanja")
        return self


class SurveyQuestionSchema(ResearchApiSchema):
    """The `question_schema` JSON payload of one survey version."""

    schema_version: int = 1
    intro_title: str = Field(min_length=1, max_length=200)
    intro_description: str = Field(min_length=1, max_length=600)
    questions: list[SurveyQuestion] = Field(min_length=1, max_length=20)
    """Free text is opt-in per survey and stays off for `compass-experience`
    in v1, so a user cannot accidentally leave health or personal data."""

    allows_free_text: bool = False

    @model_validator(mode="after")
    def question_ids_are_unique(self) -> SurveyQuestionSchema:
        question_ids = [question.question_id for question in self.questions]
        if len(question_ids) != len(set(question_ids)):
            raise ValueError("questionId mora biti jedinstven u verziji ankete")
        return self


class SurveyAnswer(ResearchApiSchema):
    question_id: str = Field(min_length=1, max_length=80)
    option_ids: list[str] = Field(min_length=1, max_length=12)

    @model_validator(mode="after")
    def option_ids_are_unique(self) -> SurveyAnswer:
        if len(self.option_ids) != len(set(self.option_ids)):
            raise ValueError("Odgovor ne sme sadržati duplirane optionIds")
        return self


class SubmitResearchRequest(ResearchApiSchema):
    survey_stable_id: str = Field(min_length=1, max_length=80)
    answers: list[SurveyAnswer] = Field(min_length=1, max_length=20)
    surface: ResearchSubmissionSurface
    trigger: ResearchSubmissionTrigger
    locale: str = Field(default="sr-Latn", max_length=16)

    @model_validator(mode="after")
    def surface_and_trigger_match_survey(self) -> SubmitResearchRequest:
        allowed = {
            "online-experience": {("research-drawer", "manual")},
            "compass-experience": {
                ("compass-feedback", "after-results"),
                ("compass-feedback", "finish"),
            },
        }
        combinations = allowed.get(self.survey_stable_id)
        current = (self.surface.value, self.trigger.value)
        if combinations is not None and current not in combinations:
            raise ValueError("surface i trigger nisu dozvoljeni za ovu anketu")
        return self


class SubmitResearchResponse(ResearchApiSchema):
    submission_id: UUID
    survey_stable_id: str
    survey_version: int


class PublicSurveyOut(ResearchApiSchema):
    """Published question set for the drawer. Never exposes submissions."""

    stable_id: str
    version: int
    title: str
    schema_: SurveyQuestionSchema = Field(alias="schema")


class OptionTallyOut(ResearchApiSchema):
    option_id: str
    label: str
    count: int


class QuestionTallyOut(ResearchApiSchema):
    question_id: str
    prompt: str
    answered_count: int
    multi: bool
    options: list[OptionTallyOut]


class SurveyResultsOut(ResearchApiSchema):
    """Per-survey-version panel view. Versions are never merged into one
    percentage: a changed question set makes the older answers a different
    measurement."""

    stable_id: str
    version: int
    title: str
    status: ResearchSurveyStatus
    submission_count: int
    first_submission_at: datetime | None
    last_submission_at: datetime | None
    surfaces: dict[str, int]
    triggers: dict[str, int]
    questions: list[QuestionTallyOut]


class ResearchOverviewOut(ResearchApiSchema):
    surveys: list[SurveyResultsOut]
