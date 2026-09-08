"""Create a tenant, so adding one is an operation rather than a migration.

Why a command and not an API route: the same reason `provision_staff.py` is one.
The endpoint that creates the *first* organization cannot require membership in
an organization, so it would need a bootstrap secret — a permanent security
surface for an operation run a handful of times.

Why the logic is not in this file: `modules/organizations/provisioning.py` owns
it, so the Superadmin onboarding screen can call exactly the same code later
instead of a second implementation that drifts. This script parses arguments,
prints what happened, and decides whether to commit.

Usage:

    python scripts/provision_organization.py --list

    python scripts/provision_organization.py \\
        --slug sanja-neuer \\
        --display-name "Sanja Neuer" \\
        --ui-locale sr-Latn \\
        --default-content-locale sr-Latn \\
        --dry-run

Safe to re-run. A second run against an unchanged organization reports that it
already exists and writes nothing; one against a *different* configuration is
refused rather than applied, because this command cannot tell whether the stored
value or the typed one is the mistake.

The slug is passed explicitly and never derived from the display name. It is the
tenant's identity — `DEFAULT_ORGANIZATION_SLUG` pins deployments to it — so it
must not move when someone edits a title.

Inside a deployed container there is no `uv`; the runtime image carries the built
virtualenv on PATH already:

    railway run -- python scripts/provision_organization.py --list
"""

import argparse
import asyncio
import sys

from sqlalchemy.engine import make_url

from psihointegritet.core.config import Settings, get_settings
from psihointegritet.core.locales import PLATFORM_DEFAULT_LOCALE, SUPPORTED_UI_LOCALES
from psihointegritet.db.session import create_engine, create_session_factory
from psihointegritet.modules.organizations.provisioning import (
    OrganizationProvisioningError,
    OrganizationProvisioningRequest,
    list_organizations,
    provision_organization,
)


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--list", action="store_true", help="show current organizations and exit")
    parser.add_argument("--slug", help="stable tenant identifier, e.g. sanja-neuer")
    parser.add_argument("--display-name", help="name shown to people, e.g. 'Sanja Neuer'")
    parser.add_argument(
        "--ui-locale",
        default=PLATFORM_DEFAULT_LOCALE,
        help=(
            "language of panels, statuses and system email "
            f"({', '.join(SUPPORTED_UI_LOCALES)}; default {PLATFORM_DEFAULT_LOCALE})"
        ),
    )
    parser.add_argument(
        "--default-content-locale",
        help=(
            "locale stamped on new tenant-authored content; defaults to --ui-locale when omitted"
        ),
    )
    parser.add_argument(
        "--dry-run", action="store_true", help="report the change without committing"
    )
    return parser


def _database_label(settings: Settings) -> str:
    """`host:port/database` for the URL this run will actually use, no credentials.

    Printed on every run for the reason `provision_staff.py` prints it: with no
    `.env` present, `Settings` falls back to the local development default, so a
    command typed on a laptop reports on `localhost` while the operator believes
    they are looking at a deployed environment.

    It matters more here than there. The three Railway environments share one
    proxy domain and differ only by port, so the line below is often the only
    thing on screen that distinguishes staging from production.
    """
    url = make_url(settings.database_url)
    return f"{url.host or 'local socket'}:{url.port or 5432}/{url.database or '?'}"


def resolve_request(args: argparse.Namespace) -> OrganizationProvisioningRequest:
    if not args.slug or not args.display_name:
        raise SystemExit("--slug and --display-name are both required.")
    return OrganizationProvisioningRequest(
        slug=args.slug,
        display_name=args.display_name,
        ui_locale=args.ui_locale,
        # Following `--ui-locale` is the right default for a single-language
        # tenant, which every tenant is on its first day. D-077 keeps the two
        # independent afterwards, so this only chooses a starting value.
        default_content_locale=args.default_content_locale or args.ui_locale,
    )


async def run(args: argparse.Namespace) -> int:
    settings = get_settings()
    print(f"database    : {_database_label(settings)}")
    print(f"environment : {settings.environment.value}\n")
    engine = create_engine(settings)
    session_factory = create_session_factory(engine)

    try:
        async with session_factory() as session:
            if args.list:
                organizations = await list_organizations(session)
                if not organizations:
                    print("No organizations. Apply migrations, then provision one.")
                    return 0
                for organization in organizations:
                    print(f"{organization.display_name}  [{organization.slug}]")
                    print(
                        f"  ui_locale              : {organization.ui_locale}\n"
                        f"  default_content_locale : {organization.default_content_locale}"
                    )
                return 0

            result = await provision_organization(session, resolve_request(args))

            if result.created:
                print(f"created organization {result.slug} [{result.organization_id}]")
                print("recorded audit event organization.created (actor: system)")
            else:
                print(
                    f"organization {result.slug} [{result.organization_id}] "
                    "already exists and matches; nothing to do"
                )

            if args.dry_run:
                await session.rollback()
                print("dry run: rolled back")
            elif result.created:
                await session.commit()
                print("committed")
            return 0
    except OrganizationProvisioningError as error:
        print(f"error: {error}", file=sys.stderr)
        return 1
    finally:
        await engine.dispose()


def main() -> None:
    raise SystemExit(asyncio.run(run(build_parser().parse_args())))


if __name__ == "__main__":
    main()
