"""Regression tests for the Railway booking migration-chain recovery."""

import os
from collections.abc import Iterator
from pathlib import Path
from uuid import uuid4

import pytest
import sqlalchemy as sa
from alembic import command
from alembic.config import Config
from sqlalchemy.engine import URL, Connection, make_url
from sqlalchemy.exc import SQLAlchemyError

from psihointegritet.core.config import get_settings

BACKEND_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_MIGRATION_URL = (
    "postgresql+psycopg://psihointegritet:local_only_change_me@localhost:5434/psihointegritet"
)

#: Current head. Pinned rather than read from the script directory: these tests
#: assert that `upgrade head` lands on the revision we *expect*, which is the
#: thing the Railway incident got wrong. Bump it in the same commit as any new
#: migration.
HEAD_REVISION = "e4a91c62d8f7"


def _alembic_config() -> Config:
    config = Config(str(BACKEND_ROOT / "alembic.ini"))
    config.set_main_option(
        "script_location", str(BACKEND_ROOT / "src/psihointegritet/db/migrations")
    )
    return config


def _set_database_environment(url: URL) -> None:
    os.environ["MIGRATION_DATABASE_URL"] = url.render_as_string(hide_password=False)
    os.environ["DATABASE_URL"] = url.set(drivername="postgresql+asyncpg").render_as_string(
        hide_password=False
    )
    get_settings.cache_clear()


@pytest.fixture
def isolated_migration_database() -> Iterator[URL]:
    original_migration_url = os.environ.get("MIGRATION_DATABASE_URL")
    original_database_url = os.environ.get("DATABASE_URL")
    base_url = make_url(original_migration_url or DEFAULT_MIGRATION_URL)
    database_name = f"psiho_migration_{uuid4().hex}"
    admin_url = base_url.set(database="postgres")
    admin_engine = sa.create_engine(admin_url, isolation_level="AUTOCOMMIT")

    try:
        with admin_engine.connect() as connection:
            connection.exec_driver_sql(f'CREATE DATABASE "{database_name}"')
    except (SQLAlchemyError, OSError) as error:
        admin_engine.dispose()
        pytest.skip(f"No PostgreSQL admin connection available: {type(error).__name__}")

    database_url = base_url.set(database=database_name)
    _set_database_environment(database_url)
    try:
        yield database_url
    finally:
        get_settings.cache_clear()
        with admin_engine.connect() as connection:
            connection.exec_driver_sql(f'DROP DATABASE IF EXISTS "{database_name}" WITH (FORCE)')
        admin_engine.dispose()
        if original_migration_url is None:
            os.environ.pop("MIGRATION_DATABASE_URL", None)
        else:
            os.environ["MIGRATION_DATABASE_URL"] = original_migration_url
        if original_database_url is None:
            os.environ.pop("DATABASE_URL", None)
        else:
            os.environ["DATABASE_URL"] = original_database_url
        get_settings.cache_clear()


def _insert_legacy_sentinels(connection: Connection) -> tuple[str, str, str]:
    organization_id = str(uuid4())
    therapist_id = str(uuid4())
    service_id = str(uuid4())
    config_id = str(uuid4())

    connection.execute(
        sa.text(
            "INSERT INTO organizations (id, slug, display_name) "
            "VALUES (:id, :slug, 'Migration Test')"
        ),
        {"id": organization_id, "slug": f"migration-{uuid4().hex}"},
    )
    connection.execute(
        sa.text(
            """
            INSERT INTO therapist_matching_profiles (
                id, organization_id, slug, display_name, services, areas,
                formats, locations, min_child_age, accepted_age_bands,
                service_capabilities, supported_formats
            ) VALUES (
                :id, :organization_id, 'migration-therapist', 'Migration Therapist',
                '[]'::json, '[]'::json, '["online"]'::json, '[]'::json, 18,
                '["adult"]'::json, '[]'::json, '["online"]'::json
            )
            """
        ),
        {"id": therapist_id, "organization_id": organization_id},
    )
    connection.execute(
        sa.text(
            """
            INSERT INTO content_entries (id, organization_id, content_type, slug)
            VALUES (:id, :organization_id, 'service', 'migration-service')
            """
        ),
        {"id": service_id, "organization_id": organization_id},
    )
    connection.execute(
        sa.text(
            """
            INSERT INTO service_booking_configs (
                id, organization_id, service_id, therapist_profile_id, format,
                booking_mode, slot_duration_minutes, buffer_before_minutes,
                buffer_after_minutes
            ) VALUES (
                :id, :organization_id, :service_id, :therapist_id, 'online',
                'slot_request', 75, 10, 15
            )
            """
        ),
        {
            "id": config_id,
            "organization_id": organization_id,
            "service_id": service_id,
            "therapist_id": therapist_id,
        },
    )
    connection.commit()
    return config_id, therapist_id, organization_id


def test_upgrade_recovers_complete_v1_schema_after_marker_rewind(
    isolated_migration_database: URL,
) -> None:
    config = _alembic_config()
    command.upgrade(config, "0009")

    engine = sa.create_engine(isolated_migration_database)
    with engine.connect() as connection:
        config_id, therapist_id, _ = _insert_legacy_sentinels(connection)
        tables = set(sa.inspect(connection).get_table_names())
        assert "availability_profiles" not in tables
        assert "manual_availability_slots" not in tables
        assert "slot_duration_minutes" in {
            column["name"]
            for column in sa.inspect(connection).get_columns("service_booking_configs")
        }

    # Reproduce the exact Railway incident: schema remained at physical 0009,
    # while only the revision marker was moved back to 0007's parent.
    command.stamp(config, "3bb47763bb91")
    command.upgrade(config, "head")

    with engine.connect() as connection:
        assert connection.scalar(sa.text("SELECT version_num FROM alembic_version")) == (
            HEAD_REVISION
        )
        row = connection.execute(
            sa.text(
                """
                SELECT duration_minutes, buffer_before_minutes, buffer_after_minutes,
                       availability_profile_id
                FROM service_booking_configs
                WHERE id = :config_id
                """
            ),
            {"config_id": config_id},
        ).one()
        assert tuple(row[:3]) == (75, 10, 15)
        assert row.availability_profile_id is not None
        assert (
            connection.scalar(
                sa.text(
                    "SELECT count(*) FROM availability_profiles "
                    "WHERE therapist_profile_id = :therapist_id"
                ),
                {"therapist_id": therapist_id},
            )
            == 1
        )

        constraints = {
            item["name"]
            for item in sa.inspect(connection).get_unique_constraints("service_booking_configs")
        }
        assert "uq_booking_config_offer" in constraints
        appointment_constraints = {
            item["name"] for item in sa.inspect(connection).get_check_constraints("appointments")
        }
        assert "ck_appointments_valid_time_range" in appointment_constraints
        assert (
            connection.scalar(
                sa.text(
                    """
                SELECT count(*) FROM pg_constraint
                WHERE conrelid = 'appointments'::regclass
                  AND conname = 'appointments_no_therapist_overlap'
                """
                )
            )
            == 1
        )
    engine.dispose()


def test_reconciliation_aborts_before_touching_ambiguous_legacy_rows(
    isolated_migration_database: URL,
) -> None:
    config = _alembic_config()
    command.upgrade(config, "0009")

    engine = sa.create_engine(isolated_migration_database)
    with engine.connect() as connection:
        _, therapist_id, organization_id = _insert_legacy_sentinels(connection)
        rule_id = str(uuid4())
        connection.execute(
            sa.text(
                """
                INSERT INTO availability_rules (
                    id, organization_id, therapist_profile_id, day_of_week,
                    start_time, end_time, valid_from, format,
                    slot_duration_minutes
                ) VALUES (
                    :id, :organization_id, :therapist_id, 0,
                    '09:00', '17:00', CURRENT_DATE, 'online', 75
                )
                """
            ),
            {
                "id": rule_id,
                "organization_id": organization_id,
                "therapist_id": therapist_id,
            },
        )
        connection.commit()

    command.stamp(config, "3bb47763bb91")
    with pytest.raises(RuntimeError, match="cannot guess how to convert non-empty legacy"):
        command.upgrade(config, "head")

    with engine.connect() as connection:
        assert connection.scalar(sa.text("SELECT version_num FROM alembic_version")) == (
            "3bb47763bb91"
        )
        assert (
            connection.scalar(
                sa.text("SELECT count(*) FROM availability_rules WHERE id = :id"),
                {"id": rule_id},
            )
            == 1
        )
        assert "slot_duration_minutes" in {
            column["name"]
            for column in sa.inspect(connection).get_columns("service_booking_configs")
        }
        assert "availability_profiles" not in set(sa.inspect(connection).get_table_names())
    engine.dispose()


def test_fresh_chain_round_trips_through_reconciliation(
    isolated_migration_database: URL,
) -> None:
    config = _alembic_config()
    command.upgrade(config, "head")
    command.downgrade(config, "20260802_0015")
    command.upgrade(config, "head")
    command.check(config)

    engine = sa.create_engine(isolated_migration_database)
    with engine.connect() as connection:
        assert connection.scalar(sa.text("SELECT version_num FROM alembic_version")) == (
            HEAD_REVISION
        )
        tables = set(sa.inspect(connection).get_table_names())
        assert "availability_profiles" in tables
        assert "manual_availability_slots" in tables
    engine.dispose()
