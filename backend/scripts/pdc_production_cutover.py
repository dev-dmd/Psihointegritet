"""The AUTH-6 production cutover, as one ordered operation (D-083, D-084).

# Why this exists as a script and not as a runbook

Every step below already has a command. What none of them has is the *order*
and the *exact identifiers*, and both are places where a correct command does
the wrong thing:

- Sanja has **two** Clerk subjects in `sanja-production`. `user_3IxNmbl…` is
  superseded — its memberships are `disabled` — and `user_3Iy2Vp5B…` is the
  live one. Provisioning the first produces an account with no roles that looks
  fine until she signs in and reaches nothing.
- `drazic.milan@gmail.com` is, right now, **the only account on production that
  can sign in**. Deleting it before `milan.drazic@dmdevelon.website` holds a
  usable link locks every human out of the platform. So step 5 refuses to run
  unless step 3 has just printed one.

Typing those wrong is a bad afternoon; this file is the reason it cannot happen.

# Where to run it

Inside the deployed container, where `DATABASE_URL` is already the production
database and no credential leaves Railway:

    railway ssh --environment production --service diligent-serenity -- \\
        python scripts/pdc_production_cutover.py
    railway ssh --environment production --service diligent-serenity -- \\
        python scripts/pdc_production_cutover.py --apply

It reads whatever `DATABASE_URL` the environment gives it, so it also runs from
a laptop against `DATABASE_PUBLIC_URL`. It does **not** name an environment
itself — a script that could pick its own target is a script that can pick the
wrong one.

Dry run is the default and rolls everything back. `--apply` commits.

# What it prints

Two links, once, on stdout. Each is a credential for as long as it is unspent:
whoever holds one sets that account's password. Hand them over and close the
terminal. Nothing here is logged.

> **Re-running with `--apply` invalidates the links the previous run printed.**
> Activation deliberately spends every outstanding token for the account, so
> that two live links for one person cannot exist in two different mailboxes.
> That is the right behaviour and it is also a trap: if the links have already
> been handed over, a second `--apply` silently breaks them. Everything else
> here is idempotent — the organization, the memberships and the deletion all
> report "already" and change nothing.
"""

import argparse
import asyncio
import sys

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from psihointegritet.core.config import get_settings
from psihointegritet.db.session import create_engine, create_session_factory
from psihointegritet.modules.identity.auth.activation import (
    ActivationError,
    PlatformActivationService,
)
from psihointegritet.modules.identity.auth.platform_accounts import PlatformAuthService
from psihointegritet.modules.identity.models import InternalUser, MembershipRole
from psihointegritet.modules.identity.provisioning import (
    ProvisioningError,
    StaffProvisioningRequest,
    provision_staff,
    revoke_staff,
)
from psihointegritet.modules.organizations.provisioning import (
    OrganizationProvisioningError,
    OrganizationProvisioningRequest,
    provision_organization,
)

DEFAULT_BASE_URL = "https://p-digital-center.com"

#: Sanja's **live** subject, read from `sanja-production` on 2026-09-09: the one
#: whose `sanja-neuer` memberships are active. Written down rather than passed
#: as an argument precisely because the other one is one keystroke away.
SANJA_SUBJECT = "user_3Iy2Vp5BNrUCDKyXB3ZxkNPYZHt"
SANJA_EMAIL = "sanjaneuer@gmail.com"
SANJA_NAME = "Sanja Neuer"
SANJA_SLUG = "sanja-neuer"

OPERATOR_EMAIL = "milan.drazic@dmdevelon.website"
FOUNDING_SLUG = "psihointegritet"

#: Retired by D-084, then re-created 2026-09-08 by self-registration through
#: `/registracija` — which is why the `pdc:` prefix is here and no Clerk id is.
RETIRED_SUBJECT = "pdc:182865b8-26fa-4907-a398-a3cf0ada8a3f"
RETIRED_EMAIL = "drazic.milan@gmail.com"


def _link(base_url: str, token: str) -> str:
    return f"{base_url.rstrip('/')}/nova-lozinka?token={token}"


def _link_line(base_url: str, token: str, *, apply: bool) -> str:
    """The link, or a placeholder.

    A dry run must not print one. The token it would show is already written to
    `auth_tokens`, and the rollback that follows takes the row away — so the
    link would be real-looking, unusable, and indistinguishable from the one
    that matters.
    """
    if not apply:
        return "(printed only with --apply)"
    return _link(base_url, token)


async def _survey(db: AsyncSession, heading: str) -> None:
    rows = await PlatformActivationService().survey(db)
    ready = sum(1 for row in rows if row.can_sign_in)
    print(f"\n── {heading}: {len(rows)} identities · {ready} can sign in")
    for row in sorted(rows, key=lambda r: r.email or "￿"):
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
        print(f"   {state:<20} {(row.email or '-'):<40}{star}{row.external_auth_id}")


async def run(args: argparse.Namespace) -> int:
    settings = get_settings()
    engine = create_engine(settings)
    factory = create_session_factory(engine)
    mode = "APPLYING" if args.apply else "DRY RUN (nothing is written)"

    try:
        async with factory() as db:
            print(f"database    : {engine.url.host}:{engine.url.port}/{engine.url.database}")
            print(f"environment : {settings.environment.value}")
            print(f"mode        : {mode}")
            await _survey(db, "before")

            # ── 1. The organization has to exist before anybody can be a member.
            print(f"\n[1] organization '{SANJA_SLUG}'")
            try:
                organization = await provision_organization(
                    db,
                    OrganizationProvisioningRequest(
                        slug=SANJA_SLUG,
                        display_name=SANJA_NAME,
                        ui_locale="sr-Latn",
                        default_content_locale="sr-Latn",
                    ),
                )
            except OrganizationProvisioningError as error:
                print(f"    REFUSED: {error}", file=sys.stderr)
                return 1
            print(
                f"    {'created' if organization.created else 'already present'}"
                f" [{organization.organization_id}]"
            )

            # ── 2. Sanja. The row already exists on production — `/api/v1/me`
            # created it on her first visit, without an address — so this fills
            # in the email and adds the memberships rather than inserting.
            print(f"\n[2] staff {SANJA_EMAIL} in '{SANJA_SLUG}'")
            try:
                staff = await provision_staff(
                    db,
                    StaffProvisioningRequest(
                        organization_slug=SANJA_SLUG,
                        external_auth_id=SANJA_SUBJECT,
                        email=SANJA_EMAIL,
                        display_name=SANJA_NAME,
                        roles=frozenset({MembershipRole.ORG_ADMIN, MembershipRole.THERAPIST}),
                    ),
                )
            except ProvisioningError as error:
                print(f"    REFUSED: {error}", file=sys.stderr)
                return 1
            print(
                f"    user {staff.user_id} · created={staff.created_user}"
                f" · roles added={sorted(r.value for r in staff.roles_added) or '—'}"
                f" · email updated={staff.email_updated}"
            )

            # ── 3. The operator's own way in, BEFORE anything is deleted.
            #
            # Reset first, activation as the fallback, because the account can
            # legitimately be in either state: it holds a credential on
            # production ("link sent, unused") and none at all on a fresh
            # database. Both end with a link that sets a password, so the step
            # succeeds either way — and if neither works, nothing below runs.
            print(f"\n[3] link for {OPERATOR_EMAIL}")
            operator_token = await PlatformAuthService().issue_password_reset(
                db, email=OPERATOR_EMAIL
            )
            if operator_token is None:
                operator = await db.scalar(
                    select(InternalUser).where(InternalUser.email == OPERATOR_EMAIL)
                )
                if operator is None:
                    print(
                        f"    REFUSED: no identity for {OPERATOR_EMAIL}. Step 5 "
                        "will not run without one — that account is the only way "
                        "back in once the retired one is gone.",
                        file=sys.stderr,
                    )
                    return 1
                try:
                    operator_token = (
                        await PlatformActivationService().activate(db, operator)
                    ).token
                except ActivationError as error:
                    print(f"    REFUSED: {error}", file=sys.stderr)
                    return 1
                print("    (no credential yet — activated)")
            print(f"    {_link_line(args.base_url, operator_token, apply=args.apply)}")

            # ── 4. Sanja's activation link.
            print(f"\n[4] activation link for {SANJA_EMAIL}")
            user = await db.scalar(
                select(InternalUser).where(InternalUser.external_auth_id == SANJA_SUBJECT)
            )
            if user is None:
                print("    REFUSED: identity vanished between steps.", file=sys.stderr)
                return 1
            try:
                outcome = await PlatformActivationService().activate(db, user)
            except ActivationError as error:
                print(f"    REFUSED: {error}", file=sys.stderr)
                return 1
            note = "new credential" if outcome.credential_created else "credential existed"
            if not outcome.awaiting_password:
                note += ", ALREADY HAS A PASSWORD — this link would replace it"
            print(f"    ({note})")
            print(f"    {_link_line(args.base_url, outcome.token, apply=args.apply)}")

            # ── 5. Only now, with two live links in hand.
            print(f"\n[5] delete {RETIRED_EMAIL} (D-084)")
            removal = await revoke_staff(db, SANJA_SLUG, RETIRED_SUBJECT, hard_delete=True)
            if not removal.found:
                print("    absent already — nothing to delete")
            else:
                print(
                    "    deleted; platform_credentials, auth_sessions and "
                    "auth_tokens cascade with it"
                )

            await _survey(db, "after")

            if args.apply:
                await db.commit()
                print("\ncommitted.")
            else:
                await db.rollback()
                print("\ndry run: rolled back. Re-run with --apply to keep it.")
        return 0
    finally:
        await engine.dispose()


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--apply",
        action="store_true",
        help="commit, and print the two links. Without it nothing is written.",
    )
    parser.add_argument("--base-url", default=DEFAULT_BASE_URL)
    return asyncio.run(run(parser.parse_args()))


if __name__ == "__main__":
    raise SystemExit(main())
