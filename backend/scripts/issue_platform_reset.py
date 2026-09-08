"""Issue a password-reset (or first-time activation) link for a platform account.

There is no mailer yet, and the two shortcuts around that are both unacceptable:
returning the token from an HTTP route makes account takeover a matter of naming
an address, and logging it puts a live credential in whatever ships the logs. So
the token is printed here, on an operator's terminal, once.

    python scripts/issue_platform_reset.py milan@example.com

The same command covers AUTH-5 activation. An account migrated off Clerk has
`password_hash = NULL` — it exists, holds its memberships, and cannot be signed
into. The link below is how its owner sets a password for the first time, which
is why activation needs no separate token kind: setting the first password and
replacing a forgotten one are the same operation.
"""

import argparse
import asyncio
import sys

from sqlalchemy.ext.asyncio import async_sessionmaker

from psihointegritet.core.config import get_settings
from psihointegritet.db.session import create_engine, create_session_factory
from psihointegritet.modules.identity.auth.platform_accounts import PlatformAuthService


async def issue(email: str, base_url: str) -> int:
    settings = get_settings()
    engine = create_engine(settings)
    factory: async_sessionmaker = create_session_factory(engine)
    try:
        async with factory() as session:
            token = await PlatformAuthService().issue_password_reset(session, email=email)
            if token is None:
                # Said plainly here, unlike over HTTP: an operator running this
                # against their own database is not an attacker enumerating it.
                print(f"No platform account for {email}.", file=sys.stderr)
                return 1
            await session.commit()
    finally:
        await engine.dispose()

    print(f"{base_url.rstrip('/')}/nova-lozinka?token={token}")
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("email")
    parser.add_argument(
        "--base-url",
        default="https://p-digital-center.com",
        help="Platform origin the link should point at.",
    )
    arguments = parser.parse_args()
    return asyncio.run(issue(arguments.email, arguments.base_url))


if __name__ == "__main__":
    raise SystemExit(main())
