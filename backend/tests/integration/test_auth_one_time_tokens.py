"""One-time tokens, and the race that decides whether they are one-time at all.

A reset link that can be spent twice is an account takeover replayed out of a
mailbox, so the interesting test here is not that `consume` works — it is that
two callers doing it at the same instant cannot both win.
"""

import asyncio
from collections.abc import AsyncIterator, Callable, Iterator
from datetime import UTC, datetime, timedelta
from typing import Any
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

from psihointegritet.modules.identity.auth.one_time_tokens import OneTimeTokenService
from psihointegritet.modules.identity.auth.policy import AuthPolicy
from psihointegritet.modules.identity.auth.secrets import hash_token
from psihointegritet.modules.identity.auth_models import (
    AuthToken,
    TenantClient,
    TokenPurpose,
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
        await session.execute(delete(AuthToken).where(AuthToken.user_id == user.id))
        await session.execute(delete(AuthToken).where(AuthToken.client_id == client.id))
        await session.execute(delete(TenantClient).where(TenantClient.id == client.id))
        await session.execute(delete(InternalUser).where(InternalUser.id == user.id))
        await session.execute(delete(Organization).where(Organization.id.in_([alpha.id, beta.id])))
        await session.commit()


class _RaceSession(AsyncSession):
    """Holds every caller at the moment *after* it has read the token row.

    Without this the test proves nothing: `asyncio.gather` is free to run one
    consume to completion before the other starts, so a naive read-then-write
    passes just as happily as an atomic one. Verified by installing a naive
    implementation — it passed until this barrier existed, and fails with it.

    The barrier waits only when a `SELECT` actually found something, so it fires
    exactly in the read-then-write window. An implementation that never reads
    before writing — the real one, a conditional `UPDATE ... RETURNING` — never
    reaches it, which is the point.
    """

    barrier: asyncio.Barrier | None = None

    async def scalar(self, *args: Any, **kwargs: Any) -> Any:
        result: Any = await super().scalar(*args, **kwargs)
        if _RaceSession.barrier is not None and result is not None:
            await _RaceSession.barrier.wait()
        return result


@pytest.fixture
def racing_sessions(engine: AsyncEngine) -> Iterator[RacingFactory]:
    def factory(parties: int) -> async_sessionmaker[AsyncSession]:
        _RaceSession.barrier = asyncio.Barrier(parties)
        return async_sessionmaker(engine, expire_on_commit=False, class_=_RaceSession)

    yield factory
    _RaceSession.barrier = None


#: Builds a session factory whose sessions rendezvous, for `parties` callers.
RacingFactory = Callable[[int], async_sessionmaker[AsyncSession]]


def _service() -> OneTimeTokenService:
    return OneTimeTokenService(AuthPolicy())


@pytest.mark.asyncio
async def test_a_token_is_spent_once_and_only_once(
    sessions: async_sessionmaker[AsyncSession],
    world: tuple[Organization, Organization, TenantClient, InternalUser],
) -> None:
    _, _, _, user = world
    service = _service()

    async with sessions() as session:
        issued = await service.issue_for_user(
            session, purpose=TokenPurpose.PASSWORD_RESET, user_id=user.id
        )
        await session.commit()

    async with sessions() as session:
        first = await service.consume(session, issued.token, purpose=TokenPurpose.PASSWORD_RESET)
        await session.commit()
        assert first is not None
        assert first.user_id == user.id

    async with sessions() as session:
        again = await service.consume(session, issued.token, purpose=TokenPurpose.PASSWORD_RESET)
        assert again is None


@pytest.mark.asyncio
async def test_two_parallel_consumers_cannot_both_win(
    sessions: async_sessionmaker[AsyncSession],
    racing_sessions: RacingFactory,
    world: tuple[Organization, Organization, TenantClient, InternalUser],
) -> None:
    """The race, run for real on two connections.

    Read-then-write would let both sides see `consumed_at IS NULL` and both
    proceed. The conditional `UPDATE ... RETURNING` cannot: PostgreSQL
    serialises the row, and the second writer re-checks the predicate against
    the committed row and matches nothing.
    """
    _, _, _, user = world
    service = _service()

    async with sessions() as session:
        issued = await service.issue_for_user(
            session, purpose=TokenPurpose.PASSWORD_RESET, user_id=user.id
        )
        await session.commit()

    racing = racing_sessions(2)

    async def attempt() -> bool:
        async with racing() as session:
            spent = await service.consume(
                session, issued.token, purpose=TokenPurpose.PASSWORD_RESET
            )
            await session.commit()
            return spent is not None

    outcomes = await asyncio.gather(attempt(), attempt())
    assert sorted(outcomes) == [False, True], "exactly one caller may spend a single-use token"


@pytest.mark.asyncio
async def test_many_parallel_consumers_still_yield_one_winner(
    sessions: async_sessionmaker[AsyncSession],
    racing_sessions: RacingFactory,
    world: tuple[Organization, Organization, TenantClient, InternalUser],
) -> None:
    """Two is the reported shape; the guarantee is not limited to two."""
    _, _, _, user = world
    service = _service()

    async with sessions() as session:
        issued = await service.issue_for_user(
            session, purpose=TokenPurpose.EMAIL_VERIFICATION, user_id=user.id
        )
        await session.commit()

    racing = racing_sessions(8)

    async def attempt() -> bool:
        async with racing() as session:
            spent = await service.consume(
                session, issued.token, purpose=TokenPurpose.EMAIL_VERIFICATION
            )
            await session.commit()
            return spent is not None

    outcomes = await asyncio.gather(*(attempt() for _ in range(8)))
    assert sum(outcomes) == 1


@pytest.mark.asyncio
async def test_an_expired_token_is_neither_accepted_nor_spent(
    sessions: async_sessionmaker[AsyncSession],
    world: tuple[Organization, Organization, TenantClient, InternalUser],
) -> None:
    """Expiry is in the predicate, so a stale link cannot even be burned."""
    _, _, _, user = world
    service = _service()

    async with sessions() as session:
        issued = await service.issue_for_user(
            session, purpose=TokenPurpose.PASSWORD_RESET, user_id=user.id
        )
        await session.execute(
            update(AuthToken)
            .where(AuthToken.id == issued.token_id)
            .values(expires_at=datetime.now(UTC) - timedelta(seconds=1))
        )
        await session.commit()

    async with sessions() as session:
        assert (
            await service.consume(session, issued.token, purpose=TokenPurpose.PASSWORD_RESET)
            is None
        )
        row = await session.get(AuthToken, issued.token_id)
        assert row is not None
        assert row.consumed_at is None


@pytest.mark.asyncio
async def test_a_token_will_not_serve_another_purpose(
    sessions: async_sessionmaker[AsyncSession],
    world: tuple[Organization, Organization, TenantClient, InternalUser],
) -> None:
    """A verification link must not double as a password reset."""
    _, _, _, user = world
    service = _service()

    async with sessions() as session:
        issued = await service.issue_for_user(
            session, purpose=TokenPurpose.EMAIL_VERIFICATION, user_id=user.id
        )
        await session.commit()

    async with sessions() as session:
        assert (
            await service.consume(session, issued.token, purpose=TokenPurpose.PASSWORD_RESET)
            is None
        )


@pytest.mark.asyncio
async def test_a_client_token_will_not_consume_under_another_tenant(
    sessions: async_sessionmaker[AsyncSession],
    world: tuple[Organization, Organization, TenantClient, InternalUser],
) -> None:
    alpha, beta, client, _ = world
    service = _service()

    async with sessions() as session:
        issued = await service.issue_for_client(
            session,
            purpose=TokenPurpose.PASSWORD_RESET,
            client_id=client.id,
            organization_id=alpha.id,
        )
        await session.commit()

    async with sessions() as session:
        assert (
            await service.consume(
                session,
                issued.token,
                purpose=TokenPurpose.PASSWORD_RESET,
                organization_id=beta.id,
            )
            is None
        )
        await session.commit()

    async with sessions() as session:
        assert await service.consume(
            session,
            issued.token,
            purpose=TokenPurpose.PASSWORD_RESET,
            organization_id=alpha.id,
        )


@pytest.mark.asyncio
async def test_unknown_and_malformed_tokens_answer_the_same_way(
    sessions: async_sessionmaker[AsyncSession],
) -> None:
    service = _service()
    async with sessions() as session:
        for candidate in ("", "not-a-token", "../../etc/passwd", "\x00", "a" * 5000):
            assert (
                await service.consume(session, candidate, purpose=TokenPurpose.PASSWORD_RESET)
                is None
            )


@pytest.mark.asyncio
async def test_the_plaintext_token_is_never_stored(
    sessions: async_sessionmaker[AsyncSession],
    world: tuple[Organization, Organization, TenantClient, InternalUser],
) -> None:
    _, _, _, user = world
    service = _service()

    async with sessions() as session:
        issued = await service.issue_for_user(
            session, purpose=TokenPurpose.PASSWORD_RESET, user_id=user.id
        )
        await session.commit()

    async with sessions() as session:
        row = await session.get(AuthToken, issued.token_id)
        assert row is not None
        assert row.token_hash != issued.token
        assert row.token_hash == hash_token(issued.token)


@pytest.mark.asyncio
async def test_completing_a_reset_invalidates_the_older_links(
    sessions: async_sessionmaker[AsyncSession],
    world: tuple[Organization, Organization, TenantClient, InternalUser],
) -> None:
    """Two 'forgot password' clicks leave two live links; finishing kills both."""
    _, _, _, user = world
    service = _service()

    async with sessions() as session:
        first = await service.issue_for_user(
            session, purpose=TokenPurpose.PASSWORD_RESET, user_id=user.id
        )
        second = await service.issue_for_user(
            session, purpose=TokenPurpose.PASSWORD_RESET, user_id=user.id
        )
        verification = await service.issue_for_user(
            session, purpose=TokenPurpose.EMAIL_VERIFICATION, user_id=user.id
        )
        await session.commit()

    async with sessions() as session:
        assert await service.consume(session, second.token, purpose=TokenPurpose.PASSWORD_RESET)
        assert (
            await service.invalidate_outstanding(
                session, purpose=TokenPurpose.PASSWORD_RESET, user_id=user.id
            )
            == 1
        )
        await session.commit()

    async with sessions() as session:
        assert (
            await service.consume(session, first.token, purpose=TokenPurpose.PASSWORD_RESET) is None
        )
        # A different purpose is untouched — finishing a reset must not
        # invalidate a pending email verification.
        assert await service.consume(
            session, verification.token, purpose=TokenPurpose.EMAIL_VERIFICATION
        )
