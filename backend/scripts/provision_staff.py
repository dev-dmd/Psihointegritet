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

Usage. Prefer `--person`: the roster keeps the Clerk id, email, roles and
therapist profile together, so they cannot be paired wrongly.

    uv run python scripts/provision_staff.py --list
    uv run python scripts/provision_staff.py --person elsa --dry-run
    uv run python scripts/provision_staff.py --person elsa

Someone without a recorded id for the instance being provisioned still needs
the explicit form:

    uv run python scripts/provision_staff.py \\
        --external-id user_2ab... \\
        --email elsa.browers@psihointegritet.com \\
        --roles therapist \\
        --therapist-slug elsa-browers

To swap the whole therapist team at once, use `provision_team.py` instead —
this command provisions one person.

Inside a deployed container there is no `uv` — the runtime stage only carries
the built virtualenv, which is already on PATH. Drop the `uv run` prefix:

    railway run -- python scripts/provision_staff.py --list

Platform superadmin (D-051) — full `org_admin` + `therapist` capability in
every tenant, with or without membership rows. Needs no `--roles`:

    python scripts/provision_staff.py --external-id user_2ab... --superadmin
    python scripts/provision_staff.py --external-id user_2ab... --revoke-superadmin

This is a PostgreSQL column, not a Clerk claim (rules §10.3): editing
`publicMetadata` in the Clerk dashboard grants the frontend superadmin view
but no backend authority until this command runs. `--list` marks every
holder with ★ so the flag is never invisible during an access review.

Undo, when an identity was created with the wrong Clerk id:

    python scripts/provision_staff.py --revoke --delete \
        --external-id user_wrong... --dry-run

`--revoke` alone disables the roles and keeps the row for audit; adding
`--delete` removes it, which is refused once the person has claimed a case.

Always try `--dry-run` first; it reports the change and rolls back.

Roles are additive by default: a role the person already has and you did not
pass is reported but left active. Pass --replace-roles to disable those too.
"""

import argparse
import asyncio
import sys

from sqlalchemy.engine import make_url

from psihointegritet.core.config import Settings, get_settings
from psihointegritet.db.session import create_engine, create_session_factory
from psihointegritet.modules.identity.models import MembershipRole
from psihointegritet.modules.identity.provisioning import (
    ProvisioningError,
    StaffProvisioningRequest,
    list_staff,
    provision_staff,
    revoke_staff,
)
from psihointegritet.modules.identity.roster import (
    clerk_instance_for,
    known_keys,
    member,
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
    parser.add_argument(
        "--person",
        help=(
            "known team member: "
            + ", ".join(known_keys())
            + ". Supplies the Clerk id, email, roles and therapist profile together, "
            "so they cannot be mismatched."
        ),
    )
    parser.add_argument("--external-id", help="Clerk user id (the JWT `sub`)")
    parser.add_argument("--email", help="stored for display only; never used for authorization")
    parser.add_argument(
        "--display-name",
        help="human name shown on audit badges; never used for authorization",
    )
    parser.add_argument("--roles", help="comma separated: org_admin,therapist")
    parser.add_argument("--therapist-slug", help="link this matching profile to the user")
    parser.add_argument(
        "--replace-roles",
        action="store_true",
        help="disable active roles that were not passed in --roles",
    )
    parser.add_argument(
        "--superadmin",
        dest="superadmin",
        action="store_const",
        const=True,
        default=None,
        help=(
            "grant the platform operator flag (D-051): full org_admin + therapist "
            "capability in every tenant, with or without membership rows"
        ),
    )
    parser.add_argument(
        "--revoke-superadmin",
        dest="superadmin",
        action="store_const",
        const=False,
        help="remove the platform operator flag, leaving ordinary memberships alone",
    )
    parser.add_argument(
        "--revoke",
        action="store_true",
        help="disable this identity's roles and unlink its therapist profile",
    )
    parser.add_argument(
        "--delete",
        action="store_true",
        help="with --revoke: also remove the row (only for an identity created by mistake)",
    )
    parser.add_argument(
        "--dry-run", action="store_true", help="report the change without committing"
    )
    return parser


def resolve_request(args: argparse.Namespace, settings: Settings) -> StaffProvisioningRequest:
    """Build the request, preferring the roster so fields cannot be mismatched."""
    if args.person:
        person = member(args.person)
        if person is None:
            raise SystemExit(f"Unknown person '{args.person}'. Known: {', '.join(known_keys())}")
        instance = clerk_instance_for(settings.environment)
        external_id = args.external_id or person.clerk_id_for(instance)
        if external_id is None:
            raise SystemExit(
                f"No Clerk id recorded for {person.display_name} on the {instance} "
                "instance. Pass --external-id explicitly."
            )
        if args.external_id and person.clerk_id_for(instance) not in (None, args.external_id):
            raise SystemExit(
                f"--external-id does not match the recorded id for {person.display_name} "
                f"on the {instance} instance. Refusing to guess which one is right."
            )
        print(f"{person.display_name} <{person.email}> [{external_id}]")
        # An explicit flag always wins, including `--revoke-superadmin`, so the
        # roster can record the intent without taking the decision away.
        superadmin = args.superadmin if args.superadmin is not None else person.superadmin or None
        if superadmin and args.superadmin is None:
            print("  ★ platform superadmin (recorded in the roster)")
        return StaffProvisioningRequest(
            organization_slug=args.organization,
            external_auth_id=external_id,
            roles=person.roles,
            email=person.email,
            display_name=person.display_name,
            therapist_slug=person.therapist_slug,
            replace_roles=args.replace_roles,
            superadmin=superadmin,
        )

    # `--superadmin` alone is a legitimate invocation: a platform operator
    # (D-051) needs no membership row, so demanding `--roles` here would force
    # granting tenant roles nobody asked for just to satisfy the parser.
    if not args.external_id or not (args.roles or args.superadmin is not None):
        raise SystemExit(
            "Use --person, or pass --external-id with --roles "
            "(or --superadmin / --revoke-superadmin), or --list."
        )

    return StaffProvisioningRequest(
        organization_slug=args.organization,
        external_auth_id=args.external_id,
        roles=parse_roles(args.roles) if args.roles else frozenset(),
        email=args.email,
        display_name=args.display_name,
        therapist_slug=args.therapist_slug,
        replace_roles=args.replace_roles,
        superadmin=args.superadmin,
    )


def _database_label(settings: Settings) -> str:
    """`host:port/database` for the URL this run will actually use, no credentials.

    Printed on every run because the failure mode it prevents is silent: with no
    `.env` file present, `Settings` falls back to the local development default,
    so a command typed on a laptop reports on `localhost` while the operator
    believes they are looking at the deployed environment. Two people spent a
    day on that in the QA rollout (2026-08-04).
    """
    url = make_url(settings.database_url)
    return f"{url.host or 'local socket'}:{url.port or 5432}/{url.database or '?'}"


async def run(args: argparse.Namespace) -> int:
    settings = get_settings()
    print(f"database    : {_database_label(settings)}")
    print(f"environment : {settings.environment.value}")
    print(f"clerk ids   : {clerk_instance_for(settings.environment)} instance\n")
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
                    label = summary.display_name or summary.email or "(no name)"
                    print(f"{label} <{summary.email or 'no email'}>  [{summary.external_auth_id}]")
                    if summary.is_superadmin:
                        print("  ★ PLATFORM SUPERADMIN — full staff capability in every tenant")
                    print(f"  active roles : {roles}")
                    if summary.disabled_roles:
                        disabled = ", ".join(sorted(r.value for r in summary.disabled_roles))
                        print(f"  disabled     : {disabled}")
                    if summary.therapist_slugs:
                        print(f"  therapist    : {', '.join(summary.therapist_slugs)}")
                    if not summary.is_active:
                        print("  ⚠ internal user is inactive")
                return 0

            if args.revoke:
                target = args.external_id
                if target is None and args.person:
                    person = member(args.person)
                    if person is None:
                        raise SystemExit(f"Unknown person '{args.person}'.")
                    target = person.clerk_id_for(clerk_instance_for(settings.environment))
                if target is None:
                    raise SystemExit("--revoke needs --person or --external-id.")
                removal = await revoke_staff(
                    session, args.organization, target, hard_delete=args.delete
                )
                if not removal.found:
                    print(f"no identity with external id {removal.external_auth_id}")
                    return 0
                for role in sorted(removal.roles_disabled, key=lambda r: r.value):
                    print(f"disabled role {role.value}")
                for slug in removal.therapists_unlinked:
                    print(f"unlinked therapist profile {slug}")
                if removal.deleted:
                    print("deleted internal user")
                elif not args.delete:
                    print("kept internal user (use --delete to remove it entirely)")
                if args.dry_run:
                    await session.rollback()
                    print("dry run: rolled back")
                else:
                    await session.commit()
                    print("committed")
                return 0

            result = await provision_staff(session, resolve_request(args, settings))

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
            if result.display_name_updated:
                print("updated display name")
            if result.therapist_linked:
                print(f"linked therapist profile {result.therapist_linked}")
            if result.superadmin_changed_to is True:
                print("granted PLATFORM SUPERADMIN — full org_admin + therapist in every tenant")
            elif result.superadmin_changed_to is False:
                print("revoked platform superadmin")
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
