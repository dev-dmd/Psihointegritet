"""Unify Intake & Matching support-area taxonomy.

Revision ID: 20260730_0010
Revises: 20260730_0009
Create Date: 2026-07-30
"""

from __future__ import annotations

import json
from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa


revision: str = "20260730_0010"
down_revision: str | None = "20260730_0009"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


UNIFIED_AREAS = [
    "anxiety_stress",
    "relationships",
    "parenting",
    "trauma_crisis",
    "personal_growth",
]

LEGACY_AREAS_BY_SLUG = {
    "anja-stamenkovic": [
        "individualna psihoterapija",
        "bračno savetovanje",
        "burnout",
        "emocionalni razvoj",
        "lični razvoj",
        "trauma",
        "gubitak i žalovanje",
        "anksioznost",
        "roditeljsko savetovanje",
        "samopouzdanje",
        "zavisnost",
    ],
    "marija-stamenkovic": [
        "rad sa adolescentima",
        "samopouzdanje",
        "emocionalne teškoće",
        "trauma",
        "anksioznost",
        "depresivnost",
        "roditeljsko savetovanje",
        "lični razvoj",
    ],
    "marjan-jankovic": [
        "partnerski odnosi",
        "emocionalna regulacija",
        "stres",
        "lični razvoj",
        "samopoštovanje",
        "roditeljsko savetovanje",
        "trauma",
        "anksioznost",
    ],
}


def _set_areas(slug: str, areas: list[str]) -> None:
    op.get_bind().execute(
        sa.text(
            """
            UPDATE therapist_matching_profiles
            SET areas = CAST(:areas AS JSON)
            WHERE slug = :slug
            """
        ),
        {"slug": slug, "areas": json.dumps(areas, ensure_ascii=False)},
    )


def upgrade() -> None:
    for slug in LEGACY_AREAS_BY_SLUG:
        _set_areas(slug, UNIFIED_AREAS)


def downgrade() -> None:
    for slug, areas in LEGACY_AREAS_BY_SLUG.items():
        _set_areas(slug, areas)
