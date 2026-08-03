"""Strict flow definition and HTTP contracts for Kompas v1."""

from enum import StrEnum
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator
from pydantic.alias_generators import to_camel

from psihointegritet.modules.content.compass_schemas import (
    CompassHandoffCandidateOut,
    CompassNormalizedSelectionOut,
    CompassRecommendationItemOut,
    CompassSelectionAdjustmentOut,
)
from psihointegritet.modules.content.models import ReviewOutcome
from psihointegritet.modules.content.taxonomy_models import JourneyIntent, TaxonomyAxis
from psihointegritet.modules.content.taxonomy_schemas import PublicTaxonomyTermOut
from psihointegritet.shared.domain.publication import ApprovalCapability, RevisionStatus


class CompassFlowSchema(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True, extra="forbid")


class SelectionTarget(StrEnum):
    TOPIC_GROUP = "topic_group"
    TOPICS = "topics"
    AUDIENCE = "audience"
    CONTENT_GOALS = "content_goals"
    JOURNEY_INTENT = "journey_intent"
    NONE = "none"


class InputMode(StrEnum):
    SINGLE_SELECT = "single_select"
    MULTI_SELECT = "multi_select"


class OptionSource(StrEnum):
    TAXONOMY_AXIS = "taxonomy_axis"
    STATIC = "static"


class TerminalBehavior(StrEnum):
    RESULTS = "results"
    STARTING_PACKAGE = "starting_package"


class EmptyBehavior(StrEnum):
    HIDE = "hide"
    SHOW = "show"


class StaticFlowOption(CompassFlowSchema):
    option_id: str = Field(pattern=r"^[a-z0-9][a-z0-9_-]{0,79}$")
    label: str = Field(min_length=1, max_length=200)
    selection_value: str | None = Field(default=None, max_length=80)
    next_question_id: str | None = Field(default=None, max_length=80)
    terminal: TerminalBehavior | None = None

    @model_validator(mode="after")
    def has_one_transition(self) -> StaticFlowOption:
        if self.next_question_id is not None and self.terminal is not None:
            raise ValueError("Opcija ne može istovremeno imati nextQuestionId i terminal")
        return self


class FlowQuestion(CompassFlowSchema):
    question_id: str = Field(pattern=r"^[a-z0-9][a-z0-9_-]{0,79}$")
    prompt: str = Field(min_length=1, max_length=300)
    help_text: str = Field(default="", max_length=500)
    selection_target: SelectionTarget
    input_mode: InputMode
    option_source: OptionSource
    taxonomy_axis: TaxonomyAxis | None = None
    allowed_term_ids: list[str] = Field(default_factory=list, max_length=100)
    filter_topics_by_selected_area: bool = False
    max_selections: int = Field(default=1, ge=1, le=2)
    optional: Literal[True] = True
    default_next_question_id: str | None = Field(default=None, max_length=80)
    skip_next_question_id: str | None = Field(default=None, max_length=80)
    static_options: list[StaticFlowOption] = Field(  # pyright: ignore[reportUnknownVariableType]
        default_factory=list, max_length=20
    )
    terminal: TerminalBehavior | None = None

    @field_validator("allowed_term_ids")
    @classmethod
    def unique_allowed_terms(cls, values: list[str]) -> list[str]:
        if len(values) != len(set(values)):
            raise ValueError("allowedTermIds moraju biti jedinstveni")
        return values

    @model_validator(mode="after")
    def source_matches_options(self) -> FlowQuestion:
        if self.selection_target is SelectionTarget.TOPICS and self.max_selections > 2:
            raise ValueError("Kompas v1 dozvoljava najviše dve teme")
        if self.input_mode is InputMode.SINGLE_SELECT and self.max_selections != 1:
            raise ValueError("single_select mora imati maxSelections=1")
        if self.option_source is OptionSource.STATIC:
            if not self.static_options:
                raise ValueError("Statičko pitanje mora imati opcije")
            option_ids = [option.option_id for option in self.static_options]
            if len(option_ids) != len(set(option_ids)):
                raise ValueError("optionId mora biti jedinstven unutar pitanja")
        elif self.taxonomy_axis is None:
            raise ValueError("taxonomyAxis je obavezan za dinamičke opcije")
        return self


class ResultSectionDefinition(CompassFlowSchema):
    section_id: Literal[
        "understanding",
        "practical-tools",
        "professional-support",
        "related-areas",
        "related-topics",
        "other-topics-in-area",
    ]
    title: str = Field(min_length=1, max_length=120)
    goal_ids: list[str] = Field(default_factory=list, max_length=10)
    max_items: int = Field(default=4, ge=1, le=12)
    empty_behavior: EmptyBehavior = EmptyBehavior.HIDE
    locked: bool = False


class CompassFlowDefinition(CompassFlowSchema):
    schema_version: Literal[1] = 1
    entry_question_id: str = Field(min_length=1, max_length=80)
    questions: list[FlowQuestion] = Field(min_length=1, max_length=8)
    result_sections: list[ResultSectionDefinition] = Field(min_length=1, max_length=6)

    @model_validator(mode="after")
    def validate_graph(self) -> CompassFlowDefinition:
        ids = [question.question_id for question in self.questions]
        if len(ids) != len(set(ids)):
            raise ValueError("questionId mora biti jedinstven")
        known = set(ids)
        if self.entry_question_id not in known:
            raise ValueError("entryQuestionId ne postoji")
        edges: dict[str, set[str]] = {question_id: set() for question_id in ids}
        for question in self.questions:
            references = [question.default_next_question_id, question.skip_next_question_id]
            references.extend(option.next_question_id for option in question.static_options)
            for target in references:
                if target is None:
                    continue
                if target not in known:
                    raise ValueError(f"Nepoznato sledeće pitanje: {target}")
                edges[question.question_id].add(target)
            if (
                not edges[question.question_id]
                and question.terminal is None
                and not any(option.terminal is not None for option in question.static_options)
            ):
                raise ValueError(f"Pitanje {question.question_id} nema završetak")

        visiting: set[str] = set()
        reached: set[str] = set()

        def visit(question_id: str) -> None:
            if question_id in visiting:
                raise ValueError("Tok pitanja sadrži ciklus")
            if question_id in reached:
                return
            visiting.add(question_id)
            for target in edges[question_id]:
                visit(target)
            visiting.remove(question_id)
            reached.add(question_id)

        visit(self.entry_question_id)
        if reached != known:
            raise ValueError("Sva pitanja moraju biti dostižna")
        section_ids = [section.section_id for section in self.result_sections]
        if len(section_ids) != len(set(section_ids)):
            raise ValueError("sectionId mora biti jedinstven")
        support = next(
            (
                section
                for section in self.result_sections
                if section.section_id == "professional-support"
            ),
            None,
        )
        if support is None or not support.locked:
            raise ValueError("Stručna podrška je obavezna zaključana sistemska sekcija")
        return self


class FlowAnswer(CompassFlowSchema):
    question_id: str
    option_ids: list[str] = Field(max_length=2)

    @field_validator("option_ids")
    @classmethod
    def unique_options(cls, values: list[str]) -> list[str]:
        if len(values) != len(set(values)):
            raise ValueError("optionIds moraju biti jedinstveni")
        return values


class FlowEvaluationRequest(CompassFlowSchema):
    answers: list[FlowAnswer] = Field(  # pyright: ignore[reportUnknownVariableType]
        default_factory=list, max_length=8
    )


class FlowSelectionOut(CompassFlowSchema):
    topic_group_id: str | None = None
    topic_ids: list[str] = Field(default_factory=list)
    audience_id: str | None = None
    goal_ids: list[str] = Field(default_factory=list)
    journey_intent: JourneyIntent | None = None
    starting_package: bool = False


class CompassFlowVersionOut(CompassFlowSchema):
    flow_id: UUID
    version_id: UUID
    stable_id: str
    version: int
    locale: str
    status: RevisionStatus
    lock_version: int
    definition: CompassFlowDefinition


class CreateFlowRequest(CompassFlowSchema):
    stable_id: str = Field(pattern=r"^[a-z0-9][a-z0-9-]{1,79}$")
    locale: str = Field(default="sr-Latn", min_length=2, max_length=16)
    definition: CompassFlowDefinition


class UpdateFlowVersionRequest(CompassFlowSchema):
    lock_version: int = Field(ge=1)
    definition: CompassFlowDefinition


class TransitionFlowRequest(CompassFlowSchema):
    lock_version: int = Field(ge=1)
    target: RevisionStatus


class FlowReviewRequest(CompassFlowSchema):
    capability: ApprovalCapability
    outcome: ReviewOutcome
    note: str | None = Field(default=None, max_length=500)


class FlowPreviewOut(CompassFlowSchema):
    flow: CompassFlowVersionOut
    selection: FlowSelectionOut


class ResultSummaryOut(CompassFlowSchema):
    title: Literal["Vaš prilagođeni prikaz", "Polazni prikaz"]
    has_selection: bool


class ResultSectionOut(CompassFlowSchema):
    section_id: str
    title: str
    content_items: list[CompassRecommendationItemOut]
    taxonomy_items: list[PublicTaxonomyTermOut]
    empty_behavior: EmptyBehavior
    locked: bool = False


class CompassExperienceOut(CompassFlowSchema):
    flow_version: int
    normalized_selection: CompassNormalizedSelectionOut
    selection_adjustments: list[CompassSelectionAdjustmentOut]
    summary: ResultSummaryOut
    sections: list[ResultSectionOut]
    handoff_candidate: CompassHandoffCandidateOut


class AdminFlowPreviewOut(CompassFlowSchema):
    flow: CompassFlowVersionOut
    selection: FlowSelectionOut
    experience: CompassExperienceOut
