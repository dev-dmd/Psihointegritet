"""20260810_0025_us_locations

Move the in-person locations from Niš / Leskovac to Chicago, Milwaukee and
Madison (D-076).

Why a migration and not just `provision_team.py`: that command copies the
predecessor's matching attributes, so the three profiles it created on
2026-08-10 inherited the old Serbian cities. `DEFAULT_PROFILES` in
`modules/guidance/matching.py` is only the fallback used when the table is
empty — the live matching service reads these rows. Leaving them means the
questionnaire offers Chicago and then finds nobody, because the in-person
filter compares the answer against exactly this column.

Keyed by slug rather than by old value: the outgoing profiles are paused, not
deleted, and rewriting their cities too would quietly claim the former team
works in the United States.

`locations` is a JSON column, so the value is written as a JSON array literal.

Revision ID: d1c7a4e90b52
Revises: cbecea5ab37d
Create Date: 2026-08-10 21:12:04.881330

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "d1c7a4e90b52"
down_revision: str | Sequence[str] | None = "cbecea5ab37d"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

#: therapist profile slug -> the single city that person works from in person
CITY_BY_SLUG: dict[str, str] = {
    "maria-bullock": "Chicago",
    "elsa-browers": "Milwaukee",
    "john-francis": "Madison",
}

#: what each of those profiles inherited from the predecessor it replaced
PREVIOUS_CITY_BY_SLUG: dict[str, str] = {
    "maria-bullock": "Niš",
    "elsa-browers": "Leskovac",
    "john-francis": "Leskovac",
}


def _apply(cities: dict[str, str]) -> None:
    statement = sa.text(
        "UPDATE therapist_matching_profiles SET locations = CAST(:locations AS json) "
        "WHERE slug = :slug"
    )
    connection = op.get_bind()
    for slug, city in cities.items():
        connection.execute(statement, {"slug": slug, "locations": f'["{city}"]'})


def upgrade() -> None:
    _apply(CITY_BY_SLUG)


def downgrade() -> None:
    _apply(PREVIOUS_CITY_BY_SLUG)
