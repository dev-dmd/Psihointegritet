"""Platform sign-in accounts: who has one, and handing out the links (AUTH-5).

# Why a command and not a route

Two reasons, and the second is the one that matters.

A route that issues a password link is a route that takes over any account by
naming its address, unless something first proves the caller owns the mailbox.
Nothing delivers mail yet, so there is nothing to prove it with. Printing the
link on an operator's terminal keeps the capability where the trust already is.

And the link is never logged. It is a credential for as long as it is unspent —
whoever holds it sets the password. It appears once, in this output, and the
right thing to do with it is hand it over and close the terminal.

# The two operations

**Activation** prepares an account that has never had a password of its own —
every identity carried over from Clerk (D-083). It writes a
`platform_credentials` row with `password_hash = NULL` and issues a link valid
for a week. `internal_users.id`, `external_auth_id`, memberships and every row
that points at them are untouched: the credential changes, the business identity
does not.

**Reset** issues the ordinary one-hour link for somebody who already has a
password and has forgotten it — or whose account an attacker has thrown into
lockout, since spending a reset link clears it.

Both land on `/nova-lozinka`, because they are the same operation seen from
different sides.

# Usage

    python scripts/platform_accounts.py --list
    python scripts/platform_accounts.py --activate --person maria --dry-run
    python scripts/platform_accounts.py --activate --person maria
    python scripts/platform_accounts.py --activate --email sanjaneuer@gmail.com
    python scripts/platform_accounts.py --activate --all
    python scripts/platform_accounts.py --reset --email drazic.milan@gmail.com

Inside a deployed container there is no `uv`; the built virtualenv is already on
PATH, so drop the prefix:

    railway run -- python scripts/platform_accounts.py --list

Always try `--dry-run` first. It reports exactly what would change, prints no
link, and rolls back.
"""

import argparse
import asyncio
import sys
from collections.abc import Sequence

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from psihointegritet.core.config import get_settings
from psihointegritet.db.session import create_engine, create_session_factory
from psihointegritet.modules.identity.auth.activation import (
    AccountStatus,
    ActivationError,
    PlatformActivationService,
)
from psihointegritet.modules.identity.auth.platform_accounts import PlatformAuthService
from psihointegritet.modules.identity.models import InternalUser
from psihointegritet.modules.identity.roster import member

DEFAULT_BASE_URL = "https://p-digital-center.com"


def _link(base_url: str, token: str) -> str:
    return f"{base_url.rstrip('/')}/nova-lozinka?token={token}"


def _render(rows: Sequence[AccountStatus]) -> None:
    """The whole cutover as one table.

    Sorted so the accounts that still need something come first: reading this a
    name at a time is how the fifth person is forgotten.
    """

    def rank(row: AccountStatus) -> tuple[int, str]:
        if row.can_sign_in:
            return (2, row.email or "")
        if row.email:
            return (0, row.email)
        return (1, row.external_auth_id)

    ready = sum(1 for row in rows if row.can_sign_in)
    unusable = sum(1 for row in rows if row.email is None)
    print(f"{len(rows)} identities · {ready} can sign in · {unusable} have no address\n")
    print(f"{'state':<22} {'email':<42} {'roles':>5}  subject")
    print("-" * 100)
    for row in sorted(rows, key=rank):
        if not row.is_active:
            state = "deactivated"
        elif row.email is None:
            state = "no address"
        elif not row.has_credential:
            state = "needs activation"
        elif not row.has_password:
            state = "link sent, unused"
        else:
            state = "ready"
        star = "*" if row.is_superadmin else " "
        print(
            f"{state:<22} {(row.email or '-'):<42} "
            f"{row.membership_count:>5}{star} {row.external_auth_id}"
        )
    print("\n* platform superadmin (D-051)")


async def _find(session: AsyncSession, email: str) -> InternalUser | None:
    """By address, case-insensitively — `internal_users.email` is not normalised."""
    return await session.scalar(
        select(InternalUser).where(func.lower(InternalUser.email) == email.strip().lower())
    )


async def _activate(
    session: AsyncSession, users: Sequence[InternalUser], base_url: str, dry_run: bool
) -> int:
    service = PlatformActivationService()
    failures = 0
    for user in users:
        try:
            outcome = await service.activate(session, user)
        except ActivationError as error:
            print(f"  SKIP  {user.email or user.external_auth_id}: {error}", file=sys.stderr)
            failures += 1
            continue
        note = "new credential" if outcome.credential_created else "credential existed"
        if outcome.awaiting_password:
            note += ", no password yet"
        else:
            # Worth saying out loud: this person could already sign in, and the
            # link now offered would replace a password they chose themselves.
            note += ", ALREADY HAS A PASSWORD — this link would replace it"
        print(f"  {outcome.email}  ({note})")
        if not dry_run:
            print(f"    {_link(base_url, outcome.token)}")
    return failures


async def run(arguments: argparse.Namespace) -> int:
    engine = create_engine(get_settings())
    factory: async_sessionmaker[AsyncSession] = create_session_factory(engine)
    try:
        async with factory() as session:
            if arguments.list:
                _render(await PlatformActivationService().survey(session))
                return 0

            if arguments.reset:
                token = await PlatformAuthService().issue_password_reset(
                    session, email=arguments.email
                )
                if token is None:
                    print(f"No platform account for {arguments.email}.", file=sys.stderr)
                    return 1
                if arguments.dry_run:
                    print(f"would issue a reset link for {arguments.email}")
                    return 0
                await session.commit()
                print(_link(arguments.base_url, token))
                return 0

            users = await _targets(session, arguments)
            if not users:
                print("Nothing matched.", file=sys.stderr)
                return 1

            print(f"{'would activate' if arguments.dry_run else 'activating'} {len(users)}:")
            failures = await _activate(session, users, arguments.base_url, arguments.dry_run)
            if arguments.dry_run:
                await session.rollback()
            else:
                await session.commit()
            return 1 if failures else 0
    finally:
        await engine.dispose()


async def _targets(session: AsyncSession, arguments: argparse.Namespace) -> list[InternalUser]:
    if arguments.all:
        # Only accounts that could actually use a link. An identity with no
        # address cannot sign in whatever we do, and `--list` already names them.
        return list(
            await session.scalars(
                select(InternalUser)
                .where(InternalUser.email.is_not(None), InternalUser.is_active.is_(True))
                .order_by(InternalUser.created_at)
            )
        )

    email = arguments.email
    if arguments.person:
        known = member(arguments.person)
        if known is None:
            print(f"Unknown person '{arguments.person}'.", file=sys.stderr)
            return []
        # Through the roster so the address cannot be paired with the wrong
        # person by hand — the same reason `provision_staff.py` prefers it.
        email = known.email

    user = await _find(session, email) if email else None
    return [user] if user else []


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--list", action="store_true", help="show every identity and its state")
    parser.add_argument("--activate", action="store_true", help="prepare accounts and issue links")
    parser.add_argument("--reset", action="store_true", help="issue an ordinary reset link")
    parser.add_argument("--person", help="roster key, e.g. maria")
    parser.add_argument("--email")
    parser.add_argument("--all", action="store_true", help="every active identity with an address")
    parser.add_argument("--base-url", default=DEFAULT_BASE_URL)
    parser.add_argument("--dry-run", action="store_true")
    arguments = parser.parse_args()

    chosen = sum([arguments.list, arguments.activate, arguments.reset])
    if chosen != 1:
        parser.error("choose exactly one of --list, --activate, --reset")
    if arguments.reset and not arguments.email:
        parser.error("--reset needs --email")
    if arguments.activate and not (arguments.all or arguments.person or arguments.email):
        parser.error("--activate needs --all, --person or --email")

    return asyncio.run(run(arguments))


if __name__ == "__main__":
    raise SystemExit(main())
