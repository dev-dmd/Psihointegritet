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
    if not roles.intersection({MembershipRole.ORG_ADMIN, MembershipRole.THERAPIST}):
        raise IntakeAuthorizationError("Staff membership is not provisioned")
    return StaffActor(user_id=user.id, organization_id=organization.id, roles=roles)
