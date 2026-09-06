"""HTTP adapters for organization settings (D-077, D-078, ADR-026).

`/organizations/me` is the actor's own organization; `/organizations/{id}` is the
operator path a superadmin uses to correct another one. Two routes rather than
one with an optional parameter, so the elevated call is visible in the access
log and in the OpenAPI surface instead of hiding behind a default.
"""

from uuid import UUID

from fastapi import APIRouter

from psihointegritet.api.dependencies import DatabaseSession, RequireStaff
from psihointegritet.modules.organizations import service
from psihointegritet.modules.organizations.schemas import (
    OrganizationLocalesOut,
    OrganizationLocaleUpdate,
    OrganizationSettingsOut,
)

router = APIRouter(prefix="/organizations", tags=["organizations"])
public_router = APIRouter(prefix="/public/organizations", tags=["organizations"])


@public_router.get("/{slug}/locales", response_model=OrganizationLocalesOut)
async def read_public_locales(slug: str, session: DatabaseSession) -> OrganizationLocalesOut:
    """The languages an organization renders in, by slug.

    Unauthenticated on purpose, and deliberately narrow — it returns two locale
    codes and nothing else. Both are already evident to anyone who loads the
    public site, so this discloses nothing the page does not.

    It exists because the frontend must know the locale **at build time**, with
    no user session, or every public page falls from static to per-request
    rendering (ADR-026 §3). A 404 here is not an error the visitor sees: the
    frontend falls back to its checked-in registry so a build never depends on
    this service being reachable.
    """
    organization = await service.get_by_slug(session, slug)
    return OrganizationLocalesOut.model_validate(organization, from_attributes=True)


@router.get("/me", response_model=OrganizationSettingsOut, response_model_by_alias=True)
async def read_my_organization(
    session: DatabaseSession,
    actor: RequireStaff,
) -> OrganizationSettingsOut:
    organization = await service.get_settings(session, actor.organization_id)
    return OrganizationSettingsOut.model_validate(organization, from_attributes=True)


@router.patch("/me/locales", response_model=OrganizationSettingsOut, response_model_by_alias=True)
async def update_my_organization_locales(
    session: DatabaseSession,
    actor: RequireStaff,
    payload: OrganizationLocaleUpdate,
) -> OrganizationSettingsOut:
    organization = await service.update_locales(
        session,
        actor=actor,
        organization_id=actor.organization_id,
        payload=payload,
    )
    await session.commit()
    return OrganizationSettingsOut.model_validate(organization, from_attributes=True)


@router.patch(
    "/{organization_id}/locales",
    response_model=OrganizationSettingsOut,
    response_model_by_alias=True,
)
async def update_organization_locales_as_operator(
    organization_id: UUID,
    session: DatabaseSession,
    actor: RequireStaff,
    payload: OrganizationLocaleUpdate,
) -> OrganizationSettingsOut:
    """Operator correction (D-077 Amendment 2). Requires superadmin and a reason."""
    organization = await service.update_locales(
        session,
        actor=actor,
        organization_id=organization_id,
        payload=payload,
    )
    await session.commit()
    return OrganizationSettingsOut.model_validate(organization, from_attributes=True)
