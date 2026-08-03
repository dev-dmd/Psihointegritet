"""Reconcile the D19 schema drift (D-060).

Three separate things, all pre-existing since migrations 0001-0003:

1. ``intake_cases.age_group`` is dropped. Migration 0002 already moved its
   meaning into ``subject_age_band``; no model, service or frontend has read it
   since (verified by grep across ``src/``, ``tests/`` and ``frontend/src``).
   **The drop is guarded**: if any row still carries a value this migration
   cannot account for, it aborts and asks for a human, because 0002 mapped every
   unrecognised value to ``adult`` through an ``ELSE`` branch and that silence is
   exactly what must not be repeated at ``DROP COLUMN`` time.

2. Eight enum-backed columns are widened to the length their model declares.
   These stay ``VARCHAR``. ``value_enum`` builds ``Enum(native_enum=False)``
   deliberately (see ``shared/types/sa_enum.py``), so this migration removes the
   real drift without switching the project to PostgreSQL native enums.

3. The unique-constraint drift on ``intake_assignments``, ``intake_contacts``,
   ``intake_free_texts``, ``internal_users`` and ``organizations`` needs **no
   DDL**. The database has always had a named UNIQUE constraint plus a plain
   index; only the models described it as a single unique index. They were
   corrected to declare the constraint explicitly, so schema and metadata now
   agree without touching a live table.

Nothing here is mixed with feature work: this revision exists so ``alembic
check`` can become a CI gate and RLS-1 can start.
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20260803_0017"
down_revision: str | None = "20260803_0016"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


# The exact mapping migration 0002 applied when it filled `subject_age_band`.
# Keys are the only `age_group` values the intake form could ever produce.
_AGE_GROUP_TO_BAND: dict[str, str] = {
    "Do 7 godina": "under_12",
    "7\u201312 godina": "under_12",
    "13\u201315 godina": "12_15",
    "16\u201317 godina": "16_17",
}

# Columns whose stored length never matched the model. (table, column, old, new)
_ENUM_COLUMN_LENGTHS: tuple[tuple[str, str, int, int], ...] = (
    ("consent_records", "kind", 30, 64),
    ("guidance_sessions", "state", 20, 32),
    ("intake_assignment_events", "event_type", 10, 32),
    ("intake_cases", "submission_kind", 11, 32),
    ("intake_cases", "status", 15, 32),
    ("organization_memberships", "role", 9, 32),
    ("organization_memberships", "status", 8, 32),
    ("therapist_matching_profiles", "capacity_status", 9, 32),
)


def _age_group_column_exists(connection: sa.Connection) -> bool:
    return bool(
        connection.execute(
            sa.text(
                "SELECT 1 FROM information_schema.columns "
                "WHERE table_name = 'intake_cases' AND column_name = 'age_group'"
            )
        ).first()
    )


def _guard_age_group_drop(connection: sa.Connection) -> None:
    """Refuse to drop the column while any row still disagrees with the 0002 mapping.

    Only rows with a non-null `age_group` are examined. A NULL means the row was
    created after 0002, where `subject_age_band` is authored directly by the
    intake flow — comparing those against the legacy `ELSE 'adult'` branch would
    raise false alarms on perfectly correct data.
    """
    unknown = connection.execute(
        sa.text(
            "SELECT age_group, count(*) AS rows FROM intake_cases "
            "WHERE age_group IS NOT NULL AND age_group <> ALL(:known) "
            "GROUP BY age_group ORDER BY rows DESC"
        ),
        {"known": list(_AGE_GROUP_TO_BAND)},
    ).all()
    if unknown:
        listed = ", ".join(f"{value!r} ({count} redova)" for value, count in unknown)
        raise RuntimeError(
            "D19 prekid: intake_cases.age_group sadrži vrednosti koje migracija 0002 "
            f"nije poznavala i tiho je svela na 'adult': {listed}. "
            "Potrebno je ručno odlučiti koji je tačan subject_age_band za te slučajeve "
            "pre nego što se kolona ukloni."
        )

    mismatched = connection.execute(
        sa.text(
            "SELECT age_group, subject_age_band, count(*) AS rows FROM intake_cases "
            "WHERE age_group IS NOT NULL "
            "  AND subject_age_band IS DISTINCT FROM (CASE age_group "
            "        WHEN 'Do 7 godina' THEN 'under_12' "
            "        WHEN '7\u201312 godina' THEN 'under_12' "
            "        WHEN '13\u201315 godina' THEN '12_15' "
            "        WHEN '16\u201317 godina' THEN '16_17' END) "
            "GROUP BY age_group, subject_age_band ORDER BY rows DESC"
        )
    ).all()
    if mismatched:
        listed = ", ".join(
            f"{group!r} → {band!r} ({count} redova)" for group, band, count in mismatched
        )
        raise RuntimeError(
            "D19 prekid: intake_cases.subject_age_band se ne slaže sa nasleđenim "
            f"age_group vrednostima: {listed}. Neko je posle 0002 menjao jedno bez "
            "drugog, pa se stvarni uzrast mora ručno potvrditi pre uklanjanja kolone."
        )


def upgrade() -> None:
    connection = op.get_bind()

    if _age_group_column_exists(connection):
        _guard_age_group_drop(connection)
        op.drop_column("intake_cases", "age_group")

    for table, column, old_length, new_length in _ENUM_COLUMN_LENGTHS:
        op.alter_column(
            table,
            column,
            existing_type=sa.String(length=old_length),
            type_=sa.String(length=new_length),
            existing_nullable=False,
        )


def downgrade() -> None:
    for table, column, old_length, new_length in _ENUM_COLUMN_LENGTHS:
        op.alter_column(
            table,
            column,
            existing_type=sa.String(length=new_length),
            type_=sa.String(length=old_length),
            existing_nullable=False,
        )

    # The column comes back, its content does not. `age_group` held free-text
    # labels whose meaning 0002 already folded into `subject_age_band`, and that
    # fold is lossy: both "Do 7 godina" and "7-12 godina" became `under_12`, and
    # every unrecognised value became `adult`. Inventing a label per band here
    # would fabricate intake data, so the restored column is left empty.
    if not _age_group_column_exists(op.get_bind()):
        op.add_column(
            "intake_cases",
            sa.Column("age_group", sa.String(length=80), nullable=True),
        )
