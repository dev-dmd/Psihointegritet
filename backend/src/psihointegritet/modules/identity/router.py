"""Backend-authoritative identity and superadmin membership management (M2.1)."""

from uuid import UUID

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import select

from psihointegritet.api.dependencies import CurrentIdentity, DatabaseSession, RequireSuperadmin
from psihointegritet.modules.identity.models import (
    InternalUser,
    MembershipRole,
    MembershipStatus,
    OrganizationMembership,
)
from psihointegritet.modules.organizations.models import Organization, OrganizationAuditEvent

router = APIRouter(tags=["identity"])
superadmin_router = APIRouter(prefix="/superadmin/organizations", tags=["identity"])


class MembershipOut(BaseModel):
    model_config = ConfigDict(alias_generator=lambda value: value, populate_by_name=True)

    # The frontend deployment boundary is keyed by the stable public slug, not
    # by a database-local UUID (UUIDs intentionally differ per environment).
    organization_id: str = Field(serialization_alias="organizationId")
    roles: list[MembershipRole]


class MeOut(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    user_id: str = Field(serialization_alias="userId")
    email: str | None
    display_name: str | None = Field(serialization_alias="displayName")
    is_superadmin: bool = Field(serialization_alias="isSuperadmin")
    memberships: list[MembershipOut]


class TenantUserOut(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    id: UUID
    external_auth_id: str = Field(serialization_alias="externalAuthId")
    email: str | None
    display_name: str | None = Field(serialization_alias="displayName")
    is_active: bool = Field(serialization_alias="isActive")
    roles: list[MembershipRole]


class MembershipRolesUpdate(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    roles: set[MembershipRole]


async def ensure_internal_user(
    session: DatabaseSession, identity: CurrentIdentity
) -> InternalUser:
    """Register a verified person, but never grant a domain privilege implicitly."""
    user = await session.scalar(
        select(InternalUser).where(InternalUser.external_auth_id == identity.subject)
    )
    if user is None:
        user = InternalUser(external_auth_id=identity.subject, email=identity.email)
        session.add(user)
        await session.flush()
    elif identity.email and user.email != identity.email:
        user.email = identity.email
    return user


async def build_me_response(session: DatabaseSession, user: InternalUser) -> MeOut:
    memberships = list(
        await session.execute(
            select(OrganizationMembership, Organization.slug)
            .join(Organization, Organization.id == OrganizationMembership.organization_id)
            .where(
                OrganizationMembership.user_id == user.id,
                OrganizationMembership.status == MembershipStatus.ACTIVE,
            )
        )
    )
    roles_by_org: dict[str, list[MembershipRole]] = {}
    for membership, organization_slug in memberships:
        roles_by_org.setdefault(organization_slug, []).append(membership.role)
    return MeOut(
        user_id=user.external_auth_id,
        email=user.email,
        display_name=user.display_name,
        is_superadmin=user.is_superadmin,
        memberships=[
            MembershipOut(organization_id=org_id, roles=sorted(roles, key=str))
            for org_id, roles in sorted(roles_by_org.items(), key=lambda item: str(item[0]))
        ],
    )


@router.get("/me", response_model=MeOut, response_model_by_alias=True)
async def read_me(identity: CurrentIdentity, session: DatabaseSession) -> MeOut:
    """Create the neutral internal identity on first verified login and return DB roles."""
    user = await ensure_internal_user(session, identity)
    result = await build_me_response(session, user)
    await session.commit()
    return result


@superadmin_router.get(
    "/{organization_slug}/users",
    response_model=list[TenantUserOut],
    response_model_by_alias=True,
)
async def list_tenant_users(
    organization_slug: str,
    session: DatabaseSession,
    _: RequireSuperadmin,
) -> list[TenantUserOut]:
    organization = await session.scalar(
        select(Organization).where(Organization.slug == organization_slug)
    )
    if organization is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Organization not found")
    users = list(
        await session.scalars(select(InternalUser).order_by(InternalUser.created_at.desc()))
    )
    memberships = list(
        await session.scalars(
            select(OrganizationMembership).where(
                OrganizationMembership.organization_id == organization.id
            )
        )
    )
    roles_by_user: dict[UUID, list[MembershipRole]] = {}
    for membership in memberships:
        if membership.status is MembershipStatus.ACTIVE:
            roles_by_user.setdefault(membership.user_id, []).append(membership.role)
    return [
        TenantUserOut(
            id=user.id,
            external_auth_id=user.external_auth_id,
            email=user.email,
            display_name=user.display_name,
            is_active=user.is_active,
            roles=sorted(roles_by_user.get(user.id, []), key=str),
        )
        for user in users
    ]


@superadmin_router.put(
    "/{organization_slug}/users/{user_id}/roles",
    response_model=TenantUserOut,
    response_model_by_alias=True,
)
async def replace_tenant_user_roles(
    organization_slug: str,
    user_id: UUID,
    payload: MembershipRolesUpdate,
    session: DatabaseSession,
    actor: RequireSuperadmin,
) -> TenantUserOut:
    organization = await session.scalar(
        select(Organization).where(Organization.slug == organization_slug)
    )
    user = await session.get(InternalUser, user_id)
    if organization is None or user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Organization or user not found",
        )

    rows = list(
        await session.scalars(
            select(OrganizationMembership).where(
                OrganizationMembership.organization_id == organization.id,
                OrganizationMembership.user_id == user.id,
            )
        )
    )
    before = sorted(row.role.value for row in rows if row.status is MembershipStatus.ACTIVE)
    by_role = {row.role: row for row in rows}
    for role in MembershipRole:
        row = by_role.get(role)
        if role in payload.roles:
            if row is None:
                session.add(
                    OrganizationMembership(
                        organization_id=organization.id,
                        user_id=user.id,
                        role=role,
                        status=MembershipStatus.ACTIVE,
                    )
                )
            else:
                row.status = MembershipStatus.ACTIVE
        elif row is not None:
            row.status = MembershipStatus.DISABLED

    after = sorted(role.value for role in payload.roles)
    session.add(
        OrganizationAuditEvent(
            organization_id=organization.id,
            actor_user_id=actor.user_id,
            actor_kind="operator",
            event_type="membership_roles_replaced",
            details={"target_user_id": str(user.id), "before": before, "after": after},
        )
    )
    await session.commit()
    return TenantUserOut(
        id=user.id,
        external_auth_id=user.external_auth_id,
        email=user.email,
        display_name=user.display_name,
        is_active=user.is_active,
        roles=sorted(payload.roles, key=str),
    )
