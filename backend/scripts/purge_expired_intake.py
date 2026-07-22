"""Delete expired Intake data; run from the platform scheduler.

Usage: uv run python scripts/purge_expired_intake.py
"""

import asyncio

from psihointegritet.core.config import get_settings
from psihointegritet.core.logging import configure_logging, get_logger
from psihointegritet.db.session import create_engine, create_session_factory
from psihointegritet.modules.guidance.service import GuidanceService


async def purge_expired_intake() -> None:
    settings = get_settings()
    configure_logging(settings)
    engine = create_engine(settings)
    session_factory = create_session_factory(engine)
    try:
        async with session_factory() as session:
            count = await GuidanceService(session, settings).purge_expired_data()
        get_logger(__name__).info("intake_retention_purge_completed", deleted_cases=count)
    finally:
        await engine.dispose()


if __name__ == "__main__":
    asyncio.run(purge_expired_intake())
