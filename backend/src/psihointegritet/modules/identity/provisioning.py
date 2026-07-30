"""Staff provisioning: link a Clerk identity to an internal user and its roles.

Authentication is not authorization (rules §10.3). Signing in with Clerk does
not make anyone staff — `resolve_staff_actor` refuses any subject without an
`InternalUser` row and an active membership. There is deliberately no
just-in-time provisioning, because that would turn "anyone who can sign up"
into "anyone who can read the team queue".

So the rows are created explicitly, by an operator, per environment. The Clerk
subject differs between the development and production Clerk instances, which
is why the external id is an input rather than something the repository can
hardcode.

This module is the use case; `scripts/provision_staff.py` is the entry point.
It is idempotent: re-running with the same input reports "already current"
rather than duplicating rows or failing.
"""

from dataclasses import dataclass
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from psihointegritet.modules.guidance.models import IntakeAssignment, TherapistMatchingProfile
from psihointegritet.modules.identity.models import (
    InternalUser,
    MembershipRole,
    MembershipStatus,
    OrganizationMembership,
)
from psihointegritet.modules.organizations.models import Organization


class ProvisioningError(RuntimeError):
    """Raised when the requested organization or therapist profile is missing."""


@dataclass(frozen=True)
class StaffProvisioningRequest:
    organization_slug: str
    external_auth_id: str
    roles: frozenset[MembershipRole]
    email: str | None = None
    display_name: str | None = None
    therapist_slug: str | None = None
    # Declarative mode: active roles outside `roles` are disabled rather than
    # left alone. Off by default so a mistyped invocation cannot lock someone
    # out of a panel they were legitimately using.
    replace_roles: bool = False
    # Platform operator flag (D-051). Tri-state on purpose: `None` means "do
    # not touch", so an ordinary role provisioning run can never grant or
    # revoke platform-wide access as a side effect. `True`/`False` are the
    # only ways it changes, and both are explicit operator intent.
    superadmin: bool | None = None


@dataclass(frozen=True)
class StaffProvisioningResult:
    user_id: UUID
    organization_id: UUID
    created_user: bool
    email_updated: bool
    display_name_updated: bool
    roles_added: frozenset[MembershipRole]
    roles_reactivated: frozenset[MembershipRole]
    roles_disabled: frozenset[MembershipRole]
    roles_left_in_place: frozenset[MembershipRole]
    therapist_linked: str | None
    #: `True` granted, `False` revoked, `None` untouched (D-051).
    superadmin_changed_to: bool | None = None

    @property
    def changed(self) -> bool:
        return bool(
            self.created_user
            or self.email_updated
            or self.display_name_updated
            or self.roles_added
            or self.roles_reactivated
            or self.roles_disabled
            or self.therapist_linked
            or self.superadmin_changed_to is not None
        )


async def provision_staff(
    session: AsyncSession, request: StaffProvisioningRequest
) -> StaffProvisioningResult:
    """Create or update one staff identity. The caller owns the transaction."""
    organization = await session.scalar(
        select(Organization).where(Organization.slug == request.organization_slug)
    )
    if organization is None:
        raise ProvisioningError(
            f"Organization '{request.organization_slug}' does not exist. "
            "Apply migrations first; the seed creates it."
        )

    user = await session.scalar(
        select(InternalUser).where(InternalUser.external_auth_id == request.external_auth_id)
    )
    created_user = user is None
    if user is None:
        user = InternalUser(
            external_auth_id=request.external_auth_id,
            email=request.email,
            display_name=request.display_name,
        )
        session.add(user)
        await session.flush()

    email_updated = False
    if request.email is not None and user.email != request.email:
        user.email = request.email
        email_updated = True

    display_name_updated = False
    if request.display_name is not None and user.display_name != request.display_name:
        user.display_name = request.display_name
        display_name_updated = True

    superadmin_changed_to: bool | None = None
    if request.superadmin is not None and user.is_superadmin != request.superadmin:
        user.is_superadmin = request.superadmin
        superadmin_changed_to = request.superadmin

    # Reactivating a disabled row keeps the membership's history intact rather
    # than deleting and recreating it.
    existing = list(
        await session.scalars(
            select(OrganizationMembership).where(
                OrganizationMembership.organization_id == organization.id,
                OrganizationMembership.user_id == user.id,
            )
        )
    )
    by_role = {membership.role: membership for membership in existing}

    roles_added: set[MembershipRole] = set()
    roles_reactivated: set[MembershipRole] = set()
    for role in request.roles:
        membership = by_role.get(role)
        if membership is None:
            session.add(
                OrganizationMembership(
                    organization_id=organization.id,
                    user_id=user.id,
                    role=role,
                    status=MembershipStatus.ACTIVE,
                )
            )
            roles_added.add(role)
        elif membership.status is not MembershipStatus.ACTIVE:
            membership.status = MembershipStatus.ACTIVE
            roles_reactivated.add(role)

    extra_active = {
        role
        for role, membership in by_role.items()
        if role not in request.roles and membership.status is MembershipStatus.ACTIVE
    }
    roles_disabled: set[MembershipRole] = set()
    if request.replace_roles:
        for role in extra_active:
            by_role[role].status = MembershipStatus.DISABLED
            roles_disabled.add(role)

    therapist_linked: str | None = None
    if request.therapist_slug is not None:
        profile = await session.scalar(
            select(TherapistMatchingProfile).where(
                TherapistMatchingProfile.organization_id == organization.id,
                TherapistMatchingProfile.slug == request.therapist_slug,
            )
        )
        if profile is None:
            raise ProvisioningError(
                f"Therapist profile '{request.therapist_slug}' does not exist in "
                f"'{request.organization_slug}'."
            )
        if profile.assigned_user_id != user.id:
            profile.assigned_user_id = user.id
            therapist_linked = request.therapist_slug

    return StaffProvisioningResult(
        user_id=user.id,
        organization_id=organization.id,
        created_user=created_user,
        email_updated=email_updated,
        display_name_updated=display_name_updated,
        roles_added=frozenset(roles_added),
        roles_reactivated=frozenset(roles_reactivated),
        roles_disabled=frozenset(roles_disabled),
        roles_left_in_place=frozenset(extra_active - roles_disabled),
        therapist_linked=therapist_linked,
        superadmin_changed_to=superadmin_changed_to,
    )


@dataclass(frozen=True)
class StaffRemovalResult:
    external_auth_id: str
    found: bool
    roles_disabled: frozenset[MembershipRole]
    therapists_unlinked: tuple[str, ...]
    deleted: bool
    claimed_cases: int


async def revoke_staff(
    session: AsyncSession,
    organization_slug: str,
    external_auth_id: str,
    *,
    hard_delete: bool = False,
) -> StaffRemovalResult:
    """Withdraw a staff identity.

    Two modes, for two different situations:

    - **revoke** (default) disables the memberships and unlinks the therapist
      profile but keeps the `InternalUser` row, so an audit trail that points
      at it still resolves. This is what a departure needs.
    - **hard delete** removes the row entirely. It is meant for a mistake —
      an identity that should never have existed, such as one provisioned with
      the wrong Clerk id. It is refused once the person has claimed a case,
      because deleting them would destroy the ownership record of clinical
      work; `intake_assignments.claimed_by_user_id` also enforces this at the
      database level.
    """
    organization = await session.scalar(
        select(Organization).where(Organization.slug == organization_slug)
    )
    if organization is None:
        raise ProvisioningError(f"Organization '{organization_slug}' does not exist.")

    user = await session.scalar(
        select(InternalUser).where(InternalUser.external_auth_id == external_auth_id)
    )
    if user is None:
        return StaffRemovalResult(
            external_auth_id=external_auth_id,
            found=False,
            roles_disabled=frozenset(),
            therapists_unlinked=(),
            deleted=False,
            claimed_cases=0,
        )

    claimed = await session.scalar(
        select(func.count())
        .select_from(IntakeAssignment)
        .where(IntakeAssignment.claimed_by_user_id == user.id)
    )
    claimed_cases = claimed or 0

    profiles = list(
        await session.scalars(
            select(TherapistMatchingProfile).where(
                TherapistMatchingProfile.organization_id == organization.id,
                TherapistMatchingProfile.assigned_user_id == user.id,
            )
        )
    )
    unlinked = tuple(sorted(profile.slug for profile in profiles))
    for profile in profiles:
        profile.assigned_user_id = None

    memberships = list(
        await session.scalars(
            select(OrganizationMembership).where(
                OrganizationMembership.organization_id == organization.id,
                OrganizationMembership.user_id == user.id,
                OrganizationMembership.status == MembershipStatus.ACTIVE,
            )
        )
    )
    disabled: set[MembershipRole] = set()
    for membership in memberships:
        membership.status = MembershipStatus.DISABLED
        disabled.add(membership.role)

    deleted = False
    if hard_delete:
        if claimed_cases:
            raise ProvisioningError(
                f"'{external_auth_id}' has claimed {claimed_cases} case(s); deleting it "
                "would erase who owned that work. The roles are revoked instead — "
                "re-run without --delete to keep the audit trail."
            )
        await session.flush()
        await session.delete(user)
        deleted = True

    return StaffRemovalResult(
        external_auth_id=external_auth_id,
        found=True,
        roles_disabled=frozenset(disabled),
        therapists_unlinked=unlinked,
        deleted=deleted,
        claimed_cases=claimed_cases,
    )


@dataclass(frozen=True)
class StaffSummary:
    external_auth_id: str
    email: str | None
    display_name: str | None
    is_active: bool
    roles: frozenset[MembershipRole]
    disabled_roles: frozenset[MembershipRole]
    therapist_slugs: tuple[str, ...]
    #: Platform operator (D-051). Reported here because it grants the full
    #: staff capability set with no membership row to show for it — an
    #: operator auditing access would otherwise never see it.
    is_superadmin: bool = False


async def list_staff(session: AsyncSession, organization_slug: str) -> list[StaffSummary]:
    """Current provisioning state, for verifying a deploy without guessing."""
    organization = await session.scalar(
        select(Organization).where(Organization.slug == organization_slug)
    )
    if organization is None:
        raise ProvisioningError(f"Organization '{organization_slug}' does not exist.")

    memberships = list(
        await session.scalars(
            select(OrganizationMembership).where(
                OrganizationMembership.organization_id == organization.id
            )
        )
    )
    profiles = list(
        await session.scalars(
            select(TherapistMatchingProfile).where(
                TherapistMatchingProfile.organization_id == organization.id
            )
        )
    )

    summaries: list[StaffSummary] = []
    # Platform superadmins (D-051) hold no membership row yet still carry full
    # staff capability, so they are unioned in explicitly — listing only
    # membership holders would hide exactly the most privileged accounts.
    superadmin_ids = set(
        await session.scalars(select(InternalUser.id).where(InternalUser.is_superadmin.is_(True)))
    )
    user_ids = {membership.user_id for membership in memberships} | superadmin_ids
    for user_id in sorted(user_ids, key=str):
        user = await session.get(InternalUser, user_id)
        if user is None:
            continue
        rows = [membership for membership in memberships if membership.user_id == user_id]
        summaries.append(
            StaffSummary(
                external_auth_id=user.external_auth_id,
                email=user.email,
                display_name=user.display_name,
                is_active=user.is_active,
                roles=frozenset(row.role for row in rows if row.status is MembershipStatus.ACTIVE),
                disabled_roles=frozenset(
                    row.role for row in rows if row.status is not MembershipStatus.ACTIVE
                ),
                therapist_slugs=tuple(
                    sorted(
                        profile.slug for profile in profiles if profile.assigned_user_id == user_id
                    )
                ),
                is_superadmin=user.is_superadmin,
            )
        )
    return summaries
