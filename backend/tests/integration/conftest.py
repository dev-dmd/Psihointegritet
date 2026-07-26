"""Database fixtures for integration tests (rules §22: real PostgreSQL).

Each test runs inside a transaction that is rolled back afterwards, so it sees
the migrated schema exactly as a deployment produces it and leaves no rows
behind. Nothing here calls `create_all`: testing against the schema the
migrations actually build is the point, because a model/migration mismatch is
precisely the class of defect that reached staging once already.

The suite skips when no database is reachable, so `pytest` stays fast and
green on a machine without the compose stack. A skip is visible in the output;
silently passing without touching a database would not be.
"""

import os
from collections.abc import AsyncIterator

import pytest
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import AsyncConnection, AsyncSession, create_async_engine

DEFAULT_TEST_DATABASE_URL = (
    "postgresql+asyncpg://psihointegritet:local_only_change_me@localhost:5434/psihointegritet"
)


def test_database_url() -> str:
    return os.environ.get("TEST_DATABASE_URL", DEFAULT_TEST_DATABASE_URL)


@pytest.fixture
async def connection() -> AsyncIterator[AsyncConnection]:
    engine = create_async_engine(test_database_url())
    try:
        opened = await engine.connect()
    except (SQLAlchemyError, OSError) as error:
        await engine.dispose()
        pytest.skip(f"No test database reachable ({type(error).__name__}). Start compose.")
    transaction = await opened.begin()
    try:
        yield opened
    finally:
        await transaction.rollback()
        await opened.close()
        await engine.dispose()


@pytest.fixture
async def db_session(connection: AsyncConnection) -> AsyncIterator[AsyncSession]:
    """A session joined to the rolled-back outer transaction.

    `commit()` inside a test therefore ends the inner transaction without
    persisting anything, which lets a use case own its own commit exactly as
    it does in production.
    """
    async with AsyncSession(
        bind=connection,
        expire_on_commit=False,
        join_transaction_mode="create_savepoint",
    ) as session:
        yield session
