"""Swap the three therapist logins in one run (CTO decision, 2026-08-09).

Maria Bullock takes Anja's slot, Elsa Browers takes Marija's, John Francis
takes Marjan's. The three outgoing backend accounts are revoked and deleted.
This script does not modify Clerk users or their public metadata; those are a
separate, explicit production operation.

Why a second command next to `provision_staff.py`: this is one atomic
intent — "the team changed" — that must not end half applied, with new
accounts live and old ones still able to sign in. Running the single-person
command six times by hand is exactly how that happens. Everything underneath
reuses `provision_staff` / `revoke_staff`; no provisioning logic is duplicated.

Clerk ids are recorded in the roster per Clerk instance. Normal runs therefore
need no per-person Vercel/Railway variables. Flags and environment variables
remain emergency overrides, and are rejected when they disagree with the
recorded id:

    --maria user_...  --elsa user_...  --john user_...
    THERAPIST_CLERK_ID_MARIA / _ELSA / _JOHN

`backend/.env.local` is **not** read. It holds live Railway credentials, so a
script that auto-loaded it would take a command typed on a laptop and quietly
apply it to production.

Addresses default to the roster but can be overridden the same way, so the
values already in `.env.local` keep working:

    THERAPIST_EMAIL_MARIA / THERAPIST_EMAIL_ELSA / THERAPIST_EMAIL_JOHN

To find an id: Clerk dashboard, or from the frontend, which can resolve
addresses because it holds `CLERK_SECRET_KEY`:

    cd frontend && npm run roles:assign -- --dry-run

Usage. Always dry-run first — it prints every change and rolls back:

    railway run -- python scripts/provision_team.py --dry-run
    railway run -- python scripts/provision_team.py

Locally the virtualenv is not on PATH, so prefix with `uv run`:

    uv run python scripts/provision_team.py --dry-run

`--keep-previous` provisions the incoming accounts without touching the
outgoing ones, for a rehearsal where nobody may lose access yet.

**Out of scope, on purpose.** This command creates each incoming person's own
`therapist_matching_profiles` row and reconciles its operational matching
attributes (including FK-backed support areas) from the predecessor. It does
not copy biographies, titles or credentials — those are published claims about
named professionals, including certification wording governed by STOP item
S1/D-042. It also does not silently reassign historical requests, appointments
or clinical ownership to a different person.
"""

import argparse
import asyncio
import os
import sys

from sqlalchemy import delete, select
from sqlalchemy.engine import make_url
from sqlalchemy.ext.asyncio import AsyncSession

from psihointegritet.core.config import Settings, get_settings
from psihointegritet.db.session import create_engine, create_session_factory
from psihointegritet.modules.content.taxonomy_models import (
    TherapistMatchingProfileSupportArea,
)
from psihointegritet.modules.guidance.models import (
    AcceptanceStatus,
    CapacityStatus,
    TherapistMatchingProfile,
)
from psihointegritet.modules.identity.provisioning import (
    ProvisioningError,
    StaffProvisioningRequest,
    provision_staff,
    revoke_staff,
)
from psihointegritet.modules.identity.roster import (
    TeamMember,
    clerk_instance_for,
    member,
)
from psihointegritet.modules.organizations.models import Organization

DEFAULT_ORGANIZATION = "psihointegritet"

#: incoming roster key -> outgoing roster key it replaces
REPLACEMENTS: tuple[tuple[str, str], ...] = (
    ("maria", "anja"),
    ("elsa", "marija"),
    ("john", "marjan"),
)

# D-076 is identity data for the incoming team, not an attribute inherited
# from the Serbian predecessor. Keep it next to the replacement map so every
# provisioning run — including the first production run after migration 0025
# updated zero rows — converges on the canonical US location.
LOCATION_BY_PERSON: dict[str, str] = {
    "maria": "Chicago",
    "elsa": "Milwaukee",
    "john": "Madison",
}

#: incoming roster key -> environment variable holding its Clerk user id
CLERK_ID_ENV: dict[str, str] = {
    "maria": "THERAPIST_CLERK_ID_MARIA",
    "elsa": "THERAPIST_CLERK_ID_ELSA",
    "john": "THERAPIST_CLERK_ID_JOHN",
}

#: optional address override, matching the names already used in `.env.local`
EMAIL_ENV: dict[str, str] = {
    "maria": "THERAPIST_EMAIL_MARIA",
    "elsa": "THERAPIST_EMAIL_ELSA",
    "john": "THERAPIST_EMAIL_JOHN",
}


def _database_label(settings: Settings) -> str:
    """`host:port/database`, no credentials.

    Printed before anything runs for the same reason `provision_staff` does it:
    with no `.env` present, `Settings` falls back to the local development
    default, so a command typed on a laptop reports success against `localhost`
    while the operator believes they are changing Railway.
    """
    url = make_url(settings.database_url)
    return f"{url.host or 'local socket'}:{url.port or 5432}/{url.database or '?'}"


async def ensure_therapist_profile(
    session: AsyncSession,
    organization_slug: str,
    person: TeamMember,
    inherit_from_slug: str | None,
) -> tuple[bool, str | None]:
    """Create or reconcile the incoming therapist's matching profile.

    `provision_staff` links an existing profile; it does not invent one. These
    three people are new, so nothing to link exists yet — and pointing them at
    the outgoing therapists' profiles is what the roster guard rejects.

    With `inherit_from_slug`, the matching attributes of the therapist being
    replaced are copied onto the new profile, so the incoming person is offered
    for the same services, areas, formats and locations from day one instead of
    being invisible until someone re-enters everything.

    Not copied: `slug`, `display_name` and `assigned_user_id` — those are the
    identity, and copying them is the mismatch this whole module exists to
    prevent. The public biography and title are not touched either; they live
    in the content catalogue and are claims about a named professional.

    Reconciliation is intentional: the first production run may already have
    created the incoming profile before this command learned how to copy every
    matching attribute.  Returning early for an existing target would make the
    repair permanently impossible to apply idempotently.

    Returns `(created, inherited_from)`.
    """
    if person.therapist_slug is None:
        return False, None

    organization = await session.scalar(
        select(Organization).where(Organization.slug == organization_slug)
    )
    if organization is None:
        raise SystemExit(f"Organization '{organization_slug}' not found.")

    existing = await session.scalar(
        select(TherapistMatchingProfile).where(
            TherapistMatchingProfile.organization_id == organization.id,
            TherapistMatchingProfile.slug == person.therapist_slug,
        )
    )
    canonical_location = LOCATION_BY_PERSON.get(person.key)
    source: TherapistMatchingProfile | None = None
    if inherit_from_slug is not None:
        source = await session.scalar(
            select(TherapistMatchingProfile).where(
                TherapistMatchingProfile.organization_id == organization.id,
                TherapistMatchingProfile.slug == inherit_from_slug,
            )
        )

    if source is None and existing is not None:
        if canonical_location is not None:
            existing.locations = [canonical_location]
            await session.flush()
        return False, None

    if source is None:
        # Nothing to inherit: start closed. Empty `services`/`areas` means the
        # guided selection will not offer this person until an editor fills the
        # profile in, and `min_child_age` 18 keeps minors out of a profile
        # nobody has reviewed (STOP S4).
        session.add(
            TherapistMatchingProfile(
                organization_id=organization.id,
                slug=person.therapist_slug,
                display_name=person.display_name,
                accepting_new_clients=False,
                services=[],
                areas=[],
                formats=[],
                locations=[canonical_location] if canonical_location is not None else [],
                min_child_age=18,
            )
        )
        await session.flush()
        return True, None

    created = existing is None
    target = existing
    if target is None:
        target = TherapistMatchingProfile(
            organization_id=organization.id,
            slug=person.therapist_slug,
            display_name=person.display_name,
        )
        session.add(target)

    # Identity fields stay on the incoming person. Everything that controls
    # matching eligibility is declaratively reconciled from the predecessor.
    target.display_name = person.display_name
    if created:
        # These values are live state, not permanent capabilities. Inherit them
        # once, then let the incoming therapist manage their own state. This is
        # also what keeps a repeated run idempotent after the predecessor is
        # paused below.
        target.accepting_new_clients = source.accepting_new_clients
        target.capacity_status = source.capacity_status
        target.acceptance_status = source.acceptance_status
        target.presence_status = source.presence_status
        target.absence_until = source.absence_until
    target.accepted_age_bands = list(source.accepted_age_bands)
    target.service_capabilities = list(source.service_capabilities)
    target.supported_formats = list(source.supported_formats)
    target.services = list(source.services)
    target.areas = list(source.areas)
    target.formats = list(source.formats)
    target.locations = (
        [canonical_location] if canonical_location is not None else list(source.locations)
    )
    target.min_child_age = source.min_child_age
    await session.flush()

    # The FK-backed support-area registry is authoritative in the matching
    # service. Copying only the legacy JSON `areas` column makes the new person
    # look correct in a raw row while still disappearing from recommendations.
    support_area_ids = list(
        await session.scalars(
            select(TherapistMatchingProfileSupportArea.support_area_term_id).where(
                TherapistMatchingProfileSupportArea.therapist_profile_id == source.id
            )
        )
    )
    await session.execute(
        delete(TherapistMatchingProfileSupportArea).where(
            TherapistMatchingProfileSupportArea.therapist_profile_id == target.id
        )
    )
    session.add_all(
        TherapistMatchingProfileSupportArea(
            therapist_profile_id=target.id,
            support_area_term_id=support_area_id,
        )
        for support_area_id in support_area_ids
    )

    # Removing a login is not enough: Matching reads therapist profiles, not
    # memberships. Without pausing the predecessor, both old and new people are
    # recommended after a successful account swap.
    source.accepting_new_clients = False
    source.capacity_status = CapacityStatus.PAUSED
    source.acceptance_status = AcceptanceStatus.PAUSED
    await session.flush()
    return created, inherit_from_slug


def _require_member(key: str) -> TeamMember:
    person = member(key)
    if person is None:
        raise SystemExit(f"Roster entry '{key}' is missing — refusing to guess.")
    return person


def _resolve_incoming(
    args: argparse.Namespace, settings: Settings
) -> list[tuple[TeamMember, str, str]]:
    """(person, clerk id, email) for each incoming account.

    Precedence: flag, then environment, then the roster entry for the Clerk
    instance this environment authenticates against. A flag wins because the
    environment is the part an operator cannot see while typing; the roster is
    last because it is the value under review in this file.

    `backend/.env.local` is **not** read, and deliberately so: it holds live
    Railway credentials, so a script that auto-loaded it would take a command
    typed on a laptop and quietly apply it to production. Pass the ids as flags
    locally; on Railway they arrive as real environment variables.

    Every missing id is collected before failing, so the operator fixes the
    input once instead of discovering the gaps one run at a time.
    """
    resolved: list[tuple[TeamMember, str, str]] = []
    missing: list[str] = []
    instance = clerk_instance_for(settings.environment)

    for key, _ in REPLACEMENTS:
        person = _require_member(key)
        env_name = CLERK_ID_ENV[key]
        flag_value: str | None = getattr(args, key, None)
        clerk_id = (
            flag_value or os.environ.get(env_name) or person.clerk_id_for(instance) or ""
        ).strip()
        if not clerk_id:
            missing.append(f"--{key} (ili {env_name})")
            continue
        recorded = person.clerk_id_for(instance)
        if recorded is not None and clerk_id != recorded:
            raise SystemExit(
                f"{person.display_name}: prosleđen id se razlikuje od onog u "
                f"rosteru za '{instance}' instancu. Ne pogađam koji je tačan."
            )
        email = (os.environ.get(EMAIL_ENV[key]) or "").strip() or person.email
        resolved.append((person, clerk_id, email))

    if missing:
        raise SystemExit(
            "Nedostaje Clerk user id: "
            + ", ".join(missing)
            + f"\n(Clerk instanca: {instance} — roster nema zapisan id za nju.)"
            + "\n\nNapomena: `backend/.env.local` se NE čita — u njemu su Railway "
            "kredencijali, pa bi automatsko učitavanje lokalnu komandu tiho "
            "usmerilo na produkciju.\n"
            "Id-jeve nađi u Clerk dashboard-u, ili:\n"
            "    cd frontend && npm run roles:assign -- --dry-run"
        )

    seen: dict[str, str] = {}
    for person, clerk_id, _ in resolved:
        if clerk_id in seen:
            raise SystemExit(
                f"{person.display_name} and {seen[clerk_id]} were given the same "
                "Clerk id. That would hand one person the other's caseload."
            )
        seen[clerk_id] = person.display_name

    return resolved


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--organization", default=DEFAULT_ORGANIZATION)
    for key, replaces in REPLACEMENTS:
        person = member(key)
        parser.add_argument(
            f"--{key}",
            metavar="CLERK_ID",
            help=(
                f"Clerk user id za {person.display_name if person else key}"
                f" (zamenjuje {replaces}); ima prednost nad {CLERK_ID_ENV[key]}"
            ),
        )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="report every change and roll back",
    )
    parser.add_argument(
        "--keep-previous",
        action="store_true",
        help="provision the incoming accounts without revoking the outgoing ones",
    )
    parser.add_argument(
        "--no-inherit",
        action="store_true",
        help=("napravi prazne profile umesto da naslede atribute terapeuta kojeg zamenjuju"),
    )
    parser.add_argument(
        "--no-delete",
        action="store_true",
        help="revoke the outgoing accounts but keep their rows for audit",
    )
    return parser


async def run(args: argparse.Namespace) -> int:
    settings = get_settings()
    instance = clerk_instance_for(settings.environment)
    print(f"database    : {_database_label(settings)}")
    print(f"environment : {settings.environment}")
    # The instance decides which recorded id is written into `external_auth_id`,
    # so it is printed next to the database: those two lines together are what
    # an operator has to recognise before committing.
    print(f"clerk       : {instance} instanca")
    print(f"organization: {args.organization}")
    if args.dry_run:
        print("mode        : dry run — nothing will be committed")
    print()

    incoming = _resolve_incoming(args, settings)

    engine = create_engine(settings)
    session_factory = create_session_factory(engine)

    try:
        async with session_factory() as session:
            # One transaction for the whole swap: a half-applied run would leave
            # new accounts live while the old ones could still sign in.
            replaced_by_key = dict(REPLACEMENTS)
            for person, clerk_id, email in incoming:
                outgoing_slug = None
                if not args.no_inherit:
                    outgoing = _require_member(replaced_by_key[person.key])
                    outgoing_slug = outgoing.therapist_slug
                created_profile, inherited_from = await ensure_therapist_profile(
                    session, args.organization, person, outgoing_slug
                )
                result = await provision_staff(
                    session,
                    StaffProvisioningRequest(
                        organization_slug=args.organization,
                        external_auth_id=clerk_id,
                        roles=person.roles,
                        email=email,
                        display_name=person.display_name,
                        therapist_slug=person.therapist_slug,
                        # Declarative: the incoming account gets exactly the
                        # roster's roles and nothing it may have picked up
                        # during an earlier rehearsal.
                        replace_roles=True,
                    ),
                )
                roles = ", ".join(sorted(str(role) for role in person.roles))
                print(f"+ {person.display_name} <{email}> [{clerk_id}]")
                print(f"    nalog            : {'nov' if result.created_user else 'postojeci'}")
                print(f"    uloge            : {roles}")
                if created_profile and inherited_from:
                    profile_note = f" (novo, nasleđeno od {inherited_from})"
                elif created_profile:
                    profile_note = " (novo, prazno — ne prima klijente)"
                elif inherited_from:
                    profile_note = f" (postojeći, usklađen sa {inherited_from})"
                else:
                    profile_note = ""
                print(f"    terapeutski profil: {result.therapist_linked or '-'}{profile_note}")

            if args.keep_previous:
                print("\n(outgoing accounts left untouched — --keep-previous)")
            else:
                print()
                for incoming_key, outgoing_key in REPLACEMENTS:
                    outgoing = _require_member(outgoing_key)
                    # Only the id for the instance this run resolved to.
                    # Walking every instance would aim a production run at a
                    # development id — which cannot exist there, and against the
                    # wrong database would remove the wrong account outright.
                    scoped_id = outgoing.clerk_id_for(instance)
                    if scoped_id is None:
                        print(
                            f"- {outgoing.display_name}: nema zapisan id za "
                            f"{instance} instancu, nema šta da se ukloni"
                        )
                        continue
                    for old_id in (scoped_id,):
                        removal = await revoke_staff(
                            session,
                            organization_slug=args.organization,
                            external_auth_id=old_id,
                            hard_delete=not args.no_delete,
                        )
                        replacement = _require_member(incoming_key).display_name
                        if not removal.found:
                            print(f"- {outgoing.display_name} [{old_id}]: nema takvog naloga")
                            continue
                        verb = "obrisan" if removal.deleted else "deaktiviran"
                        print(
                            f"- {outgoing.display_name} [{old_id}] {verb}"
                            f" (zamenjuje ga {replacement})"
                        )
                        if removal.therapists_unlinked:
                            print(
                                "    odvezani profili : " + ", ".join(removal.therapists_unlinked)
                            )
                        if not removal.deleted and not args.no_delete:
                            # `revoke_staff` refuses a hard delete once the person
                            # has claimed a case — the audit trail wins.
                            print(f"    red zadržan: {removal.claimed_cases} preuzet(ih) slučajeva")

            if args.dry_run:
                await session.rollback()
                print("\nrolled back (dry run)")
            else:
                await session.commit()
                print("\ncommitted")
    except ProvisioningError as error:
        print(f"\nfailed: {error}", file=sys.stderr)
        return 1
    finally:
        await engine.dispose()

    return 0


def main() -> None:
    raise SystemExit(asyncio.run(run(build_parser().parse_args())))


if __name__ == "__main__":
    main()
