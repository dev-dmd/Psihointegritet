"""Research use cases: read the published question set, record a submission,
aggregate results for the panel.

The service is the only place that knows how `question_schema` maps onto a
submission. Routers stay adapters and the panel never recomputes tallies in the
browser.
"""

from collections import Counter
from typing import cast
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from .models import (
    ResearchSubmission,
    ResearchSurvey,
    ResearchSurveyStatus,
)
from .schemas import (
    OptionTallyOut,
    PublicSurveyOut,
    QuestionTallyOut,
    SubmitResearchRequest,
    SurveyQuestionSchema,
    SurveyResultsOut,
)


def _as_list(value: object) -> list[object]:
    """Same JSON-narrowing helper `shared/domain/rich_doc.py:180` already uses:
    `isinstance(raw, list)` alone leaves the element type `Unknown` under strict
    pyright, and that spreads to every caller. Returns `[]` rather than `None`
    because "not a list" and "empty list" are the same thing to every call site
    here — there is nothing to iterate either way."""
    if isinstance(value, list):
        return cast(list[object], value)
    return []


def _as_dict(value: object) -> dict[str, object] | None:
    """JSON objects always have string keys once the value IS a dict; the cast
    states what the `.get()` calls below already assume (`rich_doc.py:168`)."""
    if isinstance(value, dict):
        return cast(dict[str, object], value)
    return None


def _as_str(value: object) -> str | None:
    return value if isinstance(value, str) else None


class ResearchError(Exception):
    """Domain failure with a stable code the router maps to a problem."""

    def __init__(self, code: str, message: str, *, field_path: str | None = None):
        super().__init__(message)
        self.code = code
        self.message = message
        self.field_path = field_path


class ResearchService:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def _published_survey(self, organization_id: UUID, stable_id: str) -> ResearchSurvey:
        """Latest published version of a survey.

        Ordering by version rather than `published_at` keeps the answer schema
        deterministic if two versions were ever published in the same second.
        """
        survey = await self._session.scalar(
            select(ResearchSurvey)
            .where(
                ResearchSurvey.organization_id == organization_id,
                ResearchSurvey.stable_id == stable_id,
                ResearchSurvey.status == ResearchSurveyStatus.PUBLISHED,
            )
            .order_by(ResearchSurvey.version.desc())
            .limit(1)
        )
        if survey is None:
            raise ResearchError(
                "RESEARCH-404",
                f"Anketa „{stable_id}” nije objavljena.",
                field_path="surveyStableId",
            )
        return survey

    @staticmethod
    def _parse_schema(survey: ResearchSurvey) -> SurveyQuestionSchema:
        return SurveyQuestionSchema.model_validate(survey.question_schema)

    async def get_published_survey(self, organization_id: UUID, stable_id: str) -> PublicSurveyOut:
        survey = await self._published_survey(organization_id, stable_id)
        return PublicSurveyOut(
            stable_id=survey.stable_id,
            version=survey.version,
            title=survey.title,
            schema=self._parse_schema(survey),
        )

    async def submit(
        self, organization_id: UUID, request: SubmitResearchRequest
    ) -> tuple[UUID, ResearchSurvey]:
        """Validates the answers against the published schema, then stores them.

        Validation is not decoration: without it a client could persist option
        ids that no question ever offered, and every later tally would silently
        under-report.
        """
        survey = await self._published_survey(organization_id, request.survey_stable_id)
        schema = self._parse_schema(survey)

        questions = {question.question_id: question for question in schema.questions}
        seen: set[str] = set()

        for answer in request.answers:
            question = questions.get(answer.question_id)
            if question is None:
                raise ResearchError(
                    "RESEARCH-422",
                    f"Pitanje „{answer.question_id}” ne postoji u ovoj verziji ankete.",
                    field_path="answers",
                )
            if answer.question_id in seen:
                raise ResearchError(
                    "RESEARCH-422",
                    f"Pitanje „{answer.question_id}” je odgovoreno više puta.",
                    field_path="answers",
                )
            seen.add(answer.question_id)

            if not question.multi and len(answer.option_ids) > 1:
                raise ResearchError(
                    "RESEARCH-422",
                    f"Pitanje „{answer.question_id}” dozvoljava samo jedan odgovor.",
                    field_path="answers",
                )

            allowed = {option.option_id for option in question.options}
            unknown = [item for item in answer.option_ids if item not in allowed]
            if unknown:
                raise ResearchError(
                    "RESEARCH-422",
                    f"Nepoznata opcija „{unknown[0]}” za pitanje „{answer.question_id}”.",
                    field_path="answers",
                )

        missing = [
            question.question_id
            for question in schema.questions
            if not question.optional and question.question_id not in seen
        ]
        if missing:
            raise ResearchError(
                "RESEARCH-422",
                f"Nedostaje odgovor na pitanje „{missing[0]}”.",
                field_path="answers",
            )

        submission = ResearchSubmission(
            organization_id=organization_id,
            survey_id=survey.id,
            answers={
                "answers": [
                    {
                        "questionId": answer.question_id,
                        "optionIds": list(answer.option_ids),
                    }
                    for answer in request.answers
                ]
            },
            surface=request.surface,
            trigger=request.trigger,
            locale=request.locale,
        )
        self._session.add(submission)
        await self._session.flush()
        return submission.id, survey

    async def results(self, organization_id: UUID, stable_id: str) -> list[SurveyResultsOut]:
        """Per-version results for one survey, newest version first."""
        surveys = (
            await self._session.scalars(
                select(ResearchSurvey)
                .where(
                    ResearchSurvey.organization_id == organization_id,
                    ResearchSurvey.stable_id == stable_id,
                )
                .order_by(ResearchSurvey.version.desc())
            )
        ).all()

        out: list[SurveyResultsOut] = []
        for survey in surveys:
            out.append(await self._results_for(survey))
        return out

    async def _results_for(self, survey: ResearchSurvey) -> SurveyResultsOut:
        schema = self._parse_schema(survey)
        rows = (
            await self._session.scalars(
                select(ResearchSubmission).where(ResearchSubmission.survey_id == survey.id)
            )
        ).all()

        option_counts: Counter[tuple[str, str]] = Counter()
        answered_counts: Counter[str] = Counter()
        surfaces: Counter[str] = Counter()
        triggers: Counter[str] = Counter()

        for row in rows:
            surfaces[row.surface.value] += 1
            triggers[row.trigger.value] += 1
            for raw_entry in _as_list(row.answers.get("answers")):
                entry = _as_dict(raw_entry)
                if entry is None:
                    continue
                question_id = _as_str(entry.get("questionId"))
                if question_id is None:
                    continue
                answered_counts[question_id] += 1
                for raw_option in _as_list(entry.get("optionIds")):
                    option_id = _as_str(raw_option)
                    if option_id is not None:
                        option_counts[(question_id, option_id)] += 1

        questions = [
            QuestionTallyOut(
                question_id=question.question_id,
                prompt=question.prompt,
                answered_count=answered_counts[question.question_id],
                multi=question.multi,
                options=[
                    OptionTallyOut(
                        option_id=option.option_id,
                        label=option.label,
                        count=option_counts[(question.question_id, option.option_id)],
                    )
                    for option in question.options
                ],
            )
            for question in schema.questions
        ]

        timestamps = [row.submitted_at for row in rows]
        return SurveyResultsOut(
            stable_id=survey.stable_id,
            version=survey.version,
            title=survey.title,
            status=survey.status,
            submission_count=len(rows),
            first_submission_at=min(timestamps) if timestamps else None,
            last_submission_at=max(timestamps) if timestamps else None,
            surfaces=dict(surfaces),
            triggers=dict(triggers),
            questions=questions,
        )

    async def known_survey_stable_ids(self, organization_id: UUID) -> list[str]:
        rows = (
            await self._session.execute(
                select(ResearchSurvey.stable_id)
                .where(ResearchSurvey.organization_id == organization_id)
                .group_by(ResearchSurvey.stable_id)
                .order_by(func.min(ResearchSurvey.stable_id))
            )
        ).all()
        return [row[0] for row in rows]
