"""Provision a staff identity so the Control Center works in an environment.

Why a command and not an API route: the endpoint that creates the *first*
staff member cannot itself require staff membership, so it would need a
separate bootstrap secret — a permanent security surface for a one-time
operation. A command needs no new secret and leaves no reachable endpoint.

Why the Clerk user id and not just an email: the backend holds
`clerk_issuer`/`clerk_jwks_url`/`clerk_audience` but no `CLERK_SECRET_KEY`, so
it cannot ask the Clerk Admin API to resolve an address. Adding that key here
would put a highly privileged credential on a second service for one lookup.
Take the id from the Clerk dashboard, or from the frontend which already
resolves addresses:

    cd frontend && npm run roles:assign -- --dry-run

Usage, locally (uv provides the interpreter):

    uv run python scripts/provision_staff.py --list

    uv run python scripts/provision_staff.py \\
        --external-id user_2ab... \\
        --email marija.stamenkovic@psihointegritet.com \\
        --roles org_admin,therapist \\
        --therapist-slug marija-stamenkovic

Inside a deployed container there is no `uv` — the runtime stage only carries
the built virtualenv, which is already on PATH. Drop the `uv run` prefix:

    railway run -- python scripts/provision_staff.py --list

Always try `--dry-run` first; it reports the change and rolls back.

Roles are additive by default: a role the person already has and you did not
pass is reported but left active. Pass --replace-roles to disable those too.
"""

import argparse
import asyncio
import sys

from psihointegritet.core.config import get_settings
from psihointegritet.db.session import create_engine, create_session_factory
from psihointegritet.modules.identity.models import MembershipRole
from psihointegritet.modules.identity.provisioning import (
    ProvisioningError,
    StaffProvisioningRequest,
    list_staff,
    provision_staff,
)

DEFAULT_ORGANIZATION = "psihointegritet"


def parse_roles(raw: str) -> frozenset[MembershipRole]:
    roles: set[MembershipRole] = set()
    for part in raw.split(","):
        candidate = part.strip()
        if not candidate:
            continue
        try:
            roles.add(MembershipRole(candidate))
        except ValueError:
            allowed = ", ".join(role.value for role in MembershipRole)
            raise SystemExit(f"Unknown role '{candidate}'. Allowed: {allowed}") from None
    if not roles:
        raise SystemExit("At least one role is required.")
    return frozenset(roles)


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--organization", default=DEFAULT_ORGANIZATION)
    parser.add_argument("--list", action="store_true", help="show current staff and exit")
    parser.add_argument("--external-id", help="Clerk user id (the JWT `sub`)")
    parser.add_argument("--email", help="stored for display only; never used for authorization")
    parser.add_argument("--roles", help="comma separated: org_admin,therapist")
    parser.add_argument("--therapist-slug", help="link this matching profile to the user")
    parser.add_argument(
        "--replace-roles",
        action="store_true",
        help="disable active roles that were not passed in --roles",
    )
    parser.add_argument(
        "--dry-run", action="store_true", help="report the change without committing"
    )
    return parser


async def run(args: argparse.Namespace) -> int:
    settings = get_settings()
    engine = create_engine(settings)
    session_factory = create_session_factory(engine)

    try:
        async with session_factory() as session:
            if args.list:
                summaries = await list_staff(session, args.organization)
                if not summaries:
                    print(f"No staff provisioned in '{args.organization}'.")
                    print("The Control Center will report: Staff membership is not provisioned.")
                    return 0
                for summary in summaries:
                    roles = ", ".join(sorted(role.value for role in summary.roles)) or "none"
                    print(f"{summary.email or '(no email)'}  [{summary.external_auth_id}]")
                    print(f"  active roles : {roles}")
                    if summary.disabled_roles:
                        disabled = ", ".join(sorted(r.value for r in summary.disabled_roles))
                        print(f"  disabled     : {disabled}")
                    if summary.therapist_slugs:
                        print(f"  therapist    : {', '.join(summary.therapist_slugs)}")
                    if not summary.is_active:
                        print("  ⚠ internal user is inactive")
                return 0

            if not args.external_id or not args.roles:
                raise SystemExit("--external-id and --roles are required (or use --list).")

            request = StaffProvisioningRequest(
                organization_slug=args.organization,
                external_auth_id=args.external_id,
                roles=parse_roles(args.roles),
                email=args.email,
                therapist_slug=args.therapist_slug,
                replace_roles=args.replace_roles,
            )
            result = await provision_staff(session, request)

            if result.created_user:
                print(f"created internal user {result.user_id}")
            for role in sorted(result.roles_added, key=lambda r: r.value):
                print(f"granted role {role.value}")
            for role in sorted(result.roles_reactivated, key=lambda r: r.value):
                print(f"reactivated role {role.value}")
            for role in sorted(result.roles_disabled, key=lambda r: r.value):
                print(f"disabled role {role.value}")
            for role in sorted(result.roles_left_in_place, key=lambda r: r.value):
                print(f"kept existing role {role.value} (use --replace-roles to disable)")
            if result.email_updated:
                print("updated email")
            if result.therapist_linked:
                print(f"linked therapist profile {result.therapist_linked}")
            if not result.changed:
                print("already current; nothing to do")

            if args.dry_run:
                await session.rollback()
                print("dry run: rolled back")
            else:
                await session.commit()
                print("committed")
        return 0
    except ProvisioningError as error:
        print(f"error: {error}", file=sys.stderr)
        return 1
    finally:
        await engine.dispose()


def main() -> None:
    raise SystemExit(asyncio.run(run(build_parser().parse_args())))


if __name__ == "__main__":
    main()
