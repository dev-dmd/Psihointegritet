"""New CMS entries inherit the verified organization's creation locale."""

from uuid import uuid4

from sqlalchemy.ext.asyncio import AsyncSession

from psihointegritet.modules.content.models import ContentTemplate, ContentType
from psihointegritet.modules.content.schemas import CreateContentEntryRequest
from psihointegritet.modules.content.service import ContentService
from psihointegritet.modules.guidance.authorization import StaffActor
from psihointegritet.modules.identity.models import InternalUser, MembershipRole
from psihointegritet.modules.organizations.models import Organization


async def context(
    session: AsyncSession, *, default_content_locale: str
) -> tuple[Organization, StaffActor]:
    suffix = uuid4().hex[:10]
    organization = Organization(
        slug=f"content-locale-{suffix}",
        display_name="Content locale test",
        default_content_locale=default_content_locale,
    )
    user = InternalUser(external_auth_id=f"content-locale-user-{suffix}")
    session.add_all([organization, user])
    await session.flush()
    return organization, StaffActor(
        user_id=user.id,
        organization_id=organization.id,
        roles=frozenset({MembershipRole.ORG_ADMIN}),
    )


async def test_omitted_locale_uses_the_verified_organization_default(
    db_session: AsyncSession,
) -> None:
    _, actor = await context(db_session, default_content_locale="en")

    created = await ContentService(db_session).create_entry(
        actor,
        CreateContentEntryRequest(
            content_type=ContentType.STATIC_PAGE,
            slug="o-nama",
            template=ContentTemplate.STATIC_INFORMATION,
        ),
    )

    assert created.locale == "en"


async def test_explicit_supported_locale_wins_over_the_organization_default(
    db_session: AsyncSession,
) -> None:
    _, actor = await context(db_session, default_content_locale="en")

    created = await ContentService(db_session).create_entry(
        actor,
        CreateContentEntryRequest(
            content_type=ContentType.STATIC_PAGE,
            slug="tim",
            template=ContentTemplate.STATIC_INFORMATION,
            locale="sr-Latn",
        ),
    )

    assert created.locale == "sr-Latn"
