"""Known team members, so provisioning cannot pair the wrong person's data.

The mistake this prevents is specific and already happened once: an identity
was created with one therapist's Clerk id but another's email and matching
profile. Nothing in the database catches that — `external_auth_id` is the only
thing authorization reads, while the email and the therapist link are just
labels. The result is one person signing in and being handed another's
clinical caseload.

Here the three fields that must agree — Clerk id, email, therapist profile —
travel together under one name, so `--person marija` cannot produce Anja's id
against Marija's profile.

**These identifiers are not credentials.** A Clerk user id is a pseudonymous
handle; it grants nothing without a signed session from Clerk itself. Only the
development-instance ids are recorded, because production has no accounts yet;
when it does, they must be passed explicitly rather than guessed from here.
"""

from collections.abc import Mapping
from dataclasses import dataclass

from psihointegritet.core.config import Environment
from psihointegritet.modules.identity.models import MembershipRole

# Which Clerk instance an application environment authenticates against.
# `features` and `staging` both point at the development instance today, so
# anything that is not production resolves to the same ids.
CLERK_DEVELOPMENT = "development"
CLERK_PRODUCTION = "production"


def clerk_instance_for(environment: Environment) -> str:
    return CLERK_PRODUCTION if environment is Environment.PRODUCTION else CLERK_DEVELOPMENT


@dataclass(frozen=True)
class TeamMember:
    key: str
    display_name: str
    email: str
    roles: frozenset[MembershipRole]
    therapist_slug: str | None
    # Clerk instance -> user id. Absent means "must be passed explicitly".
    clerk_ids: Mapping[str, str]

    def clerk_id_for(self, instance: str) -> str | None:
        return self.clerk_ids.get(instance)


BOTH_ROLES = frozenset({MembershipRole.ORG_ADMIN, MembershipRole.THERAPIST})

# Roles follow D-026: all three therapists hold org_admin and therapist.
TEAM: Mapping[str, TeamMember] = {
    "anja": TeamMember(
        key="anja",
        display_name="Anja Stamenković",
        email="anja.stamenkovic@psihointegritet.com",
        roles=BOTH_ROLES,
        therapist_slug="anja-stamenkovic",
        clerk_ids={CLERK_DEVELOPMENT: "user_3GpB4n3QQhUXe6mxSlxa6sErIUN"},
    ),
    "marija": TeamMember(
        key="marija",
        display_name="Marija Stamenković",
        email="marija.stamenkovic@psihointegritet.com",
        roles=BOTH_ROLES,
        therapist_slug="marija-stamenkovic",
        clerk_ids={CLERK_DEVELOPMENT: "user_3GpUqUcdpojWUSJnJoPx7AHspAw"},
    ),
    "marjan": TeamMember(
        key="marjan",
        display_name="Marjan Janković",
        email="marjan.jankovic@psihointegritet.com",
        roles=BOTH_ROLES,
        therapist_slug="marjan-jankovic",
        # No account on any instance yet (O-17); pass --external-id when there is.
        clerk_ids={},
    ),
}


def member(key: str) -> TeamMember | None:
    return TEAM.get(key.strip().lower())


def known_keys() -> tuple[str, ...]:
    return tuple(sorted(TEAM))
