"""CLI worker for dispatching pending email notifications.

Run periodically via cron / QStash / scheduled job:

    source .venv/bin/activate && python scripts/dispatch_emails.py

Reads ``.env.local`` explicitly because ``Settings`` only loads ``.env``.
"""

from __future__ import annotations

import asyncio
import os
import sys
from pathlib import Path

# Load .env.local explicitly before anything else touches the environment.
_ENV_LOCAL = Path(__file__).resolve().parent.parent / ".env.local"
if _ENV_LOCAL.exists():
    with open(_ENV_LOCAL) as fh:
        for line in fh:
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, _, value = line.partition("=")
            # Only set if not already in the environment (env var overrides file)
            if key.strip() not in os.environ:
                os.environ[key.strip()] = value.strip().strip("\"'")

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
