"""Locale selection at the CMS creation boundary (D-077 A5)."""

import pytest
from pydantic import ValidationError

from psihointegritet.modules.content.models import ContentTemplate, ContentType
from psihointegritet.modules.content.schemas import CreateContentEntryRequest
from psihointegritet.modules.content.service import resolve_content_creation_locale


def request(**overrides: object) -> CreateContentEntryRequest:
    values: dict[str, object] = {
        "content_type": ContentType.STATIC_PAGE,
        "slug": "o-nama",
        "template": ContentTemplate.STATIC_INFORMATION,
    }
    values.update(overrides)
    return CreateContentEntryRequest.model_validate(values)


def test_omitted_locale_stays_absent_until_the_verified_org_is_loaded() -> None:
    assert request().locale is None
    assert resolve_content_creation_locale(None, "en") == "en"
    assert resolve_content_creation_locale(None, "sr-Latn") == "sr-Latn"


def test_an_explicit_supported_locale_wins_over_the_creation_default() -> None:
    payload = request(locale="sr-Latn")
    assert resolve_content_creation_locale(payload.locale, "en") == "sr-Latn"


def test_an_explicit_unsupported_locale_is_rejected_by_the_api_schema() -> None:
    with pytest.raises(ValidationError):
        request(locale="de")


def test_an_invalid_organization_default_fails_closed() -> None:
    with pytest.raises(ValueError, match="Unsupported content locale"):
        resolve_content_creation_locale(None, "de")
