"""Team replacement keeps matching data on the incoming therapist profile."""

from datetime import UTC, datetime

from scripts.provision_team import ensure_therapist_profile
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from psihointegritet.modules.content.taxonomy_models import (
    TaxonomyAxis,
    TaxonomyTerm,
    TherapistMatchingProfileSupportArea,
)
from psihointegritet.modules.guidance.models import (
    AcceptanceStatus,
    CapacityStatus,
    PresenceStatus,
    TherapistMatchingProfile,
)
from psihointegritet.modules.identity.roster import member
from psihointegritet.modules.organizations.models import Organization


async def test_new_incoming_profile_inherits_live_state_once(
    db_session: AsyncSession,
) -> None:
    organization = Organization(slug="team-swap-create-test", display_name="Team swap create")
    db_session.add(organization)
    await db_session.flush()
    source = TherapistMatchingProfile(
        organization_id=organization.id,
        slug="anja-stamenkovic",
        display_name="Anja",
        accepting_new_clients=True,
        capacity_status=CapacityStatus.LIMITED,
        acceptance_status=AcceptanceStatus.LIMITED,
        presence_status=PresenceStatus.TEMPORARILY_ABSENT,
        absence_until=datetime(2026, 9, 1, tzinfo=UTC),
        accepted_age_bands=["adult"],
        service_capabilities=["individualna-psihoterapija"],
        supported_formats=["online"],
        services=["individualna-psihoterapija"],
        areas=["anxiety_stress"],
        formats=["online"],
        locations=["nis"],
        min_child_age=16,
    )
    db_session.add(source)
    await db_session.flush()

    maria = member("maria")
    assert maria is not None
    created, inherited_from = await ensure_therapist_profile(
        db_session, organization.slug, maria, source.slug
    )
    await db_session.flush()

    target = await db_session.scalar(
        select(TherapistMatchingProfile).where(
            TherapistMatchingProfile.organization_id == organization.id,
            TherapistMatchingProfile.slug == "maria-bullock",
        )
    )
    assert target is not None
    assert created is True
    assert inherited_from == source.slug
    assert target.accepting_new_clients is True
    assert target.capacity_status is CapacityStatus.LIMITED
    assert target.acceptance_status is AcceptanceStatus.LIMITED
    assert target.presence_status is PresenceStatus.TEMPORARILY_ABSENT
    assert target.absence_until == datetime(2026, 9, 1, tzinfo=UTC)
    assert target.locations == ["Chicago"]
    assert source.accepting_new_clients is False
    assert source.capacity_status is CapacityStatus.PAUSED
    assert source.acceptance_status is AcceptanceStatus.PAUSED


async def test_existing_incoming_profile_is_reconciled_with_predecessor(
    db_session: AsyncSession,
) -> None:
    organization = Organization(slug="team-swap-test", display_name="Team swap test")
    db_session.add(organization)
    await db_session.flush()

    source = TherapistMatchingProfile(
        organization_id=organization.id,
        slug="marija-stamenkovic",
        display_name="Marija",
        accepting_new_clients=True,
        capacity_status=CapacityStatus.LIMITED,
        acceptance_status=AcceptanceStatus.LIMITED,
        presence_status=PresenceStatus.TEMPORARILY_ABSENT,
        absence_until=datetime(2026, 9, 1, tzinfo=UTC),
        accepted_age_bands=["adult"],
        service_capabilities=["individualna-psihoterapija"],
        supported_formats=["online"],
        services=["individualna-psihoterapija"],
        areas=["anksioznost"],
        formats=["online"],
        locations=["nis"],
        min_child_age=16,
    )
    target = TherapistMatchingProfile(
        organization_id=organization.id,
        slug="elsa-browers",
        display_name="Incomplete Elsa",
        accepting_new_clients=False,
        services=[],
        areas=[],
        formats=[],
        locations=[],
        min_child_age=18,
    )
    support_area = TaxonomyTerm(
        organization_id=None,
        axis=TaxonomyAxis.SUPPORT_AREA,
        stable_id="team-swap-test-anxiety",
        system_defined=True,
    )
    db_session.add_all([source, target, support_area])
    await db_session.flush()
    db_session.add(
        TherapistMatchingProfileSupportArea(
            therapist_profile_id=source.id,
            support_area_term_id=support_area.id,
        )
    )
    await db_session.flush()

    elsa = member("elsa")
    assert elsa is not None
    created, inherited_from = await ensure_therapist_profile(
        db_session,
        organization.slug,
        elsa,
        source.slug,
    )
    await db_session.flush()

    assert created is False
    assert inherited_from == source.slug
    assert target.display_name == "Elsa Browers"
    # Existing incoming profiles keep their independently managed live state.
    assert target.accepting_new_clients is False
    assert target.capacity_status is CapacityStatus.AVAILABLE
    assert target.acceptance_status is AcceptanceStatus.ACCEPTING
    assert target.presence_status is PresenceStatus.ACTIVE
    assert target.absence_until is None
    assert target.accepted_age_bands == ["adult"]
    assert target.service_capabilities == ["individualna-psihoterapija"]
    assert target.supported_formats == ["online"]
    assert target.services == ["individualna-psihoterapija"]
    assert target.areas == ["anksioznost"]
    assert target.formats == ["online"]
    assert target.locations == ["Milwaukee"]
    assert target.min_child_age == 16
    assert source.accepting_new_clients is False
    assert source.capacity_status is CapacityStatus.PAUSED
    assert source.acceptance_status is AcceptanceStatus.PAUSED

    copied_support_areas = await db_session.scalar(
        select(func.count())
        .select_from(TherapistMatchingProfileSupportArea)
        .where(TherapistMatchingProfileSupportArea.therapist_profile_id == target.id)
    )
    assert copied_support_areas == 1

    # Re-running is a reconciliation, not a duplicate insert.
    await ensure_therapist_profile(db_session, organization.slug, elsa, source.slug)
    await db_session.flush()
    assert target.locations == ["Milwaukee"]
    repeated_count = await db_session.scalar(
        select(func.count())
        .select_from(TherapistMatchingProfileSupportArea)
        .where(TherapistMatchingProfileSupportArea.therapist_profile_id == target.id)
    )
    assert repeated_count == 1
