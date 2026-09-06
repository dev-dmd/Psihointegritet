"""Organization locale settings and their audit trail (D-077, D-078)."""

from uuid import uuid4

import pytest
from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from psihointegritet.modules.guidance.authorization import StaffActor
from psihointegritet.modules.identity.models import InternalUser, MembershipRole
from psihointegritet.modules.organizations import service
from psihointegritet.modules.organizations.models import (
    Organization,
    OrganizationAuditEvent,
)
from psihointegritet.modules.organizations.schemas import OrganizationLocaleUpdate


async def _org(session: AsyncSession, suffix: str) -> tuple[Organization, InternalUser]:
    unique = uuid4().hex[:10]
    organization = Organization(slug=f"{suffix}-{unique}", display_name="Test")
    user = InternalUser(external_auth_id=f"{suffix}-user-{unique}")
    session.add_all([organization, user])
    await session.flush()
    return organization, user


def _actor(
    user: InternalUser, org: Organization, *, admin: bool, superadmin: bool = False
) -> StaffActor:
    return StaffActor(
        user_id=user.id,
        organization_id=org.id,
        roles=frozenset({MembershipRole.ORG_ADMIN} if admin else {MembershipRole.THERAPIST}),
        is_superadmin=superadmin,
    )


async def _events(session: AsyncSession, org: Organization) -> list[OrganizationAuditEvent]:
    return list(
        await session.scalars(
            select(OrganizationAuditEvent).where(OrganizationAuditEvent.organization_id == org.id)
        )
    )


async def test_a_new_organization_starts_at_the_platform_default(
    db_session: AsyncSession,
) -> None:
    """The `server_default` half of the D-077 asymmetry, against a real database."""
    organization, _ = await _org(db_session, "defaults")
    await db_session.refresh(organization)

    assert organization.ui_locale == "en"
    assert organization.default_content_locale == "en"


async def test_org_admin_changes_their_own_languages_and_leaves_a_member_record(
    db_session: AsyncSession,
) -> None:
    organization, user = await _org(db_session, "own")

    await service.update_locales(
        db_session,
        actor=_actor(user, organization, admin=True),
        organization_id=organization.id,
        payload=OrganizationLocaleUpdate.model_validate(
            {
                "uiLocale": "sr-Latn",
                "defaultContentLocale": "sr-Latn",
            }
        ),
    )

    assert organization.ui_locale == "sr-Latn"
    events = await _events(db_session, organization)
    assert len(events) == 1
    assert events[0].actor_kind == "member"
    assert events[0].actor_user_id == user.id
    assert events[0].details["before"] == {
        "uiLocale": "en",
        "defaultContentLocale": "en",
    }


async def test_a_therapist_may_not_change_them(db_session: AsyncSession) -> None:
    # Nav hiding is never authorization — the panel does not offer this, and the
    # service refuses it anyway.
    organization, user = await _org(db_session, "therapist")

    with pytest.raises(HTTPException) as raised:
        await service.update_locales(
            db_session,
            actor=_actor(user, organization, admin=False),
            organization_id=organization.id,
            payload=OrganizationLocaleUpdate.model_validate(
                {
                    "uiLocale": "sr-Latn",
                    "defaultContentLocale": "sr-Latn",
                }
            ),
        )

    assert raised.value.status_code == 403
    assert raised.value.detail["code"] == "ORG-AUTH-001"  # type: ignore[index]


async def test_an_operator_correcting_another_organization_must_state_a_reason(
    db_session: AsyncSession,
) -> None:
    target, _ = await _org(db_session, "target")
    _, operator_user = await _org(db_session, "platform")
    home, _ = await _org(db_session, "home")
    operator = _actor(operator_user, home, admin=True, superadmin=True)

    with pytest.raises(HTTPException) as raised:
        await service.update_locales(
            db_session,
            actor=operator,
            organization_id=target.id,
            payload=OrganizationLocaleUpdate.model_validate(
                {
                    "uiLocale": "sr-Latn",
                    "defaultContentLocale": "sr-Latn",
                }
            ),
        )

    assert raised.value.status_code == 422
    assert raised.value.detail["code"] == "ORG-AUTH-002"  # type: ignore[index]


async def test_an_operator_correction_is_recorded_as_operator_not_member(
    db_session: AsyncSession,
) -> None:
    """The distinction D-078 exists for.

    Without `actor_kind` this row is indistinguishable from the organization's
    own admin making the change, and the admin has no way to tell that the
    platform intervened.
    """
    target, _ = await _org(db_session, "target")
    home, operator_user = await _org(db_session, "operator")
    operator = _actor(operator_user, home, admin=True, superadmin=True)

    await service.update_locales(
        db_session,
        actor=operator,
        organization_id=target.id,
        payload=OrganizationLocaleUpdate.model_validate(
            {
                "uiLocale": "sr-Latn",
                "defaultContentLocale": "sr-Latn",
                "reason": "Admin je pogrešno postavio jezik.",
            }
        ),
    )

    events = await _events(db_session, target)
    assert len(events) == 1
    assert events[0].actor_kind == "operator"
    assert events[0].actor_user_id == operator_user.id
    assert events[0].details["reason"] == "Admin je pogrešno postavio jezik."


async def test_a_superadmin_inside_their_own_organization_is_a_member(
    db_session: AsyncSession,
) -> None:
    # The elevated flag does not change whose team they are on. Labelling their
    # everyday work as platform intervention would make the distinction useless.
    organization, user = await _org(db_session, "inside")

    await service.update_locales(
        db_session,
        actor=_actor(user, organization, admin=True, superadmin=True),
        organization_id=organization.id,
        payload=OrganizationLocaleUpdate.model_validate(
            {
                "uiLocale": "sr-Latn",
                "defaultContentLocale": "sr-Latn",
            }
        ),
    )

    events = await _events(db_session, organization)
    assert events[0].actor_kind == "member"


async def test_an_unchanged_setting_writes_no_event(db_session: AsyncSession) -> None:
    # A history full of rows saying nothing happened is how a useful trail
    # becomes noise nobody reads.
    organization, user = await _org(db_session, "noop")

    await service.update_locales(
        db_session,
        actor=_actor(user, organization, admin=True),
        organization_id=organization.id,
        payload=OrganizationLocaleUpdate.model_validate(
            {
                "uiLocale": "en",
                "defaultContentLocale": "en",
            }
        ),
    )

    assert await _events(db_session, organization) == []
