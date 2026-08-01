"""Platform superadmin authorization (D-051), against the real migrated schema.

This is the one place in the backend where a subject gains staff capability
without a membership row, so the bypass gets its own suite rather than a
line inside the provisioning tests. Two properties matter equally:

- a superadmin really does receive the full staff capability set, in a tenant
  they have no membership in (that is the whole point);
- a NON-superadmin without a membership is still refused. That negative is
  the actual security guarantee — a bypass that accidentally widened to
  "anyone with an InternalUser row" would still make every positive test
  above pass.
"""

from collections.abc import AsyncIterator

import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from psihointegritet.infrastructure.auth.identity import IdentityClaims
from psihointegritet.modules.guidance.authorization import (
    IntakeAuthorizationError,
    resolve_staff_actor,
)
from psihointegritet.modules.identity.models import (
    InternalUser,
    MembershipRole,
    MembershipStatus,
    OrganizationMembership,
)
from psihointegritet.modules.identity.provisioning import (
    StaffProvisioningRequest,
    list_staff,
    provision_staff,
)
from psihointegritet.modules.organizations.models import Organization

ORG = "superadmin-test-org"
SUPERADMIN_SUBJECT = "user_2milan_superadmin"
PLAIN_SUBJECT = "user_2someone_else"


@pytest.fixture
async def session(db_session: AsyncSession) -> AsyncIterator[AsyncSession]:
    """A tenant of its own — the superadmin deliberately has no membership in it."""
    db_session.add(Organization(slug=ORG, display_name="Superadmin test"))
    await db_session.flush()
    yield db_session


def claims(subject: str) -> IdentityClaims:
    return IdentityClaims(subject=subject, email=None, session_id=None)


async def _add_user(session: AsyncSession, subject: str, *, superadmin: bool) -> InternalUser:
    user = InternalUser(external_auth_id=subject, is_superadmin=superadmin)
    session.add(user)
    await session.flush()
    return user


async def test_superadmin_gets_full_staff_capability_without_any_membership(
    session: AsyncSession,
) -> None:
    await _add_user(session, SUPERADMIN_SUBJECT, superadmin=True)

    actor = await resolve_staff_actor(session, claims(SUPERADMIN_SUBJECT), ORG)

    assert actor.is_superadmin is True
    assert actor.is_org_admin is True
    assert actor.is_therapist is True
    assert actor.roles == frozenset({MembershipRole.ORG_ADMIN, MembershipRole.THERAPIST})


async def test_a_plain_user_without_membership_is_still_refused(
    session: AsyncSession,
) -> None:
    # The security guarantee: the bypass keys off `is_superadmin`, not merely
    # off "an InternalUser row exists".
    await _add_user(session, PLAIN_SUBJECT, superadmin=False)

    with pytest.raises(IntakeAuthorizationError):
        await resolve_staff_actor(session, claims(PLAIN_SUBJECT), ORG)


async def test_an_inactive_superadmin_is_refused(session: AsyncSession) -> None:
    # `is_active` is the kill switch; the operator flag must not outrank it.
    user = await _add_user(session, SUPERADMIN_SUBJECT, superadmin=True)
    user.is_active = False
    await session.flush()

    with pytest.raises(IntakeAuthorizationError):
        await resolve_staff_actor(session, claims(SUPERADMIN_SUBJECT), ORG)


async def test_an_unknown_subject_is_refused_even_though_superadmins_exist(
    session: AsyncSession,
) -> None:
    await _add_user(session, SUPERADMIN_SUBJECT, superadmin=True)

    with pytest.raises(IntakeAuthorizationError):
        await resolve_staff_actor(session, claims("user_2never_seen"), ORG)


async def test_actor_keeps_its_own_user_id_so_audit_stays_truthful(
    session: AsyncSession,
) -> None:
    # Actions are attributed to the operator, never to the tenant they act in
    # — `created_by_user_id`/`ContentPublicationEvent.actor_user_id` depend on
    # this being the superadmin's own row.
    user = await _add_user(session, SUPERADMIN_SUBJECT, superadmin=True)

    actor = await resolve_staff_actor(session, claims(SUPERADMIN_SUBJECT), ORG)

    assert actor.user_id == user.id


async def test_superadmin_with_a_real_membership_keeps_both_sources_of_roles(
    session: AsyncSession,
) -> None:
    user = await _add_user(session, SUPERADMIN_SUBJECT, superadmin=True)
    organization = await resolve_org(session)
    session.add(
        OrganizationMembership(
            organization_id=organization.id,
            user_id=user.id,
            role=MembershipRole.THERAPIST,
            status=MembershipStatus.ACTIVE,
        )
    )
    await session.flush()

    actor = await resolve_staff_actor(session, claims(SUPERADMIN_SUBJECT), ORG)

    assert actor.roles == frozenset({MembershipRole.ORG_ADMIN, MembershipRole.THERAPIST})
    assert actor.is_superadmin is True


async def test_a_membership_holder_is_not_marked_superadmin(session: AsyncSession) -> None:
    user = await _add_user(session, PLAIN_SUBJECT, superadmin=False)
    organization = await resolve_org(session)
    session.add(
        OrganizationMembership(
            organization_id=organization.id,
            user_id=user.id,
            role=MembershipRole.ORG_ADMIN,
            status=MembershipStatus.ACTIVE,
        )
    )
    await session.flush()

    actor = await resolve_staff_actor(session, claims(PLAIN_SUBJECT), ORG)

    assert actor.is_org_admin is True
    assert actor.is_superadmin is False


async def resolve_org(session: AsyncSession) -> Organization:
    organization = await session.scalar(select(Organization).where(Organization.slug == ORG))
    assert organization is not None
    return organization


class TestProvisioning:
    """The flag is only reachable through an explicit operator command."""

    async def test_superadmin_flag_is_granted_and_reported(self, session: AsyncSession) -> None:
        result = await provision_staff(
            session,
            StaffProvisioningRequest(
                organization_slug=ORG,
                external_auth_id=SUPERADMIN_SUBJECT,
                roles=frozenset(),
                superadmin=True,
            ),
        )
        await session.commit()

        assert result.superadmin_changed_to is True
        assert result.changed is True

    async def test_an_ordinary_run_never_touches_the_flag(self, session: AsyncSession) -> None:
        # Tri-state `None`: provisioning roles must not grant or revoke
        # platform-wide access as a side effect.
        await provision_staff(
            session,
            StaffProvisioningRequest(
                organization_slug=ORG,
                external_auth_id=SUPERADMIN_SUBJECT,
                roles=frozenset(),
                superadmin=True,
            ),
        )
        await session.commit()

        result = await provision_staff(
            session,
            StaffProvisioningRequest(
                organization_slug=ORG,
                external_auth_id=SUPERADMIN_SUBJECT,
                roles=frozenset({MembershipRole.ORG_ADMIN}),
            ),
        )
        await session.commit()

        assert result.superadmin_changed_to is None
        actor = await resolve_staff_actor(session, claims(SUPERADMIN_SUBJECT), ORG)
        assert actor.is_superadmin is True

    async def test_the_flag_can_be_revoked(self, session: AsyncSession) -> None:
        base = StaffProvisioningRequest(
            organization_slug=ORG,
            external_auth_id=SUPERADMIN_SUBJECT,
            roles=frozenset(),
            superadmin=True,
        )
        await provision_staff(session, base)
        await session.commit()

        revoked = await provision_staff(
            session,
            StaffProvisioningRequest(
                organization_slug=ORG,
                external_auth_id=SUPERADMIN_SUBJECT,
                roles=frozenset(),
                superadmin=False,
            ),
        )
        await session.commit()

        assert revoked.superadmin_changed_to is False
        # With the flag gone and no membership, access goes away with it.
        with pytest.raises(IntakeAuthorizationError):
            await resolve_staff_actor(session, claims(SUPERADMIN_SUBJECT), ORG)

    async def test_a_membershipless_superadmin_is_visible_in_list_staff(
        self, session: AsyncSession
    ) -> None:
        # An access review that could not see the most privileged account
        # would be worse than no review at all.
        await provision_staff(
            session,
            StaffProvisioningRequest(
                organization_slug=ORG,
                external_auth_id=SUPERADMIN_SUBJECT,
                roles=frozenset(),
                superadmin=True,
            ),
        )
        await session.commit()

        summaries = await list_staff(session, ORG)

        summary = next(item for item in summaries if item.external_auth_id == SUPERADMIN_SUBJECT)
        assert summary.is_superadmin is True
        assert summary.roles == frozenset()
