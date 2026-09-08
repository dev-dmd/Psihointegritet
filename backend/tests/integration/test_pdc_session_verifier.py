"""The seam: an opaque session token becomes the identity the backend already had.

The last test in this file is the one that matters most. It signs somebody in
with a PDC session and hands the result to `resolve_staff_actor` — untouched
business code that was written against Clerk — and asserts it returns the same
staff actor it always did. If that passes, replacing the auth provider changed
one class and one line, which is the whole claim D-083 makes.

The rest are refusals, and the first of them is the security boundary: a tenant
client's session must not verify here. A guard that accepts "any valid token"
is how "signed in somewhere" turns into "authorized here".
"""

from collections.abc import AsyncIterator
from datetime import UTC, datetime, timedelta
from uuid import uuid4

import pytest
from sqlalchemy import delete, update
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from psihointegritet.infrastructure.auth.identity import TokenVerificationError
from psihointegritet.infrastructure.auth.pdc_session import PdcSessionVerifier
from psihointegritet.modules.guidance.authorization import resolve_staff_actor
from psihointegritet.modules.identity.auth.sessions import SessionService
from psihointegritet.modules.identity.auth_models import AuthSession, TenantClient
from psihointegritet.modules.identity.models import (
    InternalUser,
    MembershipRole,
    MembershipStatus,
    OrganizationMembership,
)
from psihointegritet.modules.organizations.models import Organization
from tests.integration.conftest import test_database_url as _test_database_url


@pytest.fixture
async def engine() -> AsyncIterator[AsyncEngine]:
    eng = create_async_engine(_test_database_url())
    try:
        async with eng.connect():
            pass
    except (SQLAlchemyError, OSError) as error:
        await eng.dispose()
        pytest.skip(f"No test database reachable ({type(error).__name__}). Start compose.")
    yield eng
    await eng.dispose()


@pytest.fixture
def sessions(engine: AsyncEngine) -> async_sessionmaker[AsyncSession]:
    return async_sessionmaker(engine, expire_on_commit=False)


@pytest.fixture
async def world(
    sessions: async_sessionmaker[AsyncSession],
) -> AsyncIterator[tuple[Organization, InternalUser, TenantClient]]:
    """A tenant, a therapist working in it, and a client of that same tenant."""
    suffix = uuid4().hex[:8]
    organization = Organization(slug=f"verifier-{suffix}", display_name="Verifier tenant")
    # The Clerk-shaped subject an existing account carries. AUTH-5 keeps this
    # value exactly as it is, which is why nothing downstream has to change.
    user = InternalUser(external_auth_id=f"user_{suffix}", email="sanja@example.test")
    async with sessions() as session:
        session.add_all([organization, user])
        await session.flush()
        client = TenantClient(organization_id=organization.id, normalized_email="ana@example.test")
        session.add_all(
            [
                client,
                OrganizationMembership(
                    organization_id=organization.id,
                    user_id=user.id,
                    role=MembershipRole.THERAPIST,
                    status=MembershipStatus.ACTIVE,
                ),
            ]
        )
        await session.commit()

    yield organization, user, client

    async with sessions() as session:
        await session.execute(delete(AuthSession).where(AuthSession.user_id == user.id))
        await session.execute(delete(AuthSession).where(AuthSession.client_id == client.id))
        await session.execute(
            delete(OrganizationMembership).where(OrganizationMembership.user_id == user.id)
        )
        await session.execute(delete(TenantClient).where(TenantClient.id == client.id))
        await session.execute(delete(InternalUser).where(InternalUser.id == user.id))
        await session.execute(delete(Organization).where(Organization.id == organization.id))
        await session.commit()


@pytest.mark.asyncio
async def test_a_platform_session_becomes_the_identity_the_backend_expects(
    sessions: async_sessionmaker[AsyncSession],
    world: tuple[Organization, InternalUser, TenantClient],
) -> None:
    _, user, _ = world
    async with sessions() as session:
        issued = await SessionService().issue_platform_session(session, user_id=user.id)
        await session.commit()

    claims = await PdcSessionVerifier(sessions).verify(issued.token)

    # `subject` is `internal_users.external_auth_id`, unchanged — the column
    # every membership, appointment and audit row already resolves through.
    assert claims.subject == user.external_auth_id
    assert claims.email == "sanja@example.test"
    assert claims.session_id == str(issued.session_id)


@pytest.mark.asyncio
async def test_a_tenant_client_session_is_refused_by_the_platform_verifier(
    sessions: async_sessionmaker[AsyncSession],
    world: tuple[Organization, InternalUser, TenantClient],
) -> None:
    """The boundary. A client's token is a valid session — just not this kind.

    Letting it through would make "holds a valid token" enough to reach a staff
    route, which is exactly the collision the two session kinds exist to
    prevent. Tenant-client authorization is a separate actor path (AUTH-7); it
    does not arrive through here.
    """
    organization, _, client = world
    async with sessions() as session:
        issued = await SessionService().issue_tenant_session(
            session, client_id=client.id, organization_id=organization.id
        )
        await session.commit()

    with pytest.raises(TokenVerificationError):
        await PdcSessionVerifier(sessions).verify(issued.token)


@pytest.mark.asyncio
async def test_a_revoked_session_stops_verifying_immediately(
    sessions: async_sessionmaker[AsyncSession],
    world: tuple[Organization, InternalUser, TenantClient],
) -> None:
    """What an opaque token buys over a JWT: sign-out is effective at once."""
    _, user, _ = world
    service = SessionService()
    async with sessions() as session:
        issued = await service.issue_platform_session(session, user_id=user.id)
        await session.commit()

    assert await PdcSessionVerifier(sessions).verify(issued.token)

    async with sessions() as session:
        await service.revoke(session, issued.session_id)
        await session.commit()

    with pytest.raises(TokenVerificationError):
        await PdcSessionVerifier(sessions).verify(issued.token)


@pytest.mark.asyncio
async def test_an_expired_session_is_refused(
    sessions: async_sessionmaker[AsyncSession],
    world: tuple[Organization, InternalUser, TenantClient],
) -> None:
    _, user, _ = world
    async with sessions() as session:
        issued = await SessionService().issue_platform_session(session, user_id=user.id)
        await session.execute(
            update(AuthSession)
            .where(AuthSession.id == issued.session_id)
            .values(expires_at=datetime.now(UTC) - timedelta(seconds=1))
        )
        await session.commit()

    with pytest.raises(TokenVerificationError):
        await PdcSessionVerifier(sessions).verify(issued.token)


@pytest.mark.asyncio
async def test_a_deactivated_account_cannot_use_a_session_it_already_had(
    sessions: async_sessionmaker[AsyncSession],
    world: tuple[Organization, InternalUser, TenantClient],
) -> None:
    """Disabling somebody has to take effect without hunting down their cookies."""
    _, user, _ = world
    async with sessions() as session:
        issued = await SessionService().issue_platform_session(session, user_id=user.id)
        await session.execute(
            update(InternalUser).where(InternalUser.id == user.id).values(is_active=False)
        )
        await session.commit()

    with pytest.raises(TokenVerificationError):
        await PdcSessionVerifier(sessions).verify(issued.token)


@pytest.mark.asyncio
async def test_a_token_that_names_nothing_is_refused(
    sessions: async_sessionmaker[AsyncSession],
) -> None:
    for candidate in ("", "not-a-token", "a" * 400, "../../etc/passwd", "null"):
        with pytest.raises(TokenVerificationError):
            await PdcSessionVerifier(sessions).verify(candidate)


@pytest.mark.asyncio
async def test_business_authorization_cannot_tell_the_provider_changed(
    sessions: async_sessionmaker[AsyncSession],
    world: tuple[Organization, InternalUser, TenantClient],
) -> None:
    """The point of the whole slice, asserted.

    `resolve_staff_actor` is untouched code written against Clerk. It receives
    claims produced by the PDC verifier and resolves the same therapist, in the
    same organization, with the same role — because the thing it looks up was
    never the provider's, it was always `internal_users` and
    `organization_memberships`.
    """
    organization, user, _ = world
    async with sessions() as session:
        issued = await SessionService().issue_platform_session(session, user_id=user.id)
        await session.commit()

    claims = await PdcSessionVerifier(sessions).verify(issued.token)

    async with sessions() as session:
        actor = await resolve_staff_actor(session, claims, organization.slug)

    assert actor.user_id == user.id
    assert actor.organization_id == organization.id
    assert actor.is_therapist
    assert not actor.is_superadmin
