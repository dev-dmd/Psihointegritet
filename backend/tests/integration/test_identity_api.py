"""PostgreSQL identity source: neutral JIT account and active membership projection."""

from uuid import uuid4

import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from psihointegritet.infrastructure.auth.identity import IdentityClaims
from psihointegritet.modules.guidance.authorization import StaffActor
from psihointegritet.modules.identity.models import (
    InternalUser,
    MembershipRole,
    MembershipStatus,
    OrganizationMembership,
)
from psihointegritet.modules.identity.router import (
    MembershipRolesUpdate,
    build_me_response,
    ensure_internal_user,
    replace_tenant_user_roles,
)
from psihointegritet.modules.organizations.models import Organization, OrganizationAuditEvent


@pytest.fixture
def identity() -> IdentityClaims:
    return IdentityClaims(
        subject=f"user_identity_api_{uuid4().hex}",
        email="new.owner@example.com",
        session_id="session_test",
    )


async def test_first_login_creates_neutral_user_idempotently(
    db_session: AsyncSession,
    identity: IdentityClaims,
) -> None:
    first = await ensure_internal_user(db_session, identity)
    second = await ensure_internal_user(db_session, identity)

    assert first.id == second.id
    assert first.email == "new.owner@example.com"
    assert first.is_superadmin is False
    assert (await build_me_response(db_session, first)).memberships == []
    rows = list(
        await db_session.scalars(
            select(InternalUser).where(InternalUser.external_auth_id == identity.subject)
        )
    )
    assert len(rows) == 1


async def test_me_returns_only_active_postgresql_roles(
    db_session: AsyncSession,
    identity: IdentityClaims,
) -> None:
    organization = Organization(
        slug=f"identity-{uuid4().hex}",
        display_name="Identity test tenant",
    )
    db_session.add(organization)
    user = await ensure_internal_user(db_session, identity)
    await db_session.flush()
    db_session.add_all(
        [
            OrganizationMembership(
                organization_id=organization.id,
                user_id=user.id,
                role=MembershipRole.ORG_ADMIN,
                status=MembershipStatus.ACTIVE,
            ),
            OrganizationMembership(
                organization_id=organization.id,
                user_id=user.id,
                role=MembershipRole.THERAPIST,
                status=MembershipStatus.DISABLED,
            ),
        ]
    )
    await db_session.flush()

    result = await build_me_response(db_session, user)

    assert result.user_id == identity.subject
    assert len(result.memberships) == 1
    assert result.memberships[0].organization_id == organization.slug
    assert result.memberships[0].roles == [MembershipRole.ORG_ADMIN]


async def test_superadmin_replaces_roles_and_records_audit(
    db_session: AsyncSession,
    identity: IdentityClaims,
) -> None:
    organization = Organization(
        slug=f"roles-{uuid4().hex}",
        display_name="Roles test tenant",
    )
    actor_user = InternalUser(
        external_auth_id=f"user_superadmin_{uuid4().hex}",
        is_superadmin=True,
    )
    db_session.add_all([organization, actor_user])
    target = await ensure_internal_user(db_session, identity)
    await db_session.flush()
    db_session.add(
        OrganizationMembership(
            organization_id=organization.id,
            user_id=target.id,
            role=MembershipRole.THERAPIST,
            status=MembershipStatus.ACTIVE,
        )
    )
    await db_session.flush()
    actor = StaffActor(
        user_id=actor_user.id,
        organization_id=organization.id,
        roles=frozenset({MembershipRole.ORG_ADMIN, MembershipRole.THERAPIST}),
        is_superadmin=True,
    )

    response = await replace_tenant_user_roles(
        organization.slug,
        target.id,
        MembershipRolesUpdate(roles={MembershipRole.ORG_ADMIN}),
        db_session,
        actor,
    )

    assert response.roles == [MembershipRole.ORG_ADMIN]
    rows = list(
        await db_session.scalars(
            select(OrganizationMembership).where(
                OrganizationMembership.organization_id == organization.id,
                OrganizationMembership.user_id == target.id,
            )
        )
    )
    assert {row.role: row.status for row in rows} == {
        MembershipRole.ORG_ADMIN: MembershipStatus.ACTIVE,
        MembershipRole.THERAPIST: MembershipStatus.DISABLED,
    }
    event = await db_session.scalar(
        select(OrganizationAuditEvent).where(
            OrganizationAuditEvent.organization_id == organization.id,
            OrganizationAuditEvent.event_type == "membership_roles_replaced",
        )
    )
    assert event is not None
    assert event.actor_user_id == actor_user.id
    assert event.details == {
        "target_user_id": str(target.id),
        "before": ["therapist"],
        "after": ["org_admin"],
    }
