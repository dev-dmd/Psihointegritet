"""CLI worker for dispatching pending email notifications.

Run periodically via cron / QStash / scheduled job:

    python scripts/dispatch_emails.py

Exit codes:
    0 — success (including when there are no pending records)
    1 — configuration error
    2 — one or more sends failed
"""

from __future__ import annotations

import asyncio
import os
import sys

from psihointegritet.core.config import Settings
from psihointegritet.db.session import create_engine, create_session_factory
from psihointegritet.infrastructure.email.dispatcher import dispatch_pending
from psihointegritet.infrastructure.email.resend_client import ResendClient


async def main() -> int:
    settings = Settings()  # Reads DATABASE_URL etc. from env
    if not settings.database_url:
        print("❌ DATABASE_URL is not set", file=sys.stderr)
        return 1

    api_key = os.getenv("RESEND_API_KEY", "")
    if not api_key:
        print("❌ RESEND_API_KEY is not set", file=sys.stderr)
        return 1

    from_addr = os.getenv("EMAIL_FROM", "review@psihointegritet.com")
    print(f"📧 Sender: {from_addr}")

    engine = create_engine(settings)
    session_factory = create_session_factory(engine)
    client = ResendClient(api_key)

    try:
        async with session_factory() as session:
            count = await dispatch_pending(client, session)
            print(f"✅ Dispatched {count} email(s)")
            return 0
    except Exception as exc:
        print(f"❌ Error dispatching: {exc}", file=sys.stderr)
        return 2
    finally:
        await engine.dispose()


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
