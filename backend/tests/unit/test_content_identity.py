"""The write boundary for CMS identities (ADR-019 §3).

Two registries with different shapes share one door. The tests below hold the
part that is easy to lose later: opening the door for articles must not open it
for anything else, and the twelve system pages must stay behind their allowlist.
"""

import json
from pathlib import Path

import pytest

from psihointegritet.modules.content.identity import (
    RESERVED_ARTICLE_SLUGS,
    is_article_identity,
    is_publicly_routable_content,
    require_content_identity,
)
from psihointegritet.modules.content.models import ContentTemplate, ContentType
from psihointegritet.modules.content.system_catalog import SYSTEM_CONTENT_TEMPLATES
from psihointegritet.shared.domain.content_management import ContentManagement

FIXTURE_PATH = (
    Path(__file__).resolve().parents[3]
    / "contracts"
    / "fixtures"
    / "reserved-article-slugs.v1.json"
)

ARTICLE_SLUG = "anksioznost-nije-vas-neprijatelj"


def article(slug: str = ARTICLE_SLUG, template: ContentTemplate = ContentTemplate.ARTICLE_DETAIL):
    return (ContentType.ARTICLE, slug, template, "sr-Latn")


def test_an_article_owns_its_identity_and_reports_its_registry() -> None:
    assert require_content_identity(*article()) is ContentManagement.ARTICLE


def test_a_system_page_still_goes_through_the_allowlist() -> None:
    assert (
        require_content_identity(
            ContentType.STATIC_PAGE, "o-nama", ContentTemplate.STATIC_INFORMATION, "sr-Latn"
        )
        is ContentManagement.SYSTEM
    )


def test_an_unregistered_system_page_is_still_refused() -> None:
    # The point of the whole allowlist: no API call invents a public route.
    with pytest.raises(ValueError, match="not registered as system content"):
        require_content_identity(
            ContentType.STATIC_PAGE, "izmisljena", ContentTemplate.STATIC_INFORMATION, "sr-Latn"
        )


def test_an_article_on_another_template_is_refused() -> None:
    with pytest.raises(ValueError, match="article_detail"):
        require_content_identity(*article(template=ContentTemplate.STATIC_INFORMATION))


@pytest.mark.parametrize("slug", ["Veliko-Slovo", "sa razmakom", "dupli--crtica", "-vodeca"])
def test_a_malformed_slug_is_refused(slug: str) -> None:
    with pytest.raises(ValueError, match="lowercase"):
        require_content_identity(*article(slug=slug))


def test_a_reserved_slug_is_refused() -> None:
    with pytest.raises(ValueError, match="reserved"):
        require_content_identity(*article(slug="pretraga"))


def test_the_system_catalogue_can_never_hold_an_article() -> None:
    # The article branch is reachable only for `ContentType.ARTICLE`, and this
    # allowlist has no article key. Both halves must stay true, or an article
    # could acquire a system identity and with it a system route.
    assert not any(key[0] is ContentType.ARTICLE for key in SYSTEM_CONTENT_TEMPLATES)


def test_publicly_routable_covers_both_registries_and_nothing_else() -> None:
    assert is_publicly_routable_content(*article())
    assert is_publicly_routable_content(
        ContentType.STATIC_PAGE, "o-nama", ContentTemplate.STATIC_INFORMATION, "sr-Latn"
    )
    # A well-formed slug on an unregistered system identity stays out.
    assert not is_publicly_routable_content(
        ContentType.STATIC_PAGE, "izmisljena", ContentTemplate.STATIC_INFORMATION, "sr-Latn"
    )


def test_every_supported_locale_can_own_article_and_system_content() -> None:
    assert is_article_identity(
        ContentType.ARTICLE, ARTICLE_SLUG, ContentTemplate.ARTICLE_DETAIL, "en"
    )
    assert (
        require_content_identity(
            ContentType.STATIC_PAGE, "o-nama", ContentTemplate.STATIC_INFORMATION, "en"
        )
        is ContentManagement.SYSTEM
    )


def test_an_unsupported_locale_is_not_a_content_identity() -> None:
    assert not is_article_identity(
        ContentType.ARTICLE, ARTICLE_SLUG, ContentTemplate.ARTICLE_DETAIL, "de"
    )
    with pytest.raises(ValueError, match="Unsupported content locale"):
        require_content_identity(
            ContentType.STATIC_PAGE, "o-nama", ContentTemplate.STATIC_INFORMATION, "de"
        )


def test_reserved_slugs_match_the_shared_fixture() -> None:
    fixture = json.loads(FIXTURE_PATH.read_text(encoding="utf-8"))
    assert set(fixture["slugs"]) == RESERVED_ARTICLE_SLUGS
