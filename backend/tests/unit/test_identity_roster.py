"""Roster guards.

The roster exists to stop one specific mistake: pairing one person's Clerk id
with another's email and therapist profile. These tests assert the pairing is
internally consistent, because nothing in the database would catch it.
"""

from psihointegritet.core.config import Environment
from psihointegritet.modules.identity.models import MembershipRole
from psihointegritet.modules.identity.roster import (
    CLERK_DEVELOPMENT,
    CLERK_PRODUCTION,
    TEAM,
    clerk_instance_for,
    known_keys,
    member,
)


def test_every_therapist_has_a_matching_slug_and_nobody_else_has_one() -> None:
    # A therapist whose slug belonged to someone else is the defect that made
    # this module necessary. The reverse matters too: a slug on a non-clinician
    # would offer them for matching, which is a clinical claim.
    for key, person in TEAM.items():
        if MembershipRole.THERAPIST in person.roles:
            assert person.therapist_slug is not None, key
            assert person.therapist_slug.startswith(person.email.split(".")[0]), (
                f"{key}: therapist slug '{person.therapist_slug}' does not match "
                f"the email '{person.email}'"
            )
        else:
            assert person.therapist_slug is None, key


def test_clerk_ids_are_unique_across_the_team() -> None:
    seen: dict[str, str] = {}
    for key, person in TEAM.items():
        for instance, clerk_id in person.clerk_ids.items():
            owner = seen.setdefault(f"{instance}:{clerk_id}", key)
            assert owner == key, f"{clerk_id} is claimed by both {owner} and {key}"


def test_every_clinician_holds_the_therapist_role() -> None:
    """A therapist profile without the therapist role is a broken entry.

    This used to demand `org_admin` too, because D-026 gave all three founding
    therapists both. The 2026-08-09 team no longer works that way: Maria runs
    the centre, Elsa and John see clients (D-074). `org_admin` opens Kompanije,
    Usluge i cene, Terapeuti and Podešavanja and lets the holder read a
    colleague's schedule, so it is now asserted per person rather than blanket.
    """
    for key, person in TEAM.items():
        if person.therapist_slug is None:
            continue
        assert MembershipRole.THERAPIST in person.roles, key

    admins = {key for key, person in TEAM.items() if MembershipRole.ORG_ADMIN in person.roles}
    assert "maria" in admins, "the centre needs an administrator"
    assert admins.isdisjoint({"elsa", "john"}), (
        "Elsa and John are staff clinicians; org_admin would hand them the "
        "business surfaces and their colleagues' schedules"
    )


def test_the_platform_operator_is_an_admin_but_never_a_clinician() -> None:
    # D-051 gives a superadmin every capability at runtime; the membership row
    # still must not say "therapist", or he becomes selectable for matching.
    operators = [person for person in TEAM.values() if person.superadmin]
    assert operators, "the roster records no platform operator"
    for person in operators:
        assert MembershipRole.THERAPIST not in person.roles, person.key
        assert person.therapist_slug is None, person.key


def test_production_ids_exist_only_for_the_current_team() -> None:
    """O-17/O-18 opened for the incoming team on 2026-08-09, not for everyone.

    The founding three never had production accounts, so a value there would be
    a guess — and a guess provisions the wrong person.
    """
    for key in ("maria", "elsa", "john"):
        person = member(key)
        assert person is not None, key
        assert person.clerk_id_for(CLERK_PRODUCTION) is not None, key

    for key in ("anja", "marija", "marjan"):
        person = member(key)
        assert person is not None, key
        assert person.clerk_id_for(CLERK_PRODUCTION) is None, key


def test_development_and_production_ids_are_never_the_same_value() -> None:
    # Two Clerk instances mean two separate accounts. The same string in both
    # is a copy-paste, and it would send a production run at an id that cannot
    # sign in there.
    for key, person in TEAM.items():
        development = person.clerk_id_for(CLERK_DEVELOPMENT)
        production = person.clerk_id_for(CLERK_PRODUCTION)
        if development is not None and production is not None:
            assert development != production, key


def test_development_ids_exist_for_the_accounts_that_were_created() -> None:
    # All three team members registered on the development instance
    # (Marjan last, 2026-07-29) — no one is missing an id here anymore.
    ids: set[str] = set()
    for key in ("anja", "marija", "marjan"):
        person = member(key)
        assert person is not None, key
        clerk_id = person.clerk_id_for(CLERK_DEVELOPMENT)
        assert clerk_id is not None, key
        assert clerk_id not in ids, f"{key}'s development id is not unique"
        ids.add(clerk_id)


def test_lookup_is_case_insensitive_and_trimmed() -> None:
    assert member("  MARIJA ") is member("marija")
    assert member("nepoznat") is None


def test_only_production_resolves_to_the_production_clerk_instance() -> None:
    assert clerk_instance_for(Environment.PRODUCTION) == CLERK_PRODUCTION
    assert clerk_instance_for(Environment.STAGING) == CLERK_DEVELOPMENT
    assert clerk_instance_for(Environment.DEVELOPMENT) == CLERK_DEVELOPMENT


def test_known_keys_are_sorted_and_complete() -> None:
    # Inventory, not a safety net: it fails whenever the team changes, which is
    # the point — someone has to look. The three incoming accounts were added
    # 2026-08-09 when Maria, Elsa and John replaced the founding therapists.
    assert known_keys() == (
        "anja",
        "elsa",
        "john",
        "maria",
        "marija",
        "marjan",
        "milan",
        "milan-dmdevelon",
    )


def test_the_same_person_may_hold_two_accounts_with_distinct_ids() -> None:
    # Both of Milan's addresses live on the development instance, so they are
    # separate entries. The ids must still differ, or one entry would provision
    # over the other.
    milan = member("milan")
    dmdevelon = member("milan-dmdevelon")
    assert milan is not None and dmdevelon is not None
    assert milan.email != dmdevelon.email
    assert milan.clerk_id_for(CLERK_DEVELOPMENT) != dmdevelon.clerk_id_for(CLERK_DEVELOPMENT)
