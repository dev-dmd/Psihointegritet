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
handle; it grants nothing without a signed session from Clerk itself.

The founding three hold development ids only — production never had accounts
for them. The 2026-08-09 team holds both instances (D-074), and the two sets
are genuinely different accounts: a development id cannot sign in to
production, which is why `clerk_ids` is keyed by instance rather than holding
one value per person. Anything not recorded here must still be passed
explicitly rather than guessed.
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
    #: Platform operator (D-051). Recorded here for the same reason the Clerk id
    #: is: so the person and their authority cannot be paired wrongly by hand.
    #: `--list` still marks every holder with ★, so the flag stays visible in an
    #: access review, and `--revoke-superadmin` still overrides this.
    superadmin: bool = False

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
        # Registered and provisioned on features/staging 2026-07-29 (O-17).
        # No production account yet — that id must still be passed explicitly
        # when it exists, per this module's docstring.
        clerk_ids={CLERK_DEVELOPMENT: "user_3HBcL93c1DXDjlHjelBklHdxFxw"},
    ),
    # ── 2026-08-09 team replacement ──────────────────────────────────────
    #
    # Three new Clerk accounts take over the three therapist slots:
    # Maria → Anja's, Elsa → Marija's, John → Marjan's (CTO, 2026-08-09).
    #
    # `clerk_ids` is deliberately empty. The ids live on a Clerk instance this
    # repository has never seen, and this module's own rule is that an id which
    # is not recorded must be passed explicitly — guessing it is exactly the
    # mismatch the roster exists to prevent. `provision_team.py` reads them from
    # the environment at run time.
    #
    # Each incoming person gets **their own** therapist profile. Pointing them
    # at the outgoing therapists' slugs was the first attempt and
    # `test_every_therapist_has_a_matching_slug_and_nobody_else_has_one`
    # rejected it — correctly: a slug that belongs to someone else is the exact
    # defect this module was written for, and it would have handed Maria the
    # caseload filed under Anja.
    #
    # `provision_team.py` creates these profiles when they are missing. Their
    # public content — biography, title, areas of expertise — is *not* created
    # there: those are claims about named professionals, and certification
    # wording is governed by STOP item S1 / D-042.
    #
    # Roles differ, unlike the outgoing three who all held both: Maria runs the
    # centre, Elsa and John see clients. `org_admin` is not cosmetic — it opens
    # Kompanije, Usluge i cene, Terapeuti and Podešavanja, and lets the holder
    # read a colleague's schedule. Granting it to all three "to be safe" is how
    # that boundary quietly disappears.
    #
    # There is no `owner` role in `MembershipRole`; the enum has exactly
    # `org_admin` and `therapist`. Maria is described as owner and receives
    # `org_admin`, today's strongest tenant role.
    "maria": TeamMember(
        key="maria",
        display_name="Maria Bullock",
        email="maria.bullock@psihointegritet.com",
        roles=BOTH_ROLES,
        therapist_slug="maria-bullock",
        clerk_ids={
            CLERK_DEVELOPMENT: "user_3Hh6tfRfCwxo8dv24ynFasyDGI2",
            CLERK_PRODUCTION: "user_3HhAuI4wlf8Pa5UaYl49ClDanWr",
        },
    ),
    "elsa": TeamMember(
        key="elsa",
        display_name="Elsa Browers",
        email="elsa.browers@psihointegritet.com",
        roles=frozenset({MembershipRole.THERAPIST}),
        therapist_slug="elsa-browers",
        clerk_ids={
            CLERK_DEVELOPMENT: "user_3Hh7bqnGryNrpxPSO4PYyiFlDQQ",
            CLERK_PRODUCTION: "user_3HhAk6ZXwrMb46XpVpbvJZ0D0ai",
        },
    ),
    "john": TeamMember(
        key="john",
        display_name="John Francis",
        email="john.francis@psihointegritet.com",
        roles=frozenset({MembershipRole.THERAPIST}),
        therapist_slug="john-francis",
        clerk_ids={
            CLERK_DEVELOPMENT: "user_3Hh7rWs8ualhw6509eHrpgsO4Qf",
            CLERK_PRODUCTION: "user_3HhAZZWpZkRHiE7c9yWBmmXCZ7w",
        },
    ),
    # Two entries, one person: Milan signs in with either address, and both are
    # accounts on the *same* Clerk instance, so they cannot share one entry —
    # `clerk_ids` holds one id per instance by design. The key therefore names
    # the account, not the human. Deleting one as a "duplicate" would silently
    # lock him out of whichever address he happened to use that day.
    "milan": TeamMember(
        key="milan",
        display_name="Milan Dražić",
        email="drazic.milan@gmail.com",
        # `org_admin` and not `therapist`: the platform flag already grants both
        # capabilities in every tenant (D-051), but a therapist membership would
        # also make him selectable as a clinician, which he is not.
        roles=frozenset({MembershipRole.ORG_ADMIN}),
        therapist_slug=None,
        clerk_ids={CLERK_DEVELOPMENT: "user_3GXrf2rAn8Ekdc3qgHtnWxHWSY4"},
        superadmin=True,
    ),
    "milan-dmdevelon": TeamMember(
        key="milan-dmdevelon",
        display_name="Milan Dražić (dmdevelon)",
        email="milan.drazic@dmdevelon.website",
        roles=frozenset({MembershipRole.ORG_ADMIN}),
        therapist_slug=None,
        clerk_ids={CLERK_DEVELOPMENT: "user_3GpXyBDgdjBWaKDixwvc01Dlr6c"},
        superadmin=True,
    ),
}


def member(key: str) -> TeamMember | None:
    return TEAM.get(key.strip().lower())


def known_keys() -> tuple[str, ...]:
    return tuple(sorted(TEAM))
