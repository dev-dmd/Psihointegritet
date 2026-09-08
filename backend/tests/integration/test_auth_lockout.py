"""Throttling: counting failures, locking, and letting a correct password out."""

from collections.abc import AsyncIterator
from datetime import UTC, datetime, timedelta
from uuid import UUID, uuid4

import pytest
from sqlalchemy import delete, update
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from psihointegritet.modules.identity.auth.lockout import LockoutService
from psihointegritet.modules.identity.auth.policy import AuthPolicy
from psihointegritet.modules.identity.auth_models import PlatformCredential
from psihointegritet.modules.identity.models import InternalUser
from tests.integration.conftest import test_database_url as _test_database_url

POLICY = AuthPolicy(max_failed_attempts=3, lockout_duration=timedelta(minutes=15))


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
async def account(
    sessions: async_sessionmaker[AsyncSession],
) -> AsyncIterator[InternalUser]:
    suffix = uuid4().hex[:8]
    user = InternalUser(external_auth_id=f"pdc:{suffix}", email=f"{suffix}@example.test")
    async with sessions() as session:
        session.add(user)
        await session.flush()
        session.add(
            PlatformCredential(
                user_id=user.id,
                normalized_email=f"{suffix}@example.test",
                password_hash="irrelevant-here",  # noqa: S106 - lockout is what is under test
            )
        )
        await session.commit()

    yield user

    async with sessions() as session:
        await session.execute(
            delete(PlatformCredential).where(PlatformCredential.user_id == user.id)
        )
        await session.execute(delete(InternalUser).where(InternalUser.id == user.id))
        await session.commit()


async def _credential(
    sessions: async_sessionmaker[AsyncSession], user_id: UUID
) -> PlatformCredential:
    async with sessions() as session:
        row = await session.get(PlatformCredential, user_id)
        assert row is not None
        return row


@pytest.mark.asyncio
async def test_failures_accumulate_and_lock_at_the_threshold(
    sessions: async_sessionmaker[AsyncSession], account: InternalUser
) -> None:
    service = LockoutService(POLICY)

    for _ in range(POLICY.max_failed_attempts - 1):
        async with sessions() as session:
            await service.record_failure(session, user_id=account.id)
            await session.commit()

    before = await _credential(sessions, account.id)
    assert before.failed_attempts == POLICY.max_failed_attempts - 1
    # Not locked yet: the budget is spent *at* the threshold, not before it.
    assert service.check(before).allowed

    async with sessions() as session:
        await service.record_failure(session, user_id=account.id)
        await session.commit()

    after = await _credential(sessions, account.id)
    assert after.failed_attempts == POLICY.max_failed_attempts
    verdict = service.check(after)
    assert not verdict.allowed
    assert verdict.retry_after is not None


@pytest.mark.asyncio
async def test_a_correct_password_clears_the_streak(
    sessions: async_sessionmaker[AsyncSession], account: InternalUser
) -> None:
    service = LockoutService(POLICY)

    for _ in range(POLICY.max_failed_attempts):
        async with sessions() as session:
            await service.record_failure(session, user_id=account.id)
            await session.commit()
    assert not service.check(await _credential(sessions, account.id)).allowed

    async with sessions() as session:
        await service.record_success(session, user_id=account.id)
        await session.commit()

    cleared = await _credential(sessions, account.id)
    assert cleared.failed_attempts == 0
    assert cleared.locked_until is None
    assert service.check(cleared).allowed


@pytest.mark.asyncio
async def test_a_lock_lifts_once_it_has_expired(
    sessions: async_sessionmaker[AsyncSession], account: InternalUser
) -> None:
    """A lockout is a delay, not a permanent ban — nobody should need support."""
    service = LockoutService(POLICY)

    async with sessions() as session:
        await session.execute(
            update(PlatformCredential)
            .where(PlatformCredential.user_id == account.id)
            .values(
                failed_attempts=POLICY.max_failed_attempts,
                locked_until=datetime.now(UTC) - timedelta(seconds=1),
            )
        )
        await session.commit()

    assert service.check(await _credential(sessions, account.id)).allowed


@pytest.mark.asyncio
async def test_an_unknown_account_is_not_refused_early(
    sessions: async_sessionmaker[AsyncSession],
) -> None:
    """Refusing before the password check would answer 'does this account exist'.

    The attempt fails anyway — at the same speed, with the same message — so
    nothing is disclosed by letting it run.
    """
    assert LockoutService(POLICY).check(None).allowed
