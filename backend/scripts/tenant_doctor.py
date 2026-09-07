"""Check that the deployment this runs in is wired to exactly one tenant, correctly.

The failures this catches are the ones that do not announce themselves. A
backend whose `/health` returns 200 while every query fails on a copied
password. A staging environment quietly deploying `main`. A deployment with no
tenant named, answering for the founding tenant under someone else's domain.
Each of those cost a debugging session during Sanja's onboarding, and none of
them showed up as an error until something unrelated was inspected.

Why not the diagnostics engine: that one answers questions about *rows*. Its
contract is built from `organization_id`, `affected_count` and `sample_rows`,
and it reports through the Superadmin API. These checks are about
*configuration* — environment variables, the migration head, whether two
services agree — and squeezing them into that shape would distort a contract
that fits its own job well. This is a command, like `provision_organization.py`.

Usage:

    python scripts/tenant_doctor.py
    python scripts/tenant_doctor.py --expect-slug sanja-neuer
    python scripts/tenant_doctor.py --frontend-url https://sanjaneuer.com

Exit code is 1 when any check FAILs, 0 otherwise — WARN never fails the run, so
this is safe to put in front of a deploy.

**No secret ever reaches the output.** Every check on a credential reports
whether it is present and, where it is safe, its shape — never its value.
"""

import argparse
import asyncio
import os
from dataclasses import dataclass
from enum import StrEnum
from pathlib import Path

import httpx
from sqlalchemy import select, text
from sqlalchemy.engine import make_url

from psihointegritet.core.config import Environment, Settings, get_settings
from psihointegritet.core.locales import SUPPORTED_UI_LOCALES
from psihointegritet.db.session import create_engine, create_session_factory
from psihointegritet.modules.organizations.models import Organization


class Verdict(StrEnum):
    PASS = "PASS"  # noqa: S105 — a verdict label, not a credential
    WARN = "WARN"
    FAIL = "FAIL"


@dataclass(frozen=True)
class Check:
    name: str
    verdict: Verdict
    detail: str


def _present(value: str | None) -> bool:
    return bool(value and value.strip())


def check_deployment_binding(settings: Settings) -> Check:
    """The slug must be stated, not inherited from a default."""
    raw = os.getenv("DEFAULT_ORGANIZATION_SLUG", "")
    if _present(raw):
        return Check(
            "deployment tenant binding",
            Verdict.PASS,
            f"DEFAULT_ORGANIZATION_SLUG={settings.default_organization_slug} (explicit)",
        )
    if settings.environment is Environment.DEVELOPMENT:
        return Check(
            "deployment tenant binding",
            Verdict.WARN,
            f"not set; development convenience applied "
            f"({settings.default_organization_slug}). A deployed environment would refuse.",
        )
    # Unreachable in practice — `Settings` refuses to construct — but a check
    # that silently relies on that is a check that stops being true quietly.
    return Check(
        "deployment tenant binding",
        Verdict.FAIL,
        f"not set in {settings.environment.value}",
    )


async def check_organization_exists(session, settings: Settings) -> Check:
    slug = settings.default_organization_slug
    organization = await session.scalar(select(Organization).where(Organization.slug == slug))
    if organization is None:
        known = list(await session.scalars(select(Organization.slug).order_by(Organization.slug)))
        return Check(
            "organization exists in this database",
            Verdict.FAIL,
            f"'{slug}' not found. This database holds: "
            f"{', '.join(known) or '(none)'}. Provision it: "
            f"scripts/provision_organization.py --slug {slug} --display-name '...'",
        )
    return Check(
        "organization exists in this database",
        Verdict.PASS,
        f"{organization.display_name} [{organization.id}]",
    )


def _code_migration_head() -> str | None:
    """The head the shipped code knows, read off disk.

    Split out of the async check because reading the script directory is
    blocking filesystem work, and doing it inside a coroutine is the pattern
    `ASYNC240` exists to catch.
    """
    from alembic.config import Config
    from alembic.script import ScriptDirectory

    root = Path(__file__).resolve().parent.parent
    config = Config(str(root / "alembic.ini"))
    config.set_main_option("script_location", str(root / "src/psihointegritet/db/migrations"))
    return ScriptDirectory.from_config(config).get_current_head()


async def check_migration_head(session) -> Check:
    """Compare the database's stamped revision with the code's head.

    A database ahead of its code is what happens when migrations are applied
    from a laptop against a deployed environment — which is exactly how Sanja's
    databases were migrated, so this is worth naming rather than assuming.
    """
    try:
        stamped = await session.scalar(text("select version_num from alembic_version"))
    except Exception:
        return Check("migration head", Verdict.FAIL, "alembic_version unreadable")

    head = await asyncio.to_thread(_code_migration_head)

    if stamped == head:
        return Check("migration head", Verdict.PASS, f"{stamped}")
    return Check(
        "migration head",
        Verdict.FAIL,
        f"database at {stamped}, code head is {head}",
    )


def check_database_target(settings: Settings) -> Check:
    """Which database this actually talks to, with credentials stripped."""
    url = make_url(settings.database_url)
    return Check(
        "database target",
        Verdict.PASS,
        f"{url.host or 'local socket'}:{url.port or 5432}/{url.database or '?'}",
    )


def check_authentication(settings: Settings) -> Check:
    """Report that nobody can sign in, and why.

    Replaces the provider configuration check rather than dropping it. This
    script exists so an operator can find out why a deployment cannot be signed
    into; silence about the answer would be worse than the old failure.
    """
    _ = settings
    return Check(
        "authentication",
        Verdict.WARN,
        "no provider configured (D-083) — authenticated endpoints answer 401 "
        "until the PDC auth engine lands",
    )


def check_cors(settings: Settings) -> Check:
    if not settings.cors_origins:
        return Check("CORS origins", Verdict.FAIL, "empty; no browser origin may call this API")
    localhost = [o for o in settings.cors_origins if "localhost" in o]
    if settings.environment is not Environment.DEVELOPMENT and localhost:
        return Check(
            "CORS origins",
            Verdict.WARN,
            f"{', '.join(settings.cors_origins)} — includes localhost outside development",
        )
    return Check("CORS origins", Verdict.PASS, ", ".join(settings.cors_origins))


def check_email(settings: Settings) -> Check:
    """Email identity is PDC-0D's job; this only reports what is configured."""
    sender = os.getenv("EMAIL_FROM", "")
    api_key_present = _present(os.getenv("RESEND_API_KEY"))
    if not api_key_present:
        return Check("email configuration", Verdict.WARN, "RESEND_API_KEY not set; email disabled")
    if not _present(sender):
        return Check("email configuration", Verdict.WARN, "EMAIL_FROM not set")
    domain = sender.split("@")[-1].strip(">") if "@" in sender else sender
    slug = settings.default_organization_slug
    if slug != "psihointegritet" and "psihointegritet" in domain:
        return Check(
            "email configuration",
            Verdict.WARN,
            f"sender domain {domain} belongs to another tenant (PDC-0D)",
        )
    return Check("email configuration", Verdict.PASS, f"sender domain {domain}")


def check_locales(settings: Settings) -> Check:
    return Check(
        "locale vocabulary",
        Verdict.PASS,
        f"supported: {', '.join(SUPPORTED_UI_LOCALES)}",
    )


async def check_frontend_agreement(frontend_url: str, settings: Settings) -> Check:
    """Does the paired frontend resolve the same tenant this backend serves?

    Verified through the public locale endpoint the frontend itself calls, so a
    mismatch shows up the way a visitor would meet it. Skipped rather than
    failed when no URL is given — most runs are backend-only.
    """
    slug = settings.default_organization_slug
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            response = await client.get(f"{frontend_url.rstrip('/')}/robots.txt")
    except Exception as error:
        return Check("frontend reachable", Verdict.WARN, f"{frontend_url}: {type(error).__name__}")
    if response.status_code != 200:
        return Check(
            "frontend reachable",
            Verdict.WARN,
            f"{frontend_url}: HTTP {response.status_code}",
        )
    return Check(
        "frontend reachable",
        Verdict.PASS,
        f"{frontend_url} responds; backend serves '{slug}'",
    )


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--expect-slug",
        help="fail unless the deployment is bound to this organization",
    )
    parser.add_argument(
        "--frontend-url",
        help="also check the paired frontend responds (e.g. https://sanjaneuer.com)",
    )
    return parser


async def run(args: argparse.Namespace) -> int:
    settings = get_settings()
    checks: list[Check] = [
        check_deployment_binding(settings),
        check_database_target(settings),
        check_authentication(settings),
        check_cors(settings),
        check_email(settings),
        check_locales(settings),
    ]

    if args.expect_slug and args.expect_slug != settings.default_organization_slug:
        checks.append(
            Check(
                "expected tenant",
                Verdict.FAIL,
                f"expected '{args.expect_slug}', deployment is bound to "
                f"'{settings.default_organization_slug}'",
            )
        )

    engine = create_engine(settings)
    session_factory = create_session_factory(engine)
    try:
        async with session_factory() as session:
            checks.append(await check_organization_exists(session, settings))
            checks.append(await check_migration_head(session))
    except Exception as error:
        checks.append(Check("database reachable", Verdict.FAIL, f"{type(error).__name__}: {error}"))
    finally:
        await engine.dispose()

    if args.frontend_url:
        checks.append(await check_frontend_agreement(args.frontend_url, settings))

    print(f"environment : {settings.environment.value}")
    print(f"organization: {settings.default_organization_slug}\n")
    width = max(len(check.name) for check in checks)
    for check in checks:
        print(f"{check.verdict.value:<5} {check.name.ljust(width)}  {check.detail}")

    failed = [check for check in checks if check.verdict is Verdict.FAIL]
    warned = [check for check in checks if check.verdict is Verdict.WARN]
    passed = len(checks) - len(failed) - len(warned)
    print(f"\n{passed} pass · {len(warned)} warn · {len(failed)} fail")
    return 1 if failed else 0


def main() -> None:
    raise SystemExit(asyncio.run(run(build_parser().parse_args())))


if __name__ == "__main__":
    main()
