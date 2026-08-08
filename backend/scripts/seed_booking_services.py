"""Seed content_entries for the three booking services if they don't exist yet.

The FK on appointment_requests.service_id references content_entries.
Without these rows the booking submission will fail at the database level.
"""
import asyncio
from uuid import uuid4

from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

DATABASE_URL = "postgresql+asyncpg://psihointegritet:local_only_change_me@localhost:5434/psihointegritet"
ORG_SLUG = "psihointegritet"
SERVICES = [
    "individualna-psihoterapija",
    "bracno-savetovanje",
    "roditeljsko-savetovanje",
]


async def main() -> None:
    engine = create_async_engine(DATABASE_URL)
    async with engine.connect() as conn:
        # Get organization_id
        result = await conn.execute(
            text("SELECT id FROM organizations WHERE slug = :slug"),
            {"slug": ORG_SLUG},
        )
        org_row = result.fetchone()
        if not org_row:
            print(f"ERROR: Organization '{ORG_SLUG}' not found.")
            return
        org_id = org_row[0]

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
                        "INSERT INTO content_entries (id, organization_id, content_type, slug) "
                        "VALUES (:id, :org_id, 'service', :slug)"
                    ),
                    {"id": new_id, "org_id": org_id, "slug": slug},
                )
                await conn.commit()
                print(f"{slug}: {new_id} (created)")

    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())
