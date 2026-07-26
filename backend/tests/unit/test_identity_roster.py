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


def test_every_member_has_a_matching_therapist_slug() -> None:
    # A therapist whose slug belonged to someone else is the defect that made
    # this module necessary.
    for key, person in TEAM.items():
        assert person.therapist_slug is not None, key
        assert person.therapist_slug.startswith(person.email.split(".")[0]), (
            f"{key}: therapist slug '{person.therapist_slug}' does not match "
            f"the email '{person.email}'"
        )


def test_clerk_ids_are_unique_across_the_team() -> None:
    seen: dict[str, str] = {}
    for key, person in TEAM.items():
        for instance, clerk_id in person.clerk_ids.items():
            owner = seen.setdefault(f"{instance}:{clerk_id}", key)
            assert owner == key, f"{clerk_id} is claimed by both {owner} and {key}"


def test_every_member_holds_both_roles_per_d026() -> None:
    for key, person in TEAM.items():
        assert person.roles == frozenset({MembershipRole.ORG_ADMIN, MembershipRole.THERAPIST}), key


def test_no_production_ids_are_recorded_yet() -> None:
    # Production Clerk has no accounts (O-17/O-18); a value here would be a
    # guess, and a guess would provision the wrong person.
    for key, person in TEAM.items():
        assert person.clerk_id_for(CLERK_PRODUCTION) is None, key


def test_development_ids_exist_for_the_accounts_that_were_created() -> None:
    assert member("anja") is not None
    assert member("marija") is not None
    anja = member("anja")
    marija = member("marija")
    assert anja is not None and marija is not None
    assert anja.clerk_id_for(CLERK_DEVELOPMENT) is not None
    assert marija.clerk_id_for(CLERK_DEVELOPMENT) is not None
    assert anja.clerk_id_for(CLERK_DEVELOPMENT) != marija.clerk_id_for(CLERK_DEVELOPMENT)


def test_marjan_has_no_recorded_account() -> None:
    marjan = member("marjan")
    assert marjan is not None
    assert marjan.clerk_ids == {}


def test_lookup_is_case_insensitive_and_trimmed() -> None:
    assert member("  MARIJA ") is member("marija")
    assert member("nepoznat") is None


def test_only_production_resolves_to_the_production_clerk_instance() -> None:
    assert clerk_instance_for(Environment.PRODUCTION) == CLERK_PRODUCTION
    assert clerk_instance_for(Environment.STAGING) == CLERK_DEVELOPMENT
    assert clerk_instance_for(Environment.DEVELOPMENT) == CLERK_DEVELOPMENT


def test_known_keys_are_sorted_and_complete() -> None:
    assert known_keys() == ("anja", "marija", "marjan")
