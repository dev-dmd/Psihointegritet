"""`list_published` must keep serving system content only — for now.

This is the sharpest coupling in the article vertical, and it fails silently.
The frontend parser `parsePublishedContentOverrides` returns `null` for any
unrecognised `contentType`, and `getContentProvider` treats `null` as total
failure and falls back to the checked-in static provider. So the day an article
enters this payload before the parser learns about it, **every CMS override on
the whole public site disappears at once** — no error, no empty page, just the
repository's fallback copy quietly serving stale content.

Articles get their own public endpoint instead (ADR-019 §12). This test exists
so the boundary is removed on purpose, with the parser updated in the same
change, rather than by someone relaxing a filter that looked redundant.
"""

from uuid import uuid4

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from psihointegritet.modules.content.models import (
    ContentEntry,
    ContentRevision,
    ContentTemplate,
    ContentType,
)
from psihointegritet.modules.content.service import ContentService
from psihointegritet.modules.organizations.models import Organization
from psihointegritet.shared.domain.publication import RevisionStatus

LOCALE = "sr-Latn"


@pytest.fixture
async def organization(db_session: AsyncSession) -> Organization:
    row = Organization(slug=f"public-read-{uuid4().hex[:8]}", display_name="Public read model")
    db_session.add(row)
    await db_session.flush()
    return row


async def publish(
    session: AsyncSession,
    organization: Organization,
    *,
    content_type: ContentType,
    slug: str,
    template: ContentTemplate,
) -> None:
    entry = ContentEntry(
        organization_id=organization.id,
        content_type=content_type,
        slug=slug,
        locale=LOCALE,
    )
    session.add(entry)
    await session.flush()
    session.add(
        ContentRevision(
            entry_id=entry.id,
            version_label="v1",
            template=template,
            slot_data={},
            seo={"title": "Naslov", "description": "Opis"},
            status=RevisionStatus.PUBLISHED,
        )
    )
    await session.flush()


async def test_a_published_article_never_reaches_the_public_system_read_model(
    db_session: AsyncSession, organization: Organization
) -> None:
    await publish(
        db_session,
        organization,
        content_type=ContentType.STATIC_PAGE,
        slug="o-nama",
        template=ContentTemplate.STATIC_INFORMATION,
    )
    await publish(
        db_session,
        organization,
        content_type=ContentType.ARTICLE,
        slug="anksioznost-nije-vas-neprijatelj",
        template=ContentTemplate.ARTICLE_DETAIL,
    )

    published = await ContentService(db_session).list_published(organization.id, LOCALE)

    slugs = {item.slug for item in published}
    assert "o-nama" in slugs
    assert "anksioznost-nije-vas-neprijatelj" not in slugs
    assert all(item.content_type is not ContentType.ARTICLE for item in published)
