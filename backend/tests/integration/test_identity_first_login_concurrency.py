"""True-concurrency integration test for first-login identity provisioning.

`db_session` (conftest.py) joins every call to one shared transaction, which is
exactly wrong here: two requests racing to register the same subject need two
independent connections with their own real commits, or there is nothing to
race. So this file builds its own engine and cleans up after itself, following
`test_booking_concurrency.py`.

**This reproduces a production incident.** Two parallel `GET /api/v1/me` calls
for one newly signed-in person returned 200 and 500, the 500 being

    UniqueViolationError: duplicate key value violates unique constraint
    "uq_internal_users_external_auth_id"

because `ensure_internal_user()` did SELECT, saw nothing, and INSERTed — twice.
The frontend asks every production backend for the identity in parallel, so one
backend's 500 failed the whole sign-in and the owner reached an error boundary
with a valid session.

Requires real PostgreSQL: the fix is `INSERT ... ON CONFLICT DO NOTHING`, and
the defect it closes is a unique-constraint violation. Neither means anything
without the constraint that raises it.
"""

import asyncio
from collections.abc import AsyncIterator, Callable, Iterator
from typing import Any
from uuid import uuid4

import pytest
from sqlalchemy import delete, func, select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from psihointegritet.infrastructure.auth.identity import IdentityClaims
from psihointegritet.modules.identity.models import InternalUser, OrganizationMembership
from psihointegritet.modules.identity.router import ensure_internal_user
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


class _RaceSession(AsyncSession):
    """A session that holds every caller at the point where the race happens.

    Left to the event loop, `asyncio.gather` is free to run one request to
    completion before the other starts its `SELECT` — which is why a plain
    parallel test passes against the broken code and proves nothing. The
    barrier makes the interleaving the incident actually had the only one
    possible: **both callers observe "no such user" before either inserts.**

    It waits only when the lookup came back empty, so a returning login never
    blocks, and it is a test-only subclass — production code is untouched.
    """

    barrier: asyncio.Barrier | None = None

    # `AsyncSession.scalar` is heavily overloaded; a passthrough cannot restate
    # those overloads, so the forwarded arguments are deliberately `Any`. The
    # only behaviour added is the rendezvous below.
    async def scalar(self, *args: Any, **kwargs: Any) -> Any:
        result: Any = await super().scalar(*args, **kwargs)
        if _RaceSession.barrier is not None and result is None:
            await _RaceSession.barrier.wait()
        return result


#: Builds a session factory whose sessions rendezvous, for `parties` callers.
RacingFactory = Callable[[int], async_sessionmaker[AsyncSession]]


@pytest.fixture
def session_factory(engine: AsyncEngine) -> async_sessionmaker[AsyncSession]:
    return async_sessionmaker(engine, expire_on_commit=False)


@pytest.fixture
def racing_session_factory(engine: AsyncEngine) -> Iterator[RacingFactory]:
    """Builds a factory whose sessions all rendezvous at the existence check."""

    def factory(parties: int) -> async_sessionmaker[AsyncSession]:
        _RaceSession.barrier = asyncio.Barrier(parties)
        return async_sessionmaker(engine, expire_on_commit=False, class_=_RaceSession)

    yield factory
    _RaceSession.barrier = None


async def _cleanup(session_factory: async_sessionmaker[AsyncSession], subject: str) -> None:
    async with session_factory() as session:
        rows = list(
            await session.scalars(
                select(InternalUser).where(InternalUser.external_auth_id == subject)
            )
        )
        for user in rows:
            await session.execute(
                delete(OrganizationMembership).where(OrganizationMembership.user_id == user.id)
            )
        await session.execute(delete(InternalUser).where(InternalUser.external_auth_id == subject))
        await session.commit()


async def _register(
    session_factory: async_sessionmaker[AsyncSession], identity: IdentityClaims
) -> str | None:
    """One `/api/v1/me` request's worth of work: provision, then commit."""
    async with session_factory() as session:
        user = await ensure_internal_user(session, identity)
        email = user.email
        await session.commit()
        return email


@pytest.mark.asyncio
async def test_parallel_first_logins_register_one_user(
    session_factory: async_sessionmaker[AsyncSession],
    racing_session_factory: RacingFactory,
) -> None:
    subject = f"user_test_{uuid4().hex}"
    identity = IdentityClaims(subject=subject, email="maria@example.com", session_id=None)
    racing = racing_session_factory(2)

    try:
        # Both requests start with no row to find — the exact interleaving that
        # produced the 500 in production. `gather` raises if either fails, which
        # is the assertion: two 200s, not a 200 and a 500.
        emails = await asyncio.gather(
            _register(racing, identity),
            _register(racing, identity),
        )
        assert emails == ["maria@example.com", "maria@example.com"]

        async with session_factory() as session:
            count = await session.scalar(
                select(func.count())
                .select_from(InternalUser)
                .where(InternalUser.external_auth_id == subject)
            )
            assert count == 1, "the unique constraint must still admit exactly one row"

            user = await session.scalar(
                select(InternalUser).where(InternalUser.external_auth_id == subject)
            )
            assert user is not None
            assert user.external_auth_id == subject
            assert user.email == "maria@example.com"
            assert user.is_superadmin is False
            assert user.is_active is True

            # Registering a verified person must never hand out a privilege.
            memberships = list(
                await session.scalars(
                    select(OrganizationMembership).where(OrganizationMembership.user_id == user.id)
                )
            )
            assert memberships == []
    finally:
        await _cleanup(session_factory, subject)


@pytest.mark.asyncio
async def test_many_parallel_first_logins_still_register_one_user(
    session_factory: async_sessionmaker[AsyncSession],
    racing_session_factory: RacingFactory,
) -> None:
    """Two requests is the reported incident; the race is not limited to two."""
    subject = f"user_test_{uuid4().hex}"
    identity = IdentityClaims(subject=subject, email="owner@example.com", session_id=None)
    racing = racing_session_factory(8)

    try:
        await asyncio.gather(*(_register(racing, identity) for _ in range(8)))

        async with session_factory() as session:
            count = await session.scalar(
                select(func.count())
                .select_from(InternalUser)
                .where(InternalUser.external_auth_id == subject)
            )
            assert count == 1
    finally:
        await _cleanup(session_factory, subject)


@pytest.mark.asyncio
async def test_returning_login_updates_a_changed_email(
    session_factory: async_sessionmaker[AsyncSession],
) -> None:
    """The existing semantics must survive the fix, including under a race."""
    subject = f"user_test_{uuid4().hex}"

    try:
        await _register(
            session_factory,
            IdentityClaims(subject=subject, email="old@example.com", session_id=None),
        )
        await _register(
            session_factory,
            IdentityClaims(subject=subject, email="new@example.com", session_id=None),
        )

        async with session_factory() as session:
            user = await session.scalar(
                select(InternalUser).where(InternalUser.external_auth_id == subject)
            )
            assert user is not None
            assert user.email == "new@example.com"

        # A verified identity with no email must not wipe the one we hold.
        await _register(
            session_factory,
            IdentityClaims(subject=subject, email=None, session_id=None),
        )
        async with session_factory() as session:
            user = await session.scalar(
                select(InternalUser).where(InternalUser.external_auth_id == subject)
            )
            assert user is not None
            assert user.email == "new@example.com"
    finally:
        await _cleanup(session_factory, subject)
