from datetime import UTC, datetime
from uuid import uuid4

from sqlalchemy.ext.asyncio import AsyncSession

from psihointegritet.modules.organizations.models import Organization
from psihointegritet.modules.research.models import ResearchSurvey, ResearchSurveyStatus
from psihointegritet.modules.research.schemas import SubmitResearchRequest
from psihointegritet.modules.research.service import ResearchService


async def test_submission_and_results_keep_question_denominator(
    db_session: AsyncSession,
) -> None:
    suffix = uuid4().hex[:10]
    organization = Organization(slug=f"research-{suffix}", display_name="Research test")
    db_session.add(organization)
    await db_session.flush()
    survey = ResearchSurvey(
        organization_id=organization.id,
        stable_id="compass-experience",
        version=1,
        title="Kompas feedback",
        question_schema={
            "schemaVersion": 1,
            "introTitle": "Kratka anketa",
            "introDescription": "Bez slobodnog teksta.",
            "allowsFreeText": False,
            "questions": [
                {
                    "questionId": "useful",
                    "prompt": "Korisno?",
                    "options": [
                        {"optionId": "yes", "label": "Da"},
                        {"optionId": "no", "label": "Ne"},
                    ],
                },
                {
                    "questionId": "missing",
                    "prompt": "Šta nedostaje?",
                    "multi": True,
                    "optional": True,
                    "options": [
                        {"optionId": "tools", "label": "Alati"},
                        {"optionId": "topics", "label": "Teme"},
                    ],
                },
            ],
        },
        status=ResearchSurveyStatus.PUBLISHED,
        published_at=datetime.now(UTC),
    )
    db_session.add(survey)
    await db_session.flush()

    service = ResearchService(db_session)
    await service.submit(
        organization.id,
        SubmitResearchRequest.model_validate(
            {
                "surveyStableId": "compass-experience",
                "answers": [{"questionId": "useful", "optionIds": ["yes"]}],
                "surface": "compass-feedback",
                "trigger": "after-results",
            }
        ),
    )

    results = await service.results(organization.id, "compass-experience")
    assert results[0].submission_count == 1
    assert results[0].questions[0].answered_count == 1
    assert results[0].questions[1].answered_count == 0
    assert results[0].questions[1].multi is True
