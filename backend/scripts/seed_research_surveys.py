"""Seeds the two v1 surveys.

Idempotent: an existing `(organization, stable_id, version)` is left alone, so
re-running never duplicates a survey or orphans its submissions.

A new question set is a **new version**, never an edit of a published one —
editing in place would silently repoint existing answers at questions that were
never asked.

    uv run python scripts/seed_research_surveys.py
"""

import asyncio
from typing import Any

from sqlalchemy import select

from psihointegritet.core.config import get_settings
from psihointegritet.db.session import create_engine, create_session_factory
from psihointegritet.modules.organizations.models import Organization
from psihointegritet.modules.research.models import ResearchSurvey

ONLINE_EXPERIENCE: dict[str, Any] = {
    "schemaVersion": 1,
    "introTitle": "Pomozite nam da oblikujemo bolje iskustvo podrške",
    "introDescription": (
        "Odgovorite na nekoliko kratkih pitanja o online i radu uživo. Anketa "
        "traje oko jednog minuta, anonimna je i ne traži privatne informacije."
    ),
    # V1 has no approved DTO/UI/storage/retention contract for prose.
    "allowsFreeText": False,
    "questions": [
        {
            "questionId": "prior_support",
            "prompt": "Da li ste ranije koristili psihološku podršku?",
            "options": [
                {"optionId": "in_person", "label": "Da, uživo"},
                {"optionId": "online", "label": "Da, online"},
                {"optionId": "never", "label": "Ne, nikad"},
                {"optionId": "no_answer", "label": "Ne želim da kažem"},
            ],
        },
        {
            "questionId": "easier_first_conversation",
            "prompt": "Šta vam deluje lakše za prvi razgovor?",
            "options": [
                {"optionId": "online", "label": "Online"},
                {"optionId": "in_person", "label": "Uživo"},
                {"optionId": "either", "label": "Svejedno"},
                {"optionId": "unsure", "label": "Nisam siguran/na"},
            ],
        },
        {
            "questionId": "platform_trust",
            "prompt": ("Koliko imate poverenja u ovakve online platforme za podršku?"),
            "options": [
                {"optionId": "high", "label": "Veliko"},
                {"optionId": "moderate", "label": "Umereno"},
                {"optionId": "low", "label": "Malo"},
                {"optionId": "none", "label": "Nemam poverenja"},
            ],
        },
        {
            "questionId": "barrier",
            "prompt": "Šta vas najviše koči da potražite podršku?",
            "options": [
                {"optionId": "price", "label": "Cena"},
                {"optionId": "shame", "label": "Stid ili strah od osude"},
                {"optionId": "time", "label": "Nedostatak vremena"},
                {"optionId": "who", "label": "Ne znam kome da se obratim"},
                {"optionId": "none", "label": "Ništa me posebno ne koči"},
            ],
        },
    ],
}

COMPASS_EXPERIENCE: dict[str, Any] = {
    "schemaVersion": 1,
    "introTitle": "Da li biste nam pomogli da Kompas učinimo korisnijim?",
    "introDescription": (
        "Četiri kratka pitanja o samom korišćenju Kompasa. Ne unosite lične ni "
        "zdravstvene podatke — pitamo samo kako vam je alat radio."
    ),
    # Deliberately off in v1: a free-text box is where a user would most easily
    # leave health or personal detail, and nothing here needs prose.
    "allowsFreeText": False,
    "questions": [
        {
            "questionId": "recommendations_relevant",
            "prompt": "Koliko su vam predloženi sadržaji bili relevantni?",
            "options": [
                {"optionId": "yes", "label": "Jesu, odgovarali su mi"},
                {"optionId": "partly", "label": "Delimično"},
                {"optionId": "no", "label": "Nisu"},
                {"optionId": "unsure", "label": "Ne umem da procenim"},
            ],
        },
        {
            "questionId": "next_step_clear",
            "prompt": "Da li vam je bilo jasno šta možete dalje?",
            "options": [
                {"optionId": "clear", "label": "Potpuno jasno"},
                {"optionId": "mostly", "label": "Uglavnom"},
                {"optionId": "unclear", "label": "Nije mi bilo jasno"},
            ],
        },
        {
            "questionId": "missing",
            "prompt": "Šta vam je nedostajalo?",
            "multi": True,
            "optional": True,
            "options": [
                {"optionId": "more_content", "label": "Više sadržaja"},
                {"optionId": "more_topics", "label": "Više tema"},
                {"optionId": "shorter", "label": "Kraći tekstovi"},
                {"optionId": "practical", "label": "Praktičnije vežbe"},
                {"optionId": "nothing", "label": "Ništa posebno"},
            ],
        },
        {
            "questionId": "support_findable",
            "prompt": "Koliko je lako bilo pronaći put do stručne pomoći?",
            "options": [
                {"optionId": "easy", "label": "Lako"},
                {"optionId": "medium", "label": "Osrednje"},
                {"optionId": "hard", "label": "Teško"},
                {"optionId": "not_looking", "label": "Nisam tražio/la"},
            ],
        },
    ],
}

SEEDS = (
    ("online-experience", "Iskustvo online podrške", ONLINE_EXPERIENCE),
    ("compass-experience", "Iskustvo Kompasa", COMPASS_EXPERIENCE),
)


async def main() -> None:
    settings = get_settings()
    engine = create_engine(settings)
    session_factory = create_session_factory(engine)

    async with session_factory() as session:
        organization = await session.scalar(
            select(Organization).where(Organization.slug == settings.default_organization_slug)
        )
        if organization is None:
            raise SystemExit(f"Organization '{settings.default_organization_slug}' not found.")

        for stable_id, title, schema in SEEDS:
            existing = await session.scalar(
                select(ResearchSurvey).where(
                    ResearchSurvey.organization_id == organization.id,
                    ResearchSurvey.stable_id == stable_id,
                    ResearchSurvey.version == 1,
                )
            )
            if existing is not None:
                print(f"= {stable_id} v1 already exists ({existing.status.value})")
                continue

            survey = ResearchSurvey(
                organization_id=organization.id,
                stable_id=stable_id,
                version=1,
                title=title,
                question_schema=schema,
            )
            survey.mark_published()
            session.add(survey)
            print(f"+ {stable_id} v1 published")

        await session.commit()

    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())
