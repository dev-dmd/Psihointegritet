from dataclasses import dataclass
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


class IntakeAuthorizationError(PermissionError):
    """A protected Intake action failed its internal tenant and role checks."""


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
    if organization is None or user is None:
        raise IntakeAuthorizationError("Staff membership is not provisioned")

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
        raise IntakeAuthorizationError("Staff membership is not provisioned")
    return StaffActor(user_id=user.id, organization_id=organization.id, roles=roles)
