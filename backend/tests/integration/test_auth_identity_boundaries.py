"""The three boundaries AUTH-1 puts in the database (D-083).

Not "do the tables exist" — the interesting question is whether the schema
*refuses* the states that would leak one tenant's clients into another. Each
test here writes something a future bug might write, and asserts PostgreSQL
says no.
"""

from collections.abc import AsyncIterator
from datetime import UTC, datetime, timedelta
from uuid import UUID, uuid4

import pytest
from sqlalchemy import delete, select
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from psihointegritet.modules.identity.auth_models import (
    AuthSession,
    SessionKind,
    TenantClient,
    TenantClientCredential,
)
from psihointegritet.modules.organizations.models import Organization
from tests.integration.conftest import test_database_url as _test_database_url

EMAIL = "ana@example.test"


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
async def two_tenants(
    sessions: async_sessionmaker[AsyncSession],
) -> AsyncIterator[tuple[Organization, Organization]]:
    """Two real organizations, because the whole point is what happens across them."""
    suffix = uuid4().hex[:8]
    first = Organization(slug=f"alpha-{suffix}", display_name="Alpha")
    second = Organization(slug=f"beta-{suffix}", display_name="Beta")
    async with sessions() as session:
        session.add_all([first, second])
        await session.commit()

    yield first, second

    async with sessions() as session:
        for org in (first, second):
            await session.execute(
                delete(TenantClient).where(TenantClient.organization_id == org.id)
            )
            await session.execute(delete(Organization).where(Organization.id == org.id))
        await session.commit()


async def _add_client(
    sessions: async_sessionmaker[AsyncSession],
    organization_id: UUID,
    email: str = EMAIL,
) -> TenantClient:
    client = TenantClient(organization_id=organization_id, normalized_email=email)
    async with sessions() as session:
        session.add(client)
        await session.commit()
    return client


@pytest.mark.asyncio
async def test_one_email_is_two_independent_clients_across_tenants(
    sessions: async_sessionmaker[AsyncSession],
    two_tenants: tuple[Organization, Organization],
) -> None:
    """The property D-083 is built on: the pair is the identity, not the address."""
    alpha, beta = two_tenants

    at_alpha = await _add_client(sessions, alpha.id)
    at_beta = await _add_client(sessions, beta.id)

    assert at_alpha.id != at_beta.id

    async with sessions() as session:
        # A tenant looking for this person finds only its own row. Alpha gets no
        # signal that the same address exists at Beta — the privacy half of the
        # design, not just the correctness half.
        found = (
            await session.scalars(
                select(TenantClient).where(
                    TenantClient.organization_id == alpha.id,
                    TenantClient.normalized_email == EMAIL,
                )
            )
        ).all()
        assert [row.id for row in found] == [at_alpha.id]


@pytest.mark.asyncio
async def test_the_same_email_cannot_repeat_inside_one_tenant(
    sessions: async_sessionmaker[AsyncSession],
    two_tenants: tuple[Organization, Organization],
) -> None:
    """Two accounts for one person at one practice is the state to refuse."""
    alpha, _ = two_tenants
    await _add_client(sessions, alpha.id)

    with pytest.raises(IntegrityError):
        async with sessions() as session:
            session.add(TenantClient(organization_id=alpha.id, normalized_email=EMAIL))
            await session.commit()


@pytest.mark.asyncio
async def test_credentials_cannot_be_paired_across_tenants(
    sessions: async_sessionmaker[AsyncSession],
    two_tenants: tuple[Organization, Organization],
) -> None:
    """The composite FK: Alpha's client id with Beta's organization is unwritable."""
    alpha, beta = two_tenants
    at_alpha = await _add_client(sessions, alpha.id)

    with pytest.raises(IntegrityError):
        async with sessions() as session:
            session.add(
                TenantClientCredential(
                    client_id=at_alpha.id,
                    organization_id=beta.id,  # the wrong tenant, on purpose
                    password_hash="not-a-real-hash",  # noqa: S106 - the FK is what is under test
                )
            )
            await session.commit()


@pytest.mark.asyncio
async def test_a_tenant_session_without_an_organization_is_unwritable(
    sessions: async_sessionmaker[AsyncSession],
    two_tenants: tuple[Organization, Organization],
) -> None:
    """The check constraint, and the reason it is in the database at all.

    An application guard would be enough right up until somebody forgets one.
    A "global client session" is the failure mode the Marysoll report describes,
    and this is what makes it impossible to record rather than merely wrong.
    """
    alpha, _ = two_tenants
    at_alpha = await _add_client(sessions, alpha.id)
    expires = datetime.now(UTC) + timedelta(hours=1)

    with pytest.raises(IntegrityError):
        async with sessions() as session:
            session.add(
                AuthSession(
                    kind=SessionKind.TENANT_CLIENT,
                    client_id=at_alpha.id,
                    organization_id=None,  # the state being refused
                    token_hash=uuid4().hex,
                    expires_at=expires,
                )
            )
            await session.commit()


@pytest.mark.asyncio
async def test_a_platform_session_may_not_claim_a_tenant(
    sessions: async_sessionmaker[AsyncSession],
    two_tenants: tuple[Organization, Organization],
) -> None:
    """The other half of the same constraint, which is easy to leave out.

    A platform session carrying an organization would look like a scoped
    session to any code that only checks `organization_id is not None`.
    """
    alpha, _ = two_tenants
    expires = datetime.now(UTC) + timedelta(hours=1)

    with pytest.raises(IntegrityError):
        async with sessions() as session:
            session.add(
                AuthSession(
                    kind=SessionKind.PLATFORM,
                    user_id=None,
                    organization_id=alpha.id,
                    token_hash=uuid4().hex,
                    expires_at=expires,
                )
            )
            await session.commit()
