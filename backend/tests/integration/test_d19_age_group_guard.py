"""The D19 guard that stands between legacy `age_group` data and `DROP COLUMN`.

Migration 0002 folded `age_group` into `subject_age_band` through a `CASE` whose
`ELSE` branch silently answered `adult` for anything it did not recognise. The
0017 guard exists so that silence is not repeated at drop time: it refuses to
run while any row still carries a value the fold cannot account for.

The tests re-create the dropped column inside the rolled-back transaction and
run the real guard SQL against real PostgreSQL. Asserting the query text instead
would prove nothing about how PostgreSQL evaluates `<> ALL` or `IS DISTINCT
FROM` over NULLs, which is where this class of guard usually fails.
"""

import importlib.util
from datetime import UTC, datetime, timedelta
from pathlib import Path
from types import ModuleType
from typing import Any
from uuid import uuid4

import pytest
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncConnection

_MIGRATION_PATH = (
    Path(__file__).resolve().parents[2]
    / "src/psihointegritet/db/migrations/versions/20260803_0017_d19_schema_drift.py"
)


def _load_migration() -> ModuleType:
    spec = importlib.util.spec_from_file_location("d19_migration", _MIGRATION_PATH)
    assert spec is not None and spec.loader is not None
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


migration = _load_migration()


async def _restore_age_group(connection: AsyncConnection) -> None:
    """Put the dropped column back for the duration of one rolled-back test."""
    await connection.execute(text("ALTER TABLE intake_cases ADD COLUMN age_group VARCHAR(80)"))


async def _organization_id(connection: AsyncConnection) -> Any:
    existing = (
        await connection.execute(text("SELECT id FROM organizations LIMIT 1"))
    ).scalar_one_or_none()
    if existing is not None:
        return existing
    organization_id = uuid4()
    await connection.execute(
        text(
            "INSERT INTO organizations (id, slug, display_name, created_at) "
            "VALUES (:id, :slug, :name, now())"
        ),
        {"id": organization_id, "slug": f"d19-{organization_id.hex[:8]}", "name": "D19"},
    )
    return organization_id


async def _insert_case(
    connection: AsyncConnection,
    *,
    age_group: str | None,
    subject_age_band: str,
) -> Any:
    case_id = uuid4()
    await connection.execute(
        text(
            "INSERT INTO intake_cases ("
            "  id, organization_id, submission_kind, source, recommended_therapist_slugs,"
            "  explanation_codes, matching_rule_version, idempotency_key, request_fingerprint,"
            "  expires_at, submission_intent, subject_age_band, age_group"
            ") VALUES ("
            "  :id, :organization_id, 'request', 'public_web', '[]'::json,"
            "  '[]'::json, 'test', :idempotency_key, :fingerprint,"
            "  :expires_at, 'direct_request', :subject_age_band, :age_group"
            ")"
        ),
        {
            "id": case_id,
            "organization_id": await _organization_id(connection),
            "idempotency_key": case_id.hex,
            "fingerprint": case_id.hex,
            "expires_at": datetime.now(UTC) + timedelta(days=1),
            "subject_age_band": subject_age_band,
            "age_group": age_group,
        },
    )
    return case_id


async def test_consistent_legacy_rows_pass_and_survive_the_drop(
    connection: AsyncConnection,
) -> None:
    await _restore_age_group(connection)
    guardian = await _insert_case(
        connection, age_group="13\u201315 godina", subject_age_band="12_15"
    )
    # A row created after 0002: no legacy label, band authored by the intake flow.
    modern = await _insert_case(connection, age_group=None, subject_age_band="under_12")

    await connection.run_sync(
        lambda sync_connection: migration._guard_age_group_drop(sync_connection)
    )
    await connection.execute(text("ALTER TABLE intake_cases DROP COLUMN age_group"))

    rows = (
        (
            await connection.execute(
                text("SELECT id, subject_age_band FROM intake_cases WHERE id IN (:a, :b)"),
                {"a": guardian, "b": modern},
            )
        )
        .mappings()
        .all()
    )
    bands = {row["id"]: row["subject_age_band"] for row in rows}
    assert bands[guardian] == "12_15"
    # The NULL row must not be dragged to the legacy `ELSE 'adult'` answer.
    assert bands[modern] == "under_12"


async def test_unknown_legacy_value_aborts_the_migration(
    connection: AsyncConnection,
) -> None:
    await _restore_age_group(connection)
    await _insert_case(connection, age_group="18 i više", subject_age_band="adult")

    with pytest.raises(RuntimeError) as error:
        await connection.run_sync(
            lambda sync_connection: migration._guard_age_group_drop(sync_connection)
        )

    message = str(error.value)
    assert "18 i više" in message
    assert "D19 prekid" in message


async def test_band_that_disagrees_with_the_legacy_label_aborts_the_migration(
    connection: AsyncConnection,
) -> None:
    await _restore_age_group(connection)
    # Someone edited the band after 0002 without touching the legacy label.
    await _insert_case(connection, age_group="16\u201317 godina", subject_age_band="adult")

    with pytest.raises(RuntimeError) as error:
        await connection.run_sync(
            lambda sync_connection: migration._guard_age_group_drop(sync_connection)
        )

    message = str(error.value)
    assert "16\u201317 godina" in message
    assert "adult" in message
