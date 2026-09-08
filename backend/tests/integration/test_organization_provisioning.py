"""Organization provisioning against the real, migrated PostgreSQL schema.

This is the step that turns "we have a new customer" into a row instead of a
migration, so the properties worth proving are the ones that make it safe to
re-run: it must be idempotent, and it must refuse to quietly rewrite a tenant
that already exists.

The audit assertions are here rather than in a unit test because the value being
checked — `actor_kind = 'system'` — is enforced by a database CHECK constraint,
and a test that never reaches PostgreSQL would pass with the constraint still
rejecting the write in production.
"""

import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from psihointegritet.modules.organizations.models import Organization, OrganizationAuditEvent
from psihointegritet.modules.organizations.provisioning import (
    OrganizationProvisioningError,
    OrganizationProvisioningRequest,
    list_organizations,
    normalize_organization_slug,
    provision_organization,
)

SLUG = "provisioning-test-tenant"


def request(**overrides: object) -> OrganizationProvisioningRequest:
    defaults: dict[str, object] = {
        "slug": SLUG,
        "display_name": "Provisioning Test Tenant",
        "ui_locale": "sr-Latn",
        "default_content_locale": "sr-Latn",
    }
    defaults.update(overrides)
    return OrganizationProvisioningRequest(**defaults)  # pyright: ignore[reportArgumentType]


async def audit_rows(
    session: AsyncSession, organization_id: object
) -> list[OrganizationAuditEvent]:
    rows = await session.scalars(
        select(OrganizationAuditEvent).where(
            OrganizationAuditEvent.organization_id == organization_id
        )
    )
    return list(rows)


async def test_creates_the_organization_with_a_real_uuid(db_session: AsyncSession) -> None:
    result = await provision_organization(db_session, request())

    assert result.created is True
    assert result.slug == SLUG

    stored = await db_session.scalar(select(Organization).where(Organization.slug == SLUG))
    assert stored is not None
    assert stored.id == result.organization_id
    assert stored.display_name == "Provisioning Test Tenant"
    assert stored.ui_locale == "sr-Latn"
    assert stored.default_content_locale == "sr-Latn"


async def test_records_a_system_actor_audit_event(db_session: AsyncSession) -> None:
    # The point of D-078's extension: tenant creation has no signed-in person,
    # and must still leave a record rather than being exempted from one.
    result = await provision_organization(db_session, request())

    events = await audit_rows(db_session, result.organization_id)
    assert len(events) == 1
    event = events[0]
    assert event.event_type == "organization.created"
    assert event.actor_kind == "system"
    assert event.actor_user_id is None
    assert event.details["slug"] == SLUG
    assert event.details["uiLocale"] == "sr-Latn"


async def test_rerunning_is_idempotent_and_writes_nothing(db_session: AsyncSession) -> None:
    first = await provision_organization(db_session, request())
    second = await provision_organization(db_session, request())

    assert second.created is False
    assert second.organization_id == first.organization_id

    organizations = await db_session.scalars(select(Organization).where(Organization.slug == SLUG))
    assert len(list(organizations)) == 1
    # A second identical run must not add a second "created" record, or the
    # trail starts describing events that never happened.
    assert len(await audit_rows(db_session, first.organization_id)) == 1


@pytest.mark.parametrize(
    ("field", "value"),
    [
        ("display_name", "Something Else"),
        ("ui_locale", "en"),
        ("default_content_locale", "en"),
    ],
)
async def test_same_slug_with_different_configuration_is_refused(
    db_session: AsyncSession, field: str, value: str
) -> None:
    await provision_organization(db_session, request())

    with pytest.raises(OrganizationProvisioningError) as error:
        await provision_organization(db_session, request(**{field: value}))

    # The message has to name the field, or an operator sees "conflict" and has
    # to diff the database by hand to find out which value they mistyped.
    assert field in str(error.value)

    stored = await db_session.scalar(select(Organization).where(Organization.slug == SLUG))
    assert stored is not None
    assert getattr(stored, field) != value


async def test_unsupported_locale_is_refused(db_session: AsyncSession) -> None:
    with pytest.raises(OrganizationProvisioningError, match="not supported"):
        await provision_organization(db_session, request(ui_locale="de"))


async def test_blank_display_name_is_refused(db_session: AsyncSession) -> None:
    with pytest.raises(OrganizationProvisioningError, match="Display name"):
        await provision_organization(db_session, request(display_name="   "))


async def test_lists_provisioned_organizations(db_session: AsyncSession) -> None:
    await provision_organization(db_session, request())

    slugs = [organization.slug for organization in await list_organizations(db_session)]
    assert SLUG in slugs


class TestSlugNormalization:
    """Normalization runs once, at creation, and refuses rather than mangles."""

    @pytest.mark.parametrize(
        ("raw", "expected"),
        [
            ("sanja-neuer", "sanja-neuer"),
            ("  Sanja-Neuer  ", "sanja-neuer"),
            ("Sanja Neuer", "sanja-neuer"),
            ("Sanja  Perković   Neuer", "sanja-perkovic-neuer"),
            ("Šarena Ćuprija", "sarena-cuprija"),
            ("tenant--with---dashes", "tenant-with-dashes"),
        ],
    )
    def test_folds_input_into_a_slug(self, raw: str, expected: str) -> None:
        assert normalize_organization_slug(raw) == expected

    @pytest.mark.parametrize("raw", ["", "   ", "---", "!!!"])
    def test_refuses_input_with_nothing_usable(self, raw: str) -> None:
        with pytest.raises(OrganizationProvisioningError):
            normalize_organization_slug(raw)

    def test_refuses_a_slug_longer_than_the_column(self) -> None:
        with pytest.raises(OrganizationProvisioningError, match="limit is 80"):
            normalize_organization_slug("a" * 81)
