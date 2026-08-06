from dataclasses import dataclass
from enum import StrEnum
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from psihointegritet.infrastructure.auth.identity import IdentityClaims
from psihointegritet.modules.identity.models import (
    InternalUser,
    MembershipRole,
    MembershipStatus,
    OrganizationMembership,
)
from psihointegritet.modules.organizations.models import Organization


class StaffAuthorizationReason(StrEnum):
    """Why a verified identity still could not act as staff.

    Three genuinely different situations used to share one message ("Staff
    membership is not provisioned"), and every panel rendered its own vague
    sentence on top of it. The operator then had to guess whether the account,
    the tenant or the deployment was wrong — on 2026-08-04 that guess cost most
    of a day on QA, where the real answer was that the panel was pointed at a
    database the accounts had never been provisioned in.
    """

    #: No organization row matches the configured `DEFAULT_ORGANIZATION_SLUG`.
    #: A deployment/configuration fault, never the person's fault.
    ORGANIZATION_NOT_FOUND = "organization_not_found"
    #: The Clerk identity verified, but this database has no active
    #: `internal_users` row for it — `provision_staff.py` never ran here.
    ACCOUNT_NOT_PROVISIONED = "account_not_provisioned"
    #: The account exists but holds no active `org_admin`/`therapist` membership
    #: in this organization.
    NO_ACTIVE_STAFF_ROLE = "no_active_staff_role"


class IntakeAuthorizationError(PermissionError):
    """A protected Intake action failed its internal tenant and role checks."""

    def __init__(self, reason: StaffAuthorizationReason, organization_slug: str) -> None:
        self.reason = reason
        self.organization_slug = organization_slug
        super().__init__(f"{reason.value} (organization: {organization_slug})")


#: One sentence per cause, in the panel's language, each naming the next action.
#: Kept beside the reasons so five routers cannot drift into five wordings.
_REASON_MESSAGES: dict[StaffAuthorizationReason, str] = {
    StaffAuthorizationReason.ORGANIZATION_NOT_FOUND: (
        "Organizacija „{organization_slug}” ne postoji u bazi koju ovaj server koristi. "
        "Proverite DEFAULT_ORGANIZATION_SLUG i na koju bazu servis pokazuje."
    ),
    StaffAuthorizationReason.ACCOUNT_NOT_PROVISIONED: (
        "Vaša prijava je ispravna, ali ovaj nalog nije upisan u bazu koju server koristi. "
        "Nalozi se upisuju po okruženju — pokrenite provision_staff.py na tom okruženju."
    ),
    StaffAuthorizationReason.NO_ACTIVE_STAFF_ROLE: (
        "Nalog postoji, ali nema aktivnu ulogu u organizaciji „{organization_slug}”. "
        "Potrebna je org_admin ili therapist uloga sa statusom active."
    ),
}


def staff_authorization_message(error: IntakeAuthorizationError) -> str:
    """Human-readable cause for a failed staff resolution.

    Deliberately says which of the three things is missing. A single "Nema
    pristupa" is indistinguishable from a wrong account, a wrong tenant and a
    wrong database, which are three different fixes by three different people.
    """
    return _REASON_MESSAGES[error.reason].format(organization_slug=error.organization_slug)


@dataclass(frozen=True, slots=True)
class StaffActor:
    user_id: UUID
    organization_id: UUID
    roles: frozenset[MembershipRole]
    #: Platform operator acting inside a tenant (D-051). Kept as its own field
    #: rather than folded away, so a use case that must NOT be reachable by a
    #: platform operator can still tell the two apart — `roles` alone cannot,
    #: by design, since the whole point is that they carry the same capabilities.
    is_superadmin: bool = False

    @property
    def is_org_admin(self) -> bool:
        return MembershipRole.ORG_ADMIN in self.roles

    @property
    def is_therapist(self) -> bool:
        return MembershipRole.THERAPIST in self.roles


async def resolve_staff_actor(
    session: AsyncSession, identity: IdentityClaims, organization_slug: str
) -> StaffActor:
    organization = await session.scalar(
        select(Organization).where(Organization.slug == organization_slug)
    )
    user = await session.scalar(
        select(InternalUser).where(
            InternalUser.external_auth_id == identity.subject,
            InternalUser.is_active.is_(True),
        )
    )
    if organization is None:
        raise IntakeAuthorizationError(
            StaffAuthorizationReason.ORGANIZATION_NOT_FOUND, organization_slug
        )
    if user is None:
        raise IntakeAuthorizationError(
            StaffAuthorizationReason.ACCOUNT_NOT_PROVISIONED, organization_slug
        )

    memberships = (
        await session.scalars(
            select(OrganizationMembership).where(
                OrganizationMembership.organization_id == organization.id,
                OrganizationMembership.user_id == user.id,
                OrganizationMembership.status == MembershipStatus.ACTIVE,
            )
        )
    ).all()
    roles = frozenset(membership.role for membership in memberships)

    # D-051: a platform superadmin acts inside the tenant with the full staff
    # capability set, with or without membership rows. This mirrors the
    # frontend guards, which already let a superadmin reach both the org_admin
    # and therapist surfaces (`isWorkspaceAdmin`/`isWorkspaceTherapist`) —
    # without this, every such page renders and then fails on its first API
    # call, which is the exact frontend-allows/backend-rejects split that
    # made the CMS editor look broken on 2026-07-30.
    #
    # `user.is_superadmin` is a PostgreSQL column, never a Clerk claim
    # (rules §10.3). Actions stay attributed to this operator's own
    # `user_id`, so `created_by_user_id`/`ContentPublicationEvent.actor_user_id`
    # keep telling the truth about who acted.
    if user.is_superadmin:
        return StaffActor(
            user_id=user.id,
            organization_id=organization.id,
            roles=roles | {MembershipRole.ORG_ADMIN, MembershipRole.THERAPIST},
            is_superadmin=True,
        )

    if not roles.intersection({MembershipRole.ORG_ADMIN, MembershipRole.THERAPIST}):
        raise IntakeAuthorizationError(
            StaffAuthorizationReason.NO_ACTIVE_STAFF_ROLE, organization_slug
        )
    return StaffActor(user_id=user.id, organization_id=organization.id, roles=roles)
