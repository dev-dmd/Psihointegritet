"""Session issue, resolve and revoke — with the refusals that matter.

Happy path is one test here. The rest are the states a caller must not be able
to get a session out of: expired, revoked, wrong kind, wrong tenant, garbage.
"""

from collections.abc import AsyncIterator
from datetime import UTC, datetime, timedelta
from uuid import uuid4

import pytest
from sqlalchemy import delete, select, update
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from psihointegritet.modules.identity.auth.policy import AuthPolicy
from psihointegritet.modules.identity.auth.secrets import hash_token
from psihointegritet.modules.identity.auth.sessions import SessionService
from psihointegritet.modules.identity.auth_models import (
    AuthSession,
    SessionKind,
    TenantClient,
)
from psihointegritet.modules.identity.models import InternalUser
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
) -> AsyncIterator[tuple[Organization, Organization, TenantClient, InternalUser]]:
    """Two tenants, a client of the first, and a platform user."""
    suffix = uuid4().hex[:8]
    alpha = Organization(slug=f"alpha-{suffix}", display_name="Alpha")
    beta = Organization(slug=f"beta-{suffix}", display_name="Beta")
    user = InternalUser(external_auth_id=f"pdc:{suffix}", email="staff@example.test")
    async with sessions() as session:
        session.add_all([alpha, beta, user])
        await session.flush()
        client = TenantClient(organization_id=alpha.id, normalized_email="ana@example.test")
        session.add(client)
        await session.commit()

    yield alpha, beta, client, user

    async with sessions() as session:
        await session.execute(delete(AuthSession).where(AuthSession.user_id == user.id))
        await session.execute(delete(AuthSession).where(AuthSession.client_id == client.id))
        await session.execute(delete(TenantClient).where(TenantClient.id == client.id))
        await session.execute(delete(InternalUser).where(InternalUser.id == user.id))
        await session.execute(delete(Organization).where(Organization.id.in_([alpha.id, beta.id])))
        await session.commit()


def _service() -> SessionService:
    return SessionService(AuthPolicy())


@pytest.mark.asyncio
async def test_a_platform_session_resolves_and_the_token_is_never_stored(
    sessions: async_sessionmaker[AsyncSession],
    world: tuple[Organization, Organization, TenantClient, InternalUser],
) -> None:
    _, _, _, user = world
    service = _service()

    async with sessions() as session:
        issued = await service.issue_platform_session(session, user_id=user.id)
        await session.commit()

    async with sessions() as session:
        resolved = await service.resolve(session, issued.token, kind=SessionKind.PLATFORM)
        assert resolved is not None
        assert resolved.user_id == user.id
        assert resolved.organization_id is None

        # The plaintext must not be recoverable from the row: what is stored is
        # a digest, so a database dump is not a set of live sessions.
        row = await session.get(AuthSession, issued.session_id)
        assert row is not None
        assert row.token_hash != issued.token
        assert row.token_hash == hash_token(issued.token)


@pytest.mark.asyncio
async def test_a_tenant_session_resolves_only_for_its_own_organization(
    sessions: async_sessionmaker[AsyncSession],
    world: tuple[Organization, Organization, TenantClient, InternalUser],
) -> None:
    """The cross-tenant check, and the reason `resolve` demands an organization."""
    alpha, beta, client, _ = world
    service = _service()

    async with sessions() as session:
        issued = await service.issue_tenant_session(
            session, client_id=client.id, organization_id=alpha.id
        )
        await session.commit()

    async with sessions() as session:
        assert await service.resolve(
            session, issued.token, kind=SessionKind.TENANT_CLIENT, organization_id=alpha.id
        )
        # Her cookie presented on another tenant's domain is simply not a
        # session there — the host decides the organization, and it does not match.
        assert (
            await service.resolve(
                session,
                issued.token,
                kind=SessionKind.TENANT_CLIENT,
                organization_id=beta.id,
            )
            is None
        )


@pytest.mark.asyncio
async def test_a_session_will_not_resolve_as_the_other_kind(
    sessions: async_sessionmaker[AsyncSession],
    world: tuple[Organization, Organization, TenantClient, InternalUser],
) -> None:
    """A client session must never satisfy a platform guard, or the reverse."""
    alpha, _, client, user = world
    service = _service()

    async with sessions() as session:
        tenant = await service.issue_tenant_session(
            session, client_id=client.id, organization_id=alpha.id
        )
        platform = await service.issue_platform_session(session, user_id=user.id)
        await session.commit()

    async with sessions() as session:
        assert await service.resolve(session, tenant.token, kind=SessionKind.PLATFORM) is None
        assert (
            await service.resolve(
                session,
                platform.token,
                kind=SessionKind.TENANT_CLIENT,
                organization_id=alpha.id,
            )
            is None
        )


@pytest.mark.asyncio
async def test_resolving_a_tenant_session_without_an_organization_is_a_programming_error(
    sessions: async_sessionmaker[AsyncSession],
) -> None:
    """Refused loudly, because silently allowing it is the cross-tenant hole.

    A `None` here would read as "no such session" and invite a caller to treat
    the argument as optional. It is the one failure in this module that is a bug
    rather than a rejected request.
    """
    service = _service()
    async with sessions() as session:
        with pytest.raises(ValueError, match="hostname"):
            await service.resolve(session, "irrelevant", kind=SessionKind.TENANT_CLIENT)
        with pytest.raises(ValueError, match="no organization"):
            await service.resolve(
                session, "irrelevant", kind=SessionKind.PLATFORM, organization_id=uuid4()
            )


@pytest.mark.asyncio
async def test_expired_revoked_and_unknown_tokens_all_answer_the_same_way(
    sessions: async_sessionmaker[AsyncSession],
    world: tuple[Organization, Organization, TenantClient, InternalUser],
) -> None:
    _, _, _, user = world
    service = _service()

    async with sessions() as session:
        live = await service.issue_platform_session(session, user_id=user.id)
        expired = await service.issue_platform_session(session, user_id=user.id)
        await session.execute(
            update(AuthSession)
            .where(AuthSession.id == expired.session_id)
            .values(expires_at=datetime.now(UTC) - timedelta(seconds=1))
        )
        await session.commit()

    async with sessions() as session:
        assert await service.resolve(session, expired.token, kind=SessionKind.PLATFORM) is None
        assert await service.resolve(session, "not-a-real-token", kind=SessionKind.PLATFORM) is None
        assert await service.resolve(session, "", kind=SessionKind.PLATFORM) is None

        await service.revoke(session, live.session_id)
        await session.commit()

    async with sessions() as session:
        assert await service.resolve(session, live.token, kind=SessionKind.PLATFORM) is None


@pytest.mark.asyncio
async def test_revoking_every_session_of_an_identity(
    sessions: async_sessionmaker[AsyncSession],
    world: tuple[Organization, Organization, TenantClient, InternalUser],
) -> None:
    """What a password change has to do: end every device, not just this one."""
    alpha, _, client, user = world
    service = _service()

    async with sessions() as session:
        laptop = await service.issue_platform_session(session, user_id=user.id)
        phone = await service.issue_platform_session(session, user_id=user.id)
        # A client session belonging to somebody else entirely must survive.
        untouched = await service.issue_tenant_session(
            session, client_id=client.id, organization_id=alpha.id
        )
        await session.commit()

    async with sessions() as session:
        assert await service.revoke_all_for_user(session, user.id) == 2
        await session.commit()

    async with sessions() as session:
        assert await service.resolve(session, laptop.token, kind=SessionKind.PLATFORM) is None
        assert await service.resolve(session, phone.token, kind=SessionKind.PLATFORM) is None
        assert await service.resolve(
            session, untouched.token, kind=SessionKind.TENANT_CLIENT, organization_id=alpha.id
        )


@pytest.mark.asyncio
async def test_revoking_a_client_is_scoped_to_its_tenant(
    sessions: async_sessionmaker[AsyncSession],
    world: tuple[Organization, Organization, TenantClient, InternalUser],
) -> None:
    alpha, beta, client, _ = world
    service = _service()

    async with sessions() as session:
        issued = await service.issue_tenant_session(
            session, client_id=client.id, organization_id=alpha.id
        )
        await session.commit()

    async with sessions() as session:
        # Naming the wrong tenant revokes nothing — the one query in the module
        # that could otherwise reach across one.
        assert await service.revoke_all_for_client(session, client.id, beta.id) == 0
        await session.commit()

    async with sessions() as session:
        assert await service.resolve(
            session, issued.token, kind=SessionKind.TENANT_CLIENT, organization_id=alpha.id
        )


@pytest.mark.asyncio
async def test_two_sessions_never_share_a_token(
    sessions: async_sessionmaker[AsyncSession],
    world: tuple[Organization, Organization, TenantClient, InternalUser],
) -> None:
    _, _, _, user = world
    service = _service()
    async with sessions() as session:
        issued = [await service.issue_platform_session(session, user_id=user.id) for _ in range(25)]
        await session.commit()

    tokens = {item.token for item in issued}
    assert len(tokens) == 25
    stored: set[str] = set()
    async with sessions() as session:
        rows = await session.scalars(
            select(AuthSession.token_hash).where(AuthSession.user_id == user.id)
        )
        stored = set(rows.all())
    assert len(stored) == 25
    # And no plaintext leaked into the column.
    assert stored.isdisjoint(tokens)
