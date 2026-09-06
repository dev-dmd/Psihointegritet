"""Locale defaults on `organizations` (D-077, ADR-026)."""

from typing import cast

from sqlalchemy import Table

from psihointegritet.core.locales import (
    PLATFORM_DEFAULT_LOCALE,
    SUPPORTED_UI_LOCALES,
    is_supported_locale,
)
from psihointegritet.modules.organizations.models import (
    Organization,
    OrganizationAuditEvent,
)


def test_platform_default_is_english() -> None:
    assert PLATFORM_DEFAULT_LOCALE == "en"
    assert PLATFORM_DEFAULT_LOCALE in SUPPORTED_UI_LOCALES


def test_supported_locales_match_the_check_constraint() -> None:
    # Widening this tuple without the matching migration produces an
    # organization the API accepts and the database refuses.
    assert SUPPORTED_UI_LOCALES == ("en", "sr-Latn")
    assert not is_supported_locale("sr")
    assert not is_supported_locale("sr-RS")
    assert not is_supported_locale("de")


def test_a_bare_organization_defaults_to_the_platform_locale() -> None:
    """The asymmetry `alembic check` cannot see.

    The founding tenant is backfilled to `sr-Latn` while the column default is
    `en`, so every *future* organization starts at the platform default. A wrong
    `server_default` in the migration is invisible to schema comparison and
    would only surface as a new organization silently speaking Serbian.
    """
    columns = cast(Table, Organization.__table__).columns
    for name in ("ui_locale", "default_content_locale"):
        default = columns[name].server_default
        assert default is not None, f"{name} has no server default"
        assert PLATFORM_DEFAULT_LOCALE in str(getattr(default, "arg", default))
        assert columns[name].nullable is False


def test_audit_event_records_the_actor_and_the_capacity() -> None:
    """`actor_kind` is what separates an operator from a member (D-078)."""
    columns = cast(Table, OrganizationAuditEvent.__table__).columns
    for required in ("organization_id", "actor_user_id", "actor_kind", "event_type", "details"):
        assert required in columns, f"audit event is missing {required}"

    table = cast(Table, OrganizationAuditEvent.__table__)
    constraint_names = {constraint.name for constraint in table.constraints}
    # The resolved name, matching what the migration created in the database —
    # the naming convention in `db/base.py` expands the short form.
    assert "ck_organization_audit_events_actor_kind_supported" in constraint_names

    # Named `details`, not SQLAlchemy's reserved-word workaround `metadata`
    # that `intake_audit_events` had to use.
    assert columns["details"].name == "details"
