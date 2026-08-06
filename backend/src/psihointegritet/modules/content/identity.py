"""Who may exist as CMS content, and under which ownership (ADR-019 §3).

Two identity models live side by side and must not be merged:

* **System content** is a closed allowlist of twelve known pages
  (`system_catalog.py`). Staff may fill them in, never invent one. That guard
  is the reason a direct API call cannot conjure a public route.
* **Articles** are unbounded — one entry per published text — so an allowlist
  cannot express them. They get their own rules instead: one template, one
  locale, a slug shape, and a small reserved list.

This module is the single door. `system_catalog.py` is deliberately left
untouched: the article branch is reachable only when the content type *is*
`article`, and the allowlist is keyed by `(ContentType, str)` with no article
key, so no article can ever resolve to a system identity. A test pins that.
"""

from __future__ import annotations

import re
from typing import Final

from psihointegritet.modules.content.models import ContentTemplate, ContentType
from psihointegritet.modules.content.system_catalog import (
    SYSTEM_CONTENT_LOCALE,
    is_system_content_definition,
    require_system_content_definition,
)
from psihointegritet.shared.domain.content_management import ContentManagement

#: Lowercase words joined by single hyphens. Shared with Content Health so a
#: slug that passes creation cannot fail publication for its shape alone.
CONTENT_SLUG_PATTERN: Final = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")

#: Mirrors `contracts/fixtures/reserved-article-slugs.v1.json`; parity asserted
#: by tests on both sides, exactly like the custom-document reservation.
#:
#: These are the sibling paths a future `/znanje/*` surface would claim (a
#: listing, a search page, a per-category or per-author index). An article that
#: took one of them would win the route and silently hide that page later.
RESERVED_ARTICLE_SLUGS: Final[frozenset[str]] = frozenset(
    {
        "arhiva",
        "autori",
        "index",
        "kategorije",
        "pretraga",
    }
)


def is_valid_content_slug(slug: str) -> bool:
    return bool(CONTENT_SLUG_PATTERN.fullmatch(slug))


def is_article_identity(
    content_type: ContentType,
    slug: str,
    template: ContentTemplate,
    locale: str,
) -> bool:
    return (
        content_type is ContentType.ARTICLE
        and template is ContentTemplate.ARTICLE_DETAIL
        and locale == SYSTEM_CONTENT_LOCALE
        and is_valid_content_slug(slug)
        and slug not in RESERVED_ARTICLE_SLUGS
    )


def is_publicly_routable_content(
    content_type: ContentType,
    slug: str,
    template: ContentTemplate,
    locale: str,
) -> bool:
    """True for anything that owns a public route this platform renders.

    Kompas eligibility asks exactly this question. Asking
    `is_system_content_definition` instead is what kept articles out of the
    discovery read-model even after they became governed content.
    """
    return is_system_content_definition(
        content_type, slug, template, locale
    ) or is_article_identity(content_type, slug, template, locale)


def require_content_identity(
    content_type: ContentType,
    slug: str,
    template: ContentTemplate,
    locale: str,
) -> ContentManagement:
    """Validate a new entry's identity and report which registry owns it."""

    if content_type is ContentType.ARTICLE:
        if locale != SYSTEM_CONTENT_LOCALE:
            raise ValueError(f"Articles currently support only locale {SYSTEM_CONTENT_LOCALE!r}")
        if template is not ContentTemplate.ARTICLE_DETAIL:
            raise ValueError(
                f"An article requires template {ContentTemplate.ARTICLE_DETAIL.value!r}"
            )
        if not is_valid_content_slug(slug):
            raise ValueError(
                "Article slug may contain only lowercase letters, digits and single hyphens"
            )
        if slug in RESERVED_ARTICLE_SLUGS:
            raise ValueError(f"Slug {slug!r} is reserved for a future /znanje page")
        return ContentManagement.ARTICLE

    require_system_content_definition(content_type, slug, template, locale)
    return ContentManagement.SYSTEM
