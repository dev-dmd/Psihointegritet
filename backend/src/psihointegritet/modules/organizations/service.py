"""Organization settings use cases (D-077, D-078, ADR-026)."""

from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from psihointegritet.modules.guidance.authorization import StaffActor
from psihointegritet.modules.organizations.models import Organization
from psihointegritet.modules.organizations.schemas import OrganizationLocaleUpdate
from psihointegritet.shared.domain.audit import (
    ActorKind,
    OrganizationEventType,
    actor_kind_for,
    record_organization_event,
)


class OrganizationErrorCode:
    """Codes the frontend turns into words (TODO §5G rule 1)."""

    NOT_FOUND = "ORG-404"
    FORBIDDEN = "ORG-AUTH-001"
    OPERATOR_REASON_REQUIRED = "ORG-AUTH-002"


def _problem(status_code: int, code: str, message: str) -> HTTPException:
    # The structured dict form `api/errors.py` already understands; a bare string
    # would arrive at the client as `code: "http_error"` with a Serbian sentence
    # baked in by the backend, which is what this whole layer exists to avoid.
    return HTTPException(status_code=status_code, detail={"code": code, "message": message})


async def _load(session: AsyncSession, organization_id: UUID) -> Organization:
    organization = await session.scalar(
        select(Organization).where(Organization.id == organization_id)
    )
    if organization is None:
        raise _problem(
            status.HTTP_404_NOT_FOUND,
            OrganizationErrorCode.NOT_FOUND,
            "Organization not found.",
        )
    return organization


async def get_by_slug(session: AsyncSession, slug: str) -> Organization:
    organization = await session.scalar(select(Organization).where(Organization.slug == slug))
    if organization is None:
        raise _problem(
            status.HTTP_404_NOT_FOUND,
            OrganizationErrorCode.NOT_FOUND,
            "Organization not found.",
        )
    return organization


async def get_settings(session: AsyncSession, organization_id: UUID) -> Organization:
    return await _load(session, organization_id)


async def update_locales(
    session: AsyncSession,
    *,
    actor: StaffActor,
    organization_id: UUID,
    payload: OrganizationLocaleUpdate,
) -> Organization:
    """Change an organization's languages, leaving a record of who and in what capacity.

    Two callers are allowed and they are not the same thing:

    - an **org_admin** setting their own organization's languages;
    - a **superadmin** correcting another organization's, as an operator
      intervention (D-077 Amendment 2) — which must state a reason, because
      without one the change is indistinguishable from a mistake once the person
      who made it has moved on.

    A therapist has neither path. Nav hiding is never authorization, so this is
    checked here rather than relied upon in the panel.
    """
    kind = actor_kind_for(actor, organization_id)

    if kind is ActorKind.OPERATOR:
        if not actor.is_superadmin:
            raise _problem(
                status.HTTP_403_FORBIDDEN,
                OrganizationErrorCode.FORBIDDEN,
                "Only a platform operator may change another organization's settings.",
            )
        if not (payload.reason or "").strip():
            raise _problem(
                status.HTTP_422_UNPROCESSABLE_ENTITY,
                OrganizationErrorCode.OPERATOR_REASON_REQUIRED,
                "An operator changing another organization's settings must state a reason.",
            )
    elif not actor.is_org_admin:
        raise _problem(
            status.HTTP_403_FORBIDDEN,
            OrganizationErrorCode.FORBIDDEN,
            "Only an organization administrator may change these settings.",
        )

    organization = await _load(session, organization_id)
    before = {
        "uiLocale": organization.ui_locale,
        "defaultContentLocale": organization.default_content_locale,
    }
    after = {
        "uiLocale": payload.ui_locale,
        "defaultContentLocale": payload.default_content_locale,
    }

    if before == after:
        # Nothing changed — recording it would fill the admin's history with rows
        # that say nothing happened, which is how a useful trail becomes noise.
        return organization

    organization.ui_locale = payload.ui_locale
    organization.default_content_locale = payload.default_content_locale

    details: dict[str, object] = {"before": before, "after": after}
    if payload.reason:
        details["reason"] = payload.reason.strip()

    await record_organization_event(
        session,
        actor=actor,
        organization_id=organization_id,
        event_type=OrganizationEventType.LOCALES_CHANGED,
        details=details,
    )
    await session.flush()
    return organization
