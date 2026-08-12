"""A refused staff action must say which of three things is missing.

The three failures below look identical to a signed-in person — every panel
used to render one vague sentence for all of them — but they are fixed by three
different people: the operator who configured the service, whoever runs
`provision_staff.py` for that environment, and whoever manages memberships.
"""

from collections.abc import AsyncIterator

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from psihointegritet.infrastructure.auth.identity import IdentityClaims
from psihointegritet.modules.guidance.authorization import (
    IntakeAuthorizationError,
    StaffAuthorizationReason,
    resolve_staff_actor,
    staff_authorization_message,
)
from psihointegritet.modules.identity.models import (
    InternalUser,
    MembershipRole,
    MembershipStatus,
    OrganizationMembership,
)
from psihointegritet.modules.organizations.models import Organization

ORG = "authorization-reason-test-org"
SUBJECT = "user_2reasons"


@pytest.fixture
async def organization(db_session: AsyncSession) -> AsyncIterator[Organization]:
    row = Organization(slug=ORG, display_name="Authorization reasons")
    db_session.add(row)
    await db_session.flush()
    yield row


def identity(subject: str = SUBJECT) -> IdentityClaims:
    return IdentityClaims(subject=subject, email=None, session_id=None)


async def reason_for(session: AsyncSession, slug: str) -> StaffAuthorizationReason:
    with pytest.raises(IntakeAuthorizationError) as error:
        await resolve_staff_actor(session, identity(), slug)
    return error.value.reason


async def test_a_missing_tenant_is_reported_as_configuration_not_as_the_person(
    db_session: AsyncSession, organization: Organization
) -> None:
    reason = await reason_for(db_session, "tenant-that-does-not-exist")
    assert reason is StaffAuthorizationReason.ORGANIZATION_NOT_FOUND
    # Names the slug, because the fix is a server variable, not an account.
    message = staff_authorization_message(
        IntakeAuthorizationError(reason, "tenant-that-does-not-exist")
    )
    assert "tenant-that-does-not-exist" in message


async def test_a_verified_identity_with_no_row_in_this_database_is_named_as_such(
    db_session: AsyncSession, organization: Organization
) -> None:
    # This is the QA case: the token verifies, the tenant exists, and the
    # account was simply provisioned somewhere else.
    assert await reason_for(db_session, ORG) is StaffAuthorizationReason.ACCOUNT_NOT_PROVISIONED


async def test_an_account_without_an_active_role_is_distinguished_from_a_missing_one(
    db_session: AsyncSession, organization: Organization
) -> None:
    user = InternalUser(external_auth_id=SUBJECT, email="reasons@example.com", is_active=True)
    db_session.add(user)
    await db_session.flush()
    db_session.add(
        OrganizationMembership(
            organization_id=organization.id,
            user_id=user.id,
            role=MembershipRole.ORG_ADMIN,
            status=MembershipStatus.DISABLED,
        )
    )
    await db_session.flush()

    assert await reason_for(db_session, ORG) is StaffAuthorizationReason.NO_ACTIVE_STAFF_ROLE


async def test_every_reason_has_its_own_message() -> None:
    messages = {
        staff_authorization_message(IntakeAuthorizationError(reason, ORG))
        for reason in StaffAuthorizationReason
    }
    assert len(messages) == len(StaffAuthorizationReason)
