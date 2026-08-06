from __future__ import annotations

from collections.abc import AsyncIterator
from dataclasses import dataclass
from datetime import UTC, datetime
from typing import TypedDict
from uuid import UUID, uuid4

import httpx
import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from psihointegritet.api.dependencies import get_database_session
from psihointegritet.core.config import Settings
from psihointegritet.main import create_app
from psihointegritet.modules.content.compass_rules import COMPASS_RULE_VERSION
from psihointegritet.modules.content.compass_schemas import CompassRecommendationRequest
from psihointegritet.modules.content.compass_service import CompassService
from psihointegritet.modules.content.models import (
    ContentEntry,
    ContentRevision,
    ContentRevisionDiscovery,
    ContentRevisionTaxonomyTerm,
    ContentTaxonomyRole,
    ContentTemplate,
    ContentType,
)
from psihointegritet.modules.content.taxonomy_models import (
    JourneyIntent,
    TaxonomyAxis,
    TaxonomyRouteKind,
    TaxonomyTerm,
    TaxonomyTermRevision,
    TaxonomyTermRoute,
)
from psihointegritet.modules.content.taxonomy_service import TAXONOMY_VERSION, TaxonomyService
from psihointegritet.modules.organizations.models import Organization
from psihointegritet.shared.domain.publication import RevisionStatus


@dataclass(frozen=True, slots=True)
class CompassFixture:
    organization: Organization
    area_slug: str
    area_alias: str
    area_stable_id: str
    topic_stable_id: str


class ContentReferences(TypedDict):
    group_id: UUID
    topic_id: UUID
    audience_id: UUID
    goal_id: UUID
    journey_id: UUID
    format_id: UUID


async def _system_term(session: AsyncSession, axis: TaxonomyAxis, stable_id: str) -> TaxonomyTerm:
    term = await session.scalar(
        select(TaxonomyTerm).where(
            TaxonomyTerm.system_defined.is_(True),
            TaxonomyTerm.axis == axis,
            TaxonomyTerm.stable_id == stable_id,
        )
    )
    assert term is not None
    return term


async def _managed_term(
    session: AsyncSession,
    organization_id: UUID,
    axis: TaxonomyAxis,
    stable_id: str,
    label: str,
    *,
    parent_id: UUID | None = None,
    journey_id: UUID | None = None,
    route_kind: TaxonomyRouteKind | None = None,
    slug: str | None = None,
    status: RevisionStatus = RevisionStatus.PUBLISHED,
) -> TaxonomyTerm:
    term = TaxonomyTerm(
        organization_id=organization_id,
        axis=axis,
        stable_id=stable_id,
        system_defined=False,
    )
    session.add(term)
    await session.flush()
    session.add(
        TaxonomyTermRevision(
            term_id=term.id,
            organization_id=organization_id,
            version_label="v1",
            locale="sr-Latn",
            public_label=label,
            short_description=f"Opis: {label}",
            primary_parent_term_id=parent_id,
            journey_intent_term_id=journey_id,
            public_visible=True,
            compass_enabled=True,
            status=status,
            published_at=(
                datetime.now(UTC)
                if status in (RevisionStatus.PUBLISHED, RevisionStatus.ARCHIVED)
                else None
            ),
        )
    )
    if route_kind is not None and slug is not None:
        session.add(
            TaxonomyTermRoute(
                organization_id=organization_id,
                term_id=term.id,
                locale="sr-Latn",
                route_kind=route_kind,
                slug=slug,
                is_canonical=True,
            )
        )
    await session.flush()
    return term


async def _content(
    session: AsyncSession,
    *,
    organization_id: UUID,
    content_type: ContentType,
    slug: str,
    template: ContentTemplate,
    status: RevisionStatus,
    locale: str,
    group_id: UUID,
    topic_id: UUID,
    audience_id: UUID,
    goal_id: UUID,
    journey_id: UUID,
    format_id: UUID,
    access_id: UUID | None,
    complete: bool = True,
) -> None:
    entry = ContentEntry(
        organization_id=organization_id,
        content_type=content_type,
        slug=slug,
        locale=locale,
    )
    session.add(entry)
    await session.flush()
    revision = ContentRevision(
        entry_id=entry.id,
        version_label="v1",
        template=template,
        slot_data={"summary": slug},
        seo={"title": slug, "description": f"Opis za {slug}"},
        status=status,
        published_at=datetime.now(UTC) if status is RevisionStatus.PUBLISHED else None,
    )
    session.add(revision)
    await session.flush()
    session.add(
        ContentRevisionDiscovery(
            revision_id=revision.id,
            journey_intent_term_id=journey_id,
            content_format_term_id=format_id,
            access_level_term_id=access_id,
        )
    )
    references = [
        (ContentTaxonomyRole.TOPIC_GROUP, group_id),
        (ContentTaxonomyRole.TOPIC, topic_id),
        (ContentTaxonomyRole.AUDIENCE, audience_id),
    ]
    if complete:
        references.append((ContentTaxonomyRole.CONTENT_GOAL, goal_id))
    session.add_all(
        [
            ContentRevisionTaxonomyTerm(
                revision_id=revision.id,
                term_id=term_id,
                role=role,
            )
            for role, term_id in references
        ]
    )
    await session.flush()


@pytest.fixture
async def compass_data(db_session: AsyncSession) -> CompassFixture:
    organization = Organization(slug=f"compass-test-{uuid4().hex[:10]}", display_name="Kompas test")
    other_organization = Organization(
        slug=f"compass-other-{uuid4().hex[:10]}", display_name="Drugi tenant"
    )
    db_session.add_all([organization, other_organization])
    await db_session.flush()

    journey = await _system_term(db_session, TaxonomyAxis.JOURNEY_INTENT, "explore")
    content_format = await _system_term(db_session, TaxonomyAxis.CONTENT_FORMAT, "program")
    public_access = await _system_term(db_session, TaxonomyAxis.ACCESS_LEVEL, "public")
    registered_access = await _system_term(db_session, TaxonomyAxis.ACCESS_LEVEL, "registered")
    staff_access = await _system_term(db_session, TaxonomyAxis.ACCESS_LEVEL, "staff_only")

    area = await _managed_term(
        db_session,
        organization.id,
        TaxonomyAxis.TOPIC_GROUP,
        "stres",
        "Stres",
        route_kind=TaxonomyRouteKind.AREA,
        slug="stres",
    )
    topic = await _managed_term(
        db_session,
        organization.id,
        TaxonomyAxis.TOPIC,
        "burnout",
        "Sagorevanje",
        parent_id=area.id,
        journey_id=journey.id,
        route_kind=TaxonomyRouteKind.TOPIC,
        slug="sagorevanje",
    )
    audience = await _managed_term(
        db_session,
        organization.id,
        TaxonomyAxis.AUDIENCE,
        "odrasli",
        "Odrasli",
    )
    goal = await _managed_term(
        db_session,
        organization.id,
        TaxonomyAxis.CONTENT_GOAL,
        "razumevanje",
        "Razumevanje",
    )
    db_session.add(
        TaxonomyTermRoute(
            organization_id=organization.id,
            term_id=area.id,
            locale="sr-Latn",
            route_kind=TaxonomyRouteKind.AREA,
            slug="stari-stres",
            is_canonical=False,
            superseded_at=datetime.now(UTC),
        )
    )

    common: ContentReferences = {
        "group_id": area.id,
        "topic_id": topic.id,
        "audience_id": audience.id,
        "goal_id": goal.id,
        "journey_id": journey.id,
        "format_id": content_format.id,
    }
    await _content(
        db_session,
        organization_id=organization.id,
        content_type=ContentType.PROGRAM,
        slug="tridesete",
        template=ContentTemplate.PROGRAM_DETAIL,
        status=RevisionStatus.PUBLISHED,
        locale="sr-Latn",
        access_id=public_access.id,
        **common,
    )
    await _content(
        db_session,
        organization_id=organization.id,
        content_type=ContentType.PROGRAM,
        slug="razumevanje-anksioznosti",
        template=ContentTemplate.PROGRAM_DETAIL,
        status=RevisionStatus.PUBLISHED,
        locale="sr-Latn",
        access_id=registered_access.id,
        **common,
    )
    await _content(
        db_session,
        organization_id=organization.id,
        content_type=ContentType.PROGRAM,
        slug="roditelj-tinejdzera",
        template=ContentTemplate.PROGRAM_DETAIL,
        status=RevisionStatus.PUBLISHED,
        locale="sr-Latn",
        access_id=staff_access.id,
        **common,
    )
    await _content(
        db_session,
        organization_id=organization.id,
        content_type=ContentType.PROGRAM,
        slug="roditeljstvo-7-12",
        template=ContentTemplate.PROGRAM_DETAIL,
        status=RevisionStatus.PUBLISHED,
        locale="sr-Latn",
        access_id=None,
        **common,
    )
    await _content(
        db_session,
        organization_id=organization.id,
        content_type=ContentType.PROGRAM,
        slug="roditeljstvo-3-7",
        template=ContentTemplate.PROGRAM_DETAIL,
        status=RevisionStatus.DRAFT,
        locale="sr-Latn",
        access_id=public_access.id,
        **common,
    )
    await _content(
        db_session,
        organization_id=organization.id,
        content_type=ContentType.PROGRAM,
        slug="roditeljstvo-0-3",
        template=ContentTemplate.PROGRAM_DETAIL,
        status=RevisionStatus.PUBLISHED,
        locale="sr-Latn",
        access_id=public_access.id,
        complete=False,
        **common,
    )
    await _content(
        db_session,
        organization_id=organization.id,
        content_type=ContentType.THERAPIST,
        slug="anja-stamenkovic",
        template=ContentTemplate.THERAPIST_PROFILE,
        status=RevisionStatus.PUBLISHED,
        locale="sr-Latn",
        access_id=public_access.id,
        **common,
    )
    await _content(
        db_session,
        organization_id=organization.id,
        content_type=ContentType.PROGRAM,
        slug="postpartalni-period",
        template=ContentTemplate.PROGRAM_DETAIL,
        status=RevisionStatus.PUBLISHED,
        locale="en",
        access_id=public_access.id,
        **common,
    )
    await _content(
        db_session,
        organization_id=other_organization.id,
        content_type=ContentType.PROGRAM,
        slug="postpartalni-period",
        template=ContentTemplate.PROGRAM_DETAIL,
        status=RevisionStatus.PUBLISHED,
        locale="sr-Latn",
        access_id=public_access.id,
        **common,
    )
    await db_session.flush()
    return CompassFixture(
        organization=organization,
        area_slug="stres",
        area_alias="stari-stres",
        area_stable_id=area.stable_id,
        topic_stable_id=topic.stable_id,
    )


async def test_area_aggregate_is_fail_closed_and_includes_child_topic_content(
    db_session: AsyncSession,
    compass_data: CompassFixture,
) -> None:
    service = CompassService(db_session)

    page, is_alias = await service.taxonomy_page(
        compass_data.organization.id,
        TaxonomyRouteKind.AREA,
        compass_data.area_slug,
    )

    assert is_alias is False
    assert page.term.stable_id == compass_data.area_stable_id
    assert [item.stable_id for item in page.children] == [compass_data.topic_stable_id]
    assert [card.item_key for card in page.content_cards] == ["program:tridesete"]
    assert {card.access_level for card in page.content_cards} == {"public"}
    assert all(card.content_type is not ContentType.THERAPIST for card in page.content_cards)
    serialized_cards = page.model_dump(mode="json", by_alias=True)["contentCards"]
    assert all("slotData" not in card for card in serialized_cards)


async def test_recommendations_share_the_same_fail_closed_candidate_boundary(
    db_session: AsyncSession,
    compass_data: CompassFixture,
) -> None:
    response = await CompassService(db_session).recommendations(
        compass_data.organization.id,
        CompassRecommendationRequest(
            taxonomy_version=TAXONOMY_VERSION,
            rule_version=COMPASS_RULE_VERSION,
            topic_group_id=compass_data.area_stable_id,
            topic_ids=[compass_data.topic_stable_id],
            journey_intent=JourneyIntent.EXPLORE,
        ),
    )

    assert [item.card.item_key for item in response.recommendations] == ["program:tridesete"]
    serialized = response.model_dump(mode="json", by_alias=True)
    assert "score" not in str(serialized).casefold()
    assert "therapistId" not in str(serialized)


async def test_reason_labels_are_scoped_by_taxonomy_axis_when_stable_ids_collide(
    db_session: AsyncSession,
    compass_data: CompassFixture,
) -> None:
    collision_goal = await _managed_term(
        db_session,
        compass_data.organization.id,
        TaxonomyAxis.CONTENT_GOAL,
        compass_data.topic_stable_id,
        "Cilj sa istim stabilnim ID-em",
    )
    published_revision_id = await db_session.scalar(
        select(ContentRevision.id)
        .join(ContentEntry, ContentEntry.id == ContentRevision.entry_id)
        .where(
            ContentEntry.organization_id == compass_data.organization.id,
            ContentEntry.content_type == ContentType.PROGRAM,
            ContentEntry.slug == "tridesete",
            ContentEntry.locale == "sr-Latn",
            ContentRevision.status == RevisionStatus.PUBLISHED,
        )
    )
    assert published_revision_id is not None
    db_session.add(
        ContentRevisionTaxonomyTerm(
            revision_id=published_revision_id,
            term_id=collision_goal.id,
            role=ContentTaxonomyRole.CONTENT_GOAL,
        )
    )
    await db_session.flush()

    response = await CompassService(db_session).recommendations(
        compass_data.organization.id,
        CompassRecommendationRequest(
            taxonomy_version=TAXONOMY_VERSION,
            rule_version=COMPASS_RULE_VERSION,
            goal_ids=[compass_data.topic_stable_id],
        ),
    )

    assert [item.card.item_key for item in response.recommendations] == ["program:tridesete"]
    assert response.recommendations[0].reasons[0].code == "goal:burnout"
    assert response.recommendations[0].reasons[0].text == (
        "Podržava cilj „Cilj sa istim stabilnim ID-em”."
    )


async def test_published_area_without_content_returns_a_valid_empty_aggregate(
    db_session: AsyncSession,
    compass_data: CompassFixture,
) -> None:
    empty_area = await _managed_term(
        db_session,
        compass_data.organization.id,
        TaxonomyAxis.TOPIC_GROUP,
        "prazna-oblast",
        "Prazna oblast",
        route_kind=TaxonomyRouteKind.AREA,
        slug="prazna-oblast",
    )

    page, is_alias = await CompassService(db_session).taxonomy_page(
        compass_data.organization.id,
        TaxonomyRouteKind.AREA,
        "prazna-oblast",
    )

    assert is_alias is False
    assert page.taxonomy_version == TAXONOMY_VERSION
    assert page.term.term_id == empty_area.id
    assert page.children == []
    assert page.related_terms == []
    assert page.content_cards == []


async def test_public_taxonomy_uses_stable_id_as_the_final_ordering_tie_break(
    db_session: AsyncSession,
    compass_data: CompassFixture,
) -> None:
    for stable_id in ("ista-labela-b", "ista-labela-a"):
        await _managed_term(
            db_session,
            compass_data.organization.id,
            TaxonomyAxis.TOPIC_GROUP,
            stable_id,
            "Ista labela",
            route_kind=TaxonomyRouteKind.AREA,
            slug=stable_id,
        )

    taxonomy = await TaxonomyService(db_session).list_public(compass_data.organization.id)

    assert [item.stable_id for item in taxonomy.terms if item.public_label == "Ista labela"] == [
        "ista-labela-a",
        "ista-labela-b",
    ]


async def test_topic_page_never_inherits_children_from_an_area_with_the_same_stable_id(
    db_session: AsyncSession,
    compass_data: CompassFixture,
) -> None:
    taxonomy = await TaxonomyService(db_session).list_public(compass_data.organization.id)
    terms = {item.stable_id: item for item in taxonomy.terms}
    area = terms[compass_data.area_stable_id]
    journey = terms["explore"]
    await _managed_term(
        db_session,
        compass_data.organization.id,
        TaxonomyAxis.TOPIC,
        compass_data.area_stable_id,
        "Tema sa istim stabilnim ID-jem",
        parent_id=area.term_id,
        journey_id=journey.term_id,
        route_kind=TaxonomyRouteKind.TOPIC,
        slug="tema-sa-istim-id-jem",
    )

    page, is_alias = await CompassService(db_session).taxonomy_page(
        compass_data.organization.id,
        TaxonomyRouteKind.TOPIC,
        "tema-sa-istim-id-jem",
    )

    assert is_alias is False
    assert page.term.axis is TaxonomyAxis.TOPIC
    assert page.term.stable_id == compass_data.area_stable_id
    assert page.parent is not None
    assert page.parent.axis is TaxonomyAxis.TOPIC_GROUP
    assert page.children == []


async def test_draft_and_archived_taxonomy_and_content_stay_out_of_public_routes(
    db_session: AsyncSession,
    compass_data: CompassFixture,
) -> None:
    taxonomy = await TaxonomyService(db_session).list_public(compass_data.organization.id)
    terms = {item.stable_id: item for item in taxonomy.terms}
    area = terms[compass_data.area_stable_id]
    topic = terms[compass_data.topic_stable_id]
    audience = terms["odrasli"]
    goal = terms["razumevanje"]
    journey = terms["explore"]
    content_format = await _system_term(db_session, TaxonomyAxis.CONTENT_FORMAT, "program")
    public_access = await _system_term(db_session, TaxonomyAxis.ACCESS_LEVEL, "public")

    await _managed_term(
        db_session,
        compass_data.organization.id,
        TaxonomyAxis.TOPIC,
        "tema-u-nacrtu",
        "Tema u nacrtu",
        parent_id=area.term_id,
        journey_id=journey.term_id,
        route_kind=TaxonomyRouteKind.TOPIC,
        slug="tema-u-nacrtu",
        status=RevisionStatus.DRAFT,
    )
    await _managed_term(
        db_session,
        compass_data.organization.id,
        TaxonomyAxis.TOPIC,
        "arhivirana-tema",
        "Arhivirana tema",
        parent_id=area.term_id,
        journey_id=journey.term_id,
        route_kind=TaxonomyRouteKind.TOPIC,
        slug="arhivirana-tema",
        status=RevisionStatus.ARCHIVED,
    )
    await _content(
        db_session,
        organization_id=compass_data.organization.id,
        content_type=ContentType.PROGRAM,
        slug="postpartalni-period",
        template=ContentTemplate.PROGRAM_DETAIL,
        status=RevisionStatus.ARCHIVED,
        locale="sr-Latn",
        group_id=area.term_id,
        topic_id=topic.term_id,
        audience_id=audience.term_id,
        goal_id=goal.term_id,
        journey_id=journey.term_id,
        format_id=content_format.id,
        access_id=public_access.id,
    )

    page, _ = await CompassService(db_session).taxonomy_page(
        compass_data.organization.id,
        TaxonomyRouteKind.AREA,
        compass_data.area_slug,
    )
    public_taxonomy = await TaxonomyService(db_session).list_public(compass_data.organization.id)
    public_stable_ids = {item.stable_id for item in public_taxonomy.terms}

    assert "tema-u-nacrtu" not in public_stable_ids
    assert "arhivirana-tema" not in public_stable_ids
    assert [item.stable_id for item in page.children] == [compass_data.topic_stable_id]
    assert [card.item_key for card in page.content_cards] == ["program:tridesete"]
    assert "program:roditeljstvo-3-7" not in {card.item_key for card in page.content_cards}
    assert "program:postpartalni-period" not in {card.item_key for card in page.content_cards}

    await db_session.commit()
    app = create_app(Settings(default_organization_slug=compass_data.organization.slug))

    async def override_session() -> AsyncIterator[AsyncSession]:
        yield db_session

    app.dependency_overrides[get_database_session] = override_session
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        for slug in ("tema-u-nacrtu", "arhivirana-tema"):
            response = await client.get(
                f"/api/v1/public/compass/taxonomy/pages/tema/{slug}",
                follow_redirects=False,
            )
            assert response.status_code == 404
            assert response.json()["code"] == "TAX-ROUTE-404"


async def test_a_fully_stale_selection_never_expands_to_the_public_catalogue(
    db_session: AsyncSession,
    compass_data: CompassFixture,
) -> None:
    response = await CompassService(db_session).recommendations(
        compass_data.organization.id,
        CompassRecommendationRequest(
            taxonomy_version=TAXONOMY_VERSION,
            rule_version=COMPASS_RULE_VERSION,
            topic_ids=["arhivirana-tema"],
        ),
    )

    assert response.recommendations == []
    assert response.pagination.total == 0
    assert any(item.code == "COMPASS-SELECTION-EMPTY" for item in response.selection_adjustments)


async def test_alias_resolves_the_same_aggregate_and_router_emits_308(
    db_session: AsyncSession,
    compass_data: CompassFixture,
) -> None:
    service = CompassService(db_session)
    canonical, canonical_is_alias = await service.taxonomy_page(
        compass_data.organization.id,
        TaxonomyRouteKind.AREA,
        compass_data.area_slug,
    )
    alias, alias_is_alias = await service.taxonomy_page(
        compass_data.organization.id,
        TaxonomyRouteKind.AREA,
        compass_data.area_alias,
    )

    assert canonical_is_alias is False
    assert alias_is_alias is True
    assert alias == canonical

    # The route owns the HTTP redirect; commit the fixture's inner savepoint
    # so its explicit `session.begin()` starts cleanly on this same connection.
    await db_session.commit()
    app = create_app(Settings(default_organization_slug=compass_data.organization.slug))

    async def override_session() -> AsyncIterator[AsyncSession]:
        yield db_session

    app.dependency_overrides[get_database_session] = override_session
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get(
            f"/api/v1/public/compass/taxonomy/pages/oblast/{compass_data.area_alias}",
            follow_redirects=False,
        )

    assert response.status_code == 308
    assert response.headers["location"] == "/kompas/oblast/stres"
