"""Idempotent development-only seed for the complete Kompas vertical slice.

Required:
    ALLOW_COMPASS_DEMO_SEED=true
    COMPASS_DEMO_ORGANIZATION_SLUG=<explicit slug>

The script refuses every environment except development. Existing identities,
published flow versions and existing discovery metadata are never overwritten.
"""

import asyncio
import os
from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from psihointegritet.core.config import Environment, get_settings
from psihointegritet.db.session import create_engine, create_session_factory
from psihointegritet.modules.compass.models import (
    CompassFlow,
    CompassFlowReviewDecision,
    CompassFlowVersion,
)
from psihointegritet.modules.compass.schemas import CompassFlowDefinition
from psihointegritet.modules.content.models import (
    ContentEntry,
    ContentRevision,
    ContentRevisionDiscovery,
    ContentRevisionTaxonomyTerm,
    ContentTaxonomyRole,
    ContentType,
    ReviewOutcome,
)
from psihointegritet.modules.content.taxonomy_models import (
    TaxonomyAxis,
    TaxonomyRouteKind,
    TaxonomyTerm,
    TaxonomyTermRevision,
    TaxonomyTermRoute,
)
from psihointegritet.modules.identity import models as identity_models
from psihointegritet.modules.organizations.models import Organization
from psihointegritet.shared.domain.publication import ApprovalCapability, RevisionStatus

# Taxonomy and flow actor foreign keys point at ``internal_users``. Importing
# the owning model registers that table in Base.metadata before the first ORM
# flush, just as Alembic's model bootstrap does.
MODEL_MODULES = (identity_models,)


def validate_demo_seed_guard(
    environment: Environment, enabled: str | None, organization_slug: str | None
) -> str:
    if enabled != "true":
        raise RuntimeError("Set ALLOW_COMPASS_DEMO_SEED=true explicitly.")
    if environment is not Environment.DEVELOPMENT:
        raise RuntimeError("Compass demo seed is allowed only in development.")
    if organization_slug is None or not organization_slug.strip():
        raise RuntimeError("Set COMPASS_DEMO_ORGANIZATION_SLUG explicitly.")
    return organization_slug.strip()


REGISTRY = (
    (TaxonomyAxis.TOPIC_GROUP, "stress-overload", "Stres i preopterećenost", None, 10),
    (TaxonomyAxis.TOPIC_GROUP, "relationships-closeness", "Odnosi i bliskost", None, 20),
    (TaxonomyAxis.TOPIC, "burnout", "Sagorevanje", "stress-overload", 10),
    (TaxonomyAxis.TOPIC, "difficulty-resting", "Teškoće sa odmorom", "stress-overload", 20),
    (TaxonomyAxis.TOPIC, "communication", "Komunikacija", "relationships-closeness", 10),
    (TaxonomyAxis.AUDIENCE, "self", "Za mene", None, 10),
    (TaxonomyAxis.CONTENT_GOAL, "understand", "Bolje razumevanje", None, 10),
    (TaxonomyAxis.CONTENT_GOAL, "practical-step", "Praktičan korak", None, 20),
)


def flow_definition() -> CompassFlowDefinition:
    return CompassFlowDefinition.model_validate(
        {
            "schemaVersion": 1,
            "entryQuestionId": "certainty",
            "questions": [
                {
                    "questionId": "certainty",
                    "prompt": "Da li znate od koje oblasti želite da počnete?",
                    "helpText": "Ako niste sigurni, prikazaćemo polazni paket.",
                    "selectionTarget": "none",
                    "inputMode": "single_select",
                    "optionSource": "static",
                    "staticOptions": [
                        {
                            "optionId": "choose",
                            "label": "Želim da izaberem oblast",
                            "nextQuestionId": "area",
                        },
                        {
                            "optionId": "unsure",
                            "label": "Nisam siguran/na šta mi se događa",
                            "terminal": "starting_package",
                        },
                    ],
                    "skipNextQuestionId": "area",
                },
                {
                    "questionId": "area",
                    "prompt": "Od čega želite da počnete?",
                    "helpText": "Oblasti dolaze iz objavljenog registra.",
                    "selectionTarget": "topic_group",
                    "inputMode": "single_select",
                    "optionSource": "taxonomy_axis",
                    "taxonomyAxis": "topic_group",
                    "allowedTermIds": ["stress-overload", "relationships-closeness"],
                    "defaultNextQuestionId": "topics",
                    "skipNextQuestionId": "topics",
                },
                {
                    "questionId": "topics",
                    "prompt": "Koje teme su vam najbliže?",
                    "helpText": "Možete izabrati najviše dve teme.",
                    "selectionTarget": "topics",
                    "inputMode": "multi_select",
                    "optionSource": "taxonomy_axis",
                    "taxonomyAxis": "topic",
                    "allowedTermIds": ["burnout", "difficulty-resting", "communication"],
                    "filterTopicsBySelectedArea": True,
                    "maxSelections": 2,
                    "defaultNextQuestionId": "goal",
                    "skipNextQuestionId": "goal",
                },
                {
                    "questionId": "goal",
                    "prompt": "Šta bi vam sada bilo najkorisnije?",
                    "helpText": "Izaberite vrstu sadržaja koju želite.",
                    "selectionTarget": "content_goals",
                    "inputMode": "single_select",
                    "optionSource": "taxonomy_axis",
                    "taxonomyAxis": "content_goal",
                    "allowedTermIds": ["understand", "practical-step"],
                    "defaultNextQuestionId": "journey",
                    "skipNextQuestionId": "journey",
                },
                {
                    "questionId": "journey",
                    "prompt": "Kako želite da nastavite?",
                    "helpText": "Kompas ne rangira terapeute.",
                    "selectionTarget": "journey_intent",
                    "inputMode": "single_select",
                    "optionSource": "taxonomy_axis",
                    "taxonomyAxis": "journey_intent",
                    "allowedTermIds": ["explore", "professional_support", "both"],
                    "terminal": "results",
                },
            ],
            "resultSections": [
                {
                    "sectionId": "understanding",
                    "title": "Za bolje razumevanje",
                    "goalIds": ["understand"],
                    "maxItems": 4,
                },
                {
                    "sectionId": "practical-tools",
                    "title": "Praktični alati",
                    "goalIds": ["practical-step"],
                    "maxItems": 4,
                },
                {"sectionId": "related-areas", "title": "Srodne oblasti", "maxItems": 4},
                {"sectionId": "related-topics", "title": "Srodne teme", "maxItems": 4},
                {
                    "sectionId": "other-topics-in-area",
                    "title": "Druge teme u oblasti",
                    "maxItems": 4,
                },
                {
                    "sectionId": "professional-support",
                    "title": "Stručna podrška",
                    "maxItems": 1,
                    "emptyBehavior": "show",
                    "locked": True,
                },
            ],
        }
    )


async def _system_term_id(session: AsyncSession, axis: TaxonomyAxis, stable_id: str) -> UUID:
    term = await session.scalar(
        select(TaxonomyTerm).where(
            TaxonomyTerm.organization_id.is_(None),
            TaxonomyTerm.axis == axis,
            TaxonomyTerm.stable_id == stable_id,
        )
    )
    if term is None:
        raise RuntimeError(f"Missing required system term {axis.value}:{stable_id}")
    return term.id


async def main() -> None:
    settings = get_settings()
    organization_slug = validate_demo_seed_guard(
        settings.environment,
        os.environ.get("ALLOW_COMPASS_DEMO_SEED"),
        os.environ.get("COMPASS_DEMO_ORGANIZATION_SLUG"),
    )
    engine = create_engine(settings)
    session_factory = create_session_factory(engine)
    async with session_factory() as session:
        organization = await session.scalar(
            select(Organization).where(Organization.slug == organization_slug)
        )
        if organization is None:
            raise RuntimeError(f"Organization '{organization_slug}' not found.")

        terms: dict[str, TaxonomyTerm] = {}
        for axis, stable_id, label, parent_stable_id, sort_order in REGISTRY:
            term = await session.scalar(
                select(TaxonomyTerm).where(
                    TaxonomyTerm.organization_id == organization.id,
                    TaxonomyTerm.axis == axis,
                    TaxonomyTerm.stable_id == stable_id,
                )
            )
            if term is None:
                term = TaxonomyTerm(
                    organization_id=organization.id,
                    axis=axis,
                    stable_id=stable_id,
                    system_defined=False,
                )
                session.add(term)
                await session.flush()
                parent = terms.get(parent_stable_id or "")
                session.add(
                    TaxonomyTermRevision(
                        term_id=term.id,
                        organization_id=organization.id,
                        version_label="demo-v1",
                        locale="sr-Latn",
                        public_label=label,
                        short_description=f"Razvojni demo registra: {label}.",
                        primary_parent_term_id=parent.id if parent else None,
                        journey_intent_term_id=(
                            await _system_term_id(session, TaxonomyAxis.JOURNEY_INTENT, "both")
                            if axis is TaxonomyAxis.TOPIC
                            else None
                        ),
                        sort_order=sort_order,
                        public_visible=True,
                        compass_enabled=True,
                        status=RevisionStatus.PUBLISHED,
                        published_at=datetime.now(UTC),
                    )
                )
                if axis in {TaxonomyAxis.TOPIC_GROUP, TaxonomyAxis.TOPIC}:
                    session.add(
                        TaxonomyTermRoute(
                            organization_id=organization.id,
                            term_id=term.id,
                            locale="sr-Latn",
                            route_kind=(
                                TaxonomyRouteKind.AREA
                                if axis is TaxonomyAxis.TOPIC_GROUP
                                else TaxonomyRouteKind.TOPIC
                            ),
                            slug=stable_id,
                            is_canonical=True,
                        )
                    )
                print(f"+ taxonomy {axis.value}:{stable_id}")
            else:
                print(f"= taxonomy {axis.value}:{stable_id}")
            terms[stable_id] = term

        flow = await session.scalar(
            select(CompassFlow).where(
                CompassFlow.organization_id == organization.id,
                CompassFlow.stable_id == "main-kompas",
            )
        )
        if flow is None:
            flow = CompassFlow(organization_id=organization.id, stable_id="main-kompas")
            session.add(flow)
            await session.flush()
            version = CompassFlowVersion(
                flow_id=flow.id,
                organization_id=organization.id,
                version=1,
                locale="sr-Latn",
                definition=flow_definition().model_dump(by_alias=True, mode="json"),
                status=RevisionStatus.PUBLISHED,
                published_at=datetime.now(UTC),
            )
            session.add(version)
            await session.flush()
            session.add_all(
                [
                    CompassFlowReviewDecision(
                        flow_version_id=version.id,
                        organization_id=organization.id,
                        capability=capability,
                        outcome=ReviewOutcome.APPROVED,
                        note="Development-only demo approval",
                    )
                    for capability in (ApprovalCapability.CLINICAL, ApprovalCapability.BUSINESS)
                ]
            )
            print("+ main-kompas v1 published (development demo)")
        else:
            print("= main-kompas identity already exists; left unchanged")

        journey_id = await _system_term_id(session, TaxonomyAxis.JOURNEY_INTENT, "both")
        format_id = await _system_term_id(session, TaxonomyAxis.CONTENT_FORMAT, "program")
        access_id = await _system_term_id(session, TaxonomyAxis.ACCESS_LEVEL, "public")
        entries = (
            await session.execute(
                select(ContentEntry, ContentRevision)
                .join(ContentRevision, ContentRevision.entry_id == ContentEntry.id)
                .where(
                    ContentEntry.organization_id == organization.id,
                    ContentEntry.content_type.in_([ContentType.SERVICE, ContentType.PROGRAM]),
                    ContentRevision.status == RevisionStatus.PUBLISHED,
                )
                .order_by(ContentEntry.content_type, ContentEntry.slug)
                .limit(3)
            )
        ).all()
        demo_links = [
            (terms["stress-overload"], terms["burnout"], terms["understand"]),
            (terms["stress-overload"], terms["difficulty-resting"], terms["practical-step"]),
            (terms["relationships-closeness"], terms["communication"], terms["understand"]),
        ]
        for (entry, revision), (area, topic, goal) in zip(entries, demo_links, strict=False):
            discovery = await session.get(ContentRevisionDiscovery, revision.id)
            if discovery is None:
                session.add(
                    ContentRevisionDiscovery(
                        revision_id=revision.id,
                        journey_intent_term_id=journey_id,
                        content_format_term_id=format_id,
                        access_level_term_id=access_id,
                    )
                )
                for role, term_id in (
                    (ContentTaxonomyRole.TOPIC_GROUP, area.id),
                    (ContentTaxonomyRole.TOPIC, topic.id),
                    (ContentTaxonomyRole.AUDIENCE, terms["self"].id),
                    (ContentTaxonomyRole.CONTENT_GOAL, goal.id),
                ):
                    session.add(
                        ContentRevisionTaxonomyTerm(
                            revision_id=revision.id, term_id=term_id, role=role
                        )
                    )
                print(f"+ linked existing {entry.content_type.value}:{entry.slug}")
            else:
                print(f"= {entry.content_type.value}:{entry.slug} metadata exists; unchanged")

        await session.commit()
    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())
