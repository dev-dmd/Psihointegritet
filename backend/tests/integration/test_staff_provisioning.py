"""Staff provisioning against the real, migrated PostgreSQL schema.

Provisioning is the step that decides who can read the team queue, so its
idempotency and its role handling are worth proving rather than assuming.
Each test runs in a rolled-back transaction against its own organization, so
it neither depends on nor disturbs the seed data a migration creates.
"""

from collections.abc import AsyncIterator

import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from psihointegritet.modules.guidance.models import TherapistMatchingProfile
from psihointegritet.modules.identity.models import MembershipRole, MembershipStatus
from psihointegritet.modules.identity.provisioning import (
    ProvisioningError,
    StaffProvisioningRequest,
    list_staff,
    provision_staff,
    revoke_staff,
)
from psihointegritet.modules.organizations.models import Organization

ORG = "provisioning-test-org"
SUBJECT = "user_2marija"


@pytest.fixture
async def session(db_session: AsyncSession) -> AsyncIterator[AsyncSession]:
    """A tenant of its own, so the test never depends on migration seed data."""
    organization = Organization(slug=ORG, display_name="Provisioning test")
    db_session.add(organization)
    await db_session.flush()
    db_session.add(
        TherapistMatchingProfile(
            organization_id=organization.id,
            slug="marija-stamenkovic",
            display_name="Marija (test)",
            services=[],
            areas=[],
            formats=[],
            locations=[],
            min_child_age=18,
        )
    )
    await db_session.flush()
    yield db_session


def request(**overrides: object) -> StaffProvisioningRequest:
    defaults: dict[str, object] = {
        "organization_slug": ORG,
        "external_auth_id": SUBJECT,
        "roles": frozenset({MembershipRole.ORG_ADMIN, MembershipRole.THERAPIST}),
        "email": "marija.stamenkovic@psihointegritet.com",
    }
    defaults.update(overrides)
    return StaffProvisioningRequest(**defaults)  # pyright: ignore[reportArgumentType]


async def test_first_run_creates_the_user_and_both_roles(session: AsyncSession) -> None:
    result = await provision_staff(session, request())
    await session.commit()

    assert result.created_user is True
    assert result.roles_added == frozenset({MembershipRole.ORG_ADMIN, MembershipRole.THERAPIST})
    assert result.changed is True


async def test_second_run_with_the_same_input_changes_nothing(
    session: AsyncSession,
) -> None:
    await provision_staff(session, request())
    await session.commit()

    repeat = await provision_staff(session, request())
    await session.commit()

    assert repeat.created_user is False
    assert repeat.roles_added == frozenset()
    assert repeat.changed is False

    staff = await list_staff(session, ORG)
    assert len(staff) == 1


async def test_a_disabled_role_is_reactivated_not_duplicated(
    session: AsyncSession,
) -> None:
    await provision_staff(session, request())
    await session.commit()

    # Simulate a revoked role, then provision again.
    revoked = await provision_staff(
        session, request(roles=frozenset({MembershipRole.THERAPIST}), replace_roles=True)
    )
    await session.commit()
    assert revoked.roles_disabled == frozenset({MembershipRole.ORG_ADMIN})

    restored = await provision_staff(session, request())
    await session.commit()

    assert restored.roles_reactivated == frozenset({MembershipRole.ORG_ADMIN})
    assert restored.roles_added == frozenset()

    staff = await list_staff(session, ORG)
    assert staff[0].roles == frozenset({MembershipRole.ORG_ADMIN, MembershipRole.THERAPIST})


async def test_roles_are_additive_unless_replacement_is_requested(
    session: AsyncSession,
) -> None:
    await provision_staff(session, request())
    await session.commit()

    narrowed = await provision_staff(session, request(roles=frozenset({MembershipRole.THERAPIST})))
    await session.commit()

    # The default must not silently lock someone out of a panel.
    assert narrowed.roles_disabled == frozenset()
    assert narrowed.roles_left_in_place == frozenset({MembershipRole.ORG_ADMIN})
    staff = await list_staff(session, ORG)
    assert MembershipRole.ORG_ADMIN in staff[0].roles


async def test_therapist_profile_is_linked_once(session: AsyncSession) -> None:
    first = await provision_staff(session, request(therapist_slug="marija-stamenkovic"))
    await session.commit()
    assert first.therapist_linked == "marija-stamenkovic"

    again = await provision_staff(session, request(therapist_slug="marija-stamenkovic"))
    await session.commit()
    assert again.therapist_linked is None

    staff = await list_staff(session, ORG)
    assert staff[0].therapist_slugs == ("marija-stamenkovic",)


async def test_unknown_organization_is_reported_not_created(
    session: AsyncSession,
) -> None:
    with pytest.raises(ProvisioningError, match="does not exist"):
        await provision_staff(session, request(organization_slug="nepostojeci"))


async def test_unknown_therapist_slug_is_reported(session: AsyncSession) -> None:
    with pytest.raises(ProvisioningError, match="Therapist profile"):
        await provision_staff(session, request(therapist_slug="ne-postoji"))


async def test_list_is_empty_before_provisioning(session: AsyncSession) -> None:
    assert await list_staff(session, ORG) == []


async def test_email_is_updated_without_touching_roles(session: AsyncSession) -> None:
    await provision_staff(session, request())
    await session.commit()

    changed = await provision_staff(session, request(email="novi@psihointegritet.com"))
    await session.commit()

    assert changed.email_updated is True
    assert changed.roles_added == frozenset()
    staff = await list_staff(session, ORG)
    assert staff[0].email == "novi@psihointegritet.com"


async def test_membership_status_uses_the_active_enum_value(
    session: AsyncSession,
) -> None:
    await provision_staff(session, request())
    await session.commit()

    staff = await list_staff(session, ORG)
    assert staff[0].disabled_roles == frozenset()
    assert MembershipStatus.ACTIVE.value == "active"


async def test_revoke_disables_roles_and_unlinks_but_keeps_the_row(
    session: AsyncSession,
) -> None:
    await provision_staff(session, request(therapist_slug="marija-stamenkovic"))
    await session.commit()

    removal = await revoke_staff(session, ORG, SUBJECT)
    await session.commit()

    assert removal.found is True
    assert removal.deleted is False
    assert removal.roles_disabled == frozenset({MembershipRole.ORG_ADMIN, MembershipRole.THERAPIST})
    assert removal.therapists_unlinked == ("marija-stamenkovic",)

    staff = await list_staff(session, ORG)
    assert staff[0].roles == frozenset()
    assert staff[0].therapist_slugs == ()


async def test_delete_removes_an_identity_created_by_mistake(
    session: AsyncSession,
) -> None:
    # The case this exists for: provisioned with the wrong Clerk id, no history.
    await provision_staff(session, request(therapist_slug="marija-stamenkovic"))
    await session.commit()

    removal = await revoke_staff(session, ORG, SUBJECT, hard_delete=True)
    await session.commit()

    assert removal.deleted is True
    assert await list_staff(session, ORG) == []


async def test_revoking_an_unknown_identity_is_reported_not_an_error(
    session: AsyncSession,
) -> None:
    removal = await revoke_staff(session, ORG, "user_does_not_exist")
    assert removal.found is False
    assert removal.deleted is False


async def test_the_therapist_profile_survives_a_delete(session: AsyncSession) -> None:
    await provision_staff(session, request(therapist_slug="marija-stamenkovic"))
    await session.commit()
    await revoke_staff(session, ORG, SUBJECT, hard_delete=True)
    await session.commit()

    # SET NULL, not CASCADE: removing the wrong account must not remove the
    # therapist it was mistakenly linked to.
    profile = await session.scalar(
        select(TherapistMatchingProfile).where(
            TherapistMatchingProfile.slug == "marija-stamenkovic"
        )
    )
    assert profile is not None
    assert profile.assigned_user_id is None
