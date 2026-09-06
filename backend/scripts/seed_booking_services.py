"""Seed content_entries for the three booking services if they don't exist yet.

The FK on appointment_requests.service_id references content_entries.
Without these rows the booking submission will fail at the database level.
"""

import asyncio
from uuid import uuid4

from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

DATABASE_URL = (
    "postgresql+asyncpg://psihointegritet:local_only_change_me@localhost:5434/psihointegritet"
)
ORG_SLUG = "psihointegritet"
SERVICES = [
    "individualna-psihoterapija",
    "bracno-savetovanje",
    "roditeljsko-savetovanje",
]


async def main() -> None:
    engine = create_async_engine(DATABASE_URL)
    async with engine.connect() as conn:
        # The locale is explicit: operational writes must not depend on a DB
        # server default that cannot follow the organization.
        result = await conn.execute(
            text("SELECT id, default_content_locale FROM organizations WHERE slug = :slug"),
            {"slug": ORG_SLUG},
        )
        org_row = result.fetchone()
        if not org_row:
            print(f"ERROR: Organization '{ORG_SLUG}' not found.")
            return
        org_id = org_row[0]
        content_locale = org_row[1]

        for slug in SERVICES:
            existing = await conn.execute(
                text("SELECT id FROM content_entries WHERE slug = :slug"),
                {"slug": slug},
            )
            row = existing.fetchone()
            if row:
                print(f"{slug}: {row[0]} (already exists)")
            else:
                new_id = uuid4()
                await conn.execute(
                    text(
                        "INSERT INTO content_entries "
                        "(id, organization_id, content_type, slug, locale) "
                        "VALUES (:id, :org_id, 'service', :slug, :locale)"
                    ),
                    {
                        "id": new_id,
                        "org_id": org_id,
                        "slug": slug,
                        "locale": content_locale,
                    },
                )
                await conn.commit()
                print(f"{slug}: {new_id} (created)")

    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())
