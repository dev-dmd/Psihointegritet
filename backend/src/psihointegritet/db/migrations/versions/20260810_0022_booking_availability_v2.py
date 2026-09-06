"""Reconcile the deployed booking V1 schema with ADR-015 availability V2.

Revision ``0007`` originally shipped with therapist-owned availability rules
and date-based exceptions.  It was later edited in place to contain the V2
schema, so databases already at ``0009`` never received those DDL changes.
This revision is the forward-only bridge that should have been created then.

Legacy service configuration rows have an unambiguous mapping and are kept.
Legacy rules and exceptions do not: ``modified_hours`` has no single V2 kind,
and their duplicated duration/buffer values have no authoritative target.
The migration therefore converts those tables only while they are empty and
aborts transactionally with a precise message otherwise.

Revision ID: 20260810_0022
Revises: 0009
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.engine import Connection

revision: str = "20260810_0022"
down_revision: str | Sequence[str] | None = "0009"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def _columns(connection: Connection, table: str) -> set[str]:
    return {column["name"] for column in sa.inspect(connection).get_columns(table)}


def _has_index(connection: Connection, table: str, columns: list[str]) -> bool:
    return any(
        index["column_names"] == columns for index in sa.inspect(connection).get_indexes(table)
    )


def _has_profile_fk(connection: Connection) -> bool:
    return any(
        foreign_key["constrained_columns"] == ["availability_profile_id"]
        and foreign_key["referred_table"] == "availability_profiles"
        for foreign_key in sa.inspect(connection).get_foreign_keys("service_booking_configs")
    )


def _create_profiles() -> None:
    op.create_table(
        "availability_profiles",
        sa.Column("id", sa.Uuid(as_uuid=True), primary_key=True),
        sa.Column(
            "organization_id",
            sa.Uuid(as_uuid=True),
            sa.ForeignKey("organizations.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column(
            "therapist_profile_id",
            sa.Uuid(as_uuid=True),
            sa.ForeignKey("therapist_matching_profiles.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column("mode", sa.String(32), nullable=False, server_default="hourly_grid"),
        sa.Column(
            "timezone",
            sa.String(64),
            nullable=False,
            server_default="Europe/Belgrade",
        ),
        sa.Column("start_step_minutes", sa.Integer, nullable=True),
        sa.Column("enabled", sa.Boolean, nullable=False, server_default="true"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.UniqueConstraint(
            "organization_id",
            "therapist_profile_id",
            "mode",
            name="uq_avail_profile_therapist_mode",
            postgresql_nulls_not_distinct=True,
        ),
    )
    op.create_index(
        "ix_avail_profile_org_therapist",
        "availability_profiles",
        ["organization_id", "therapist_profile_id"],
    )


def _create_v2_rules() -> None:
    op.create_table(
        "availability_rules",
        sa.Column("id", sa.Uuid(as_uuid=True), primary_key=True),
        sa.Column(
            "organization_id",
            sa.Uuid(as_uuid=True),
            sa.ForeignKey("organizations.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column(
            "availability_profile_id",
            sa.Uuid(as_uuid=True),
            sa.ForeignKey("availability_profiles.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column("day_of_week", sa.Integer, nullable=False),
        sa.Column("start_local_time", sa.Time(), nullable=False),
        sa.Column("end_local_time", sa.Time(), nullable=False),
        sa.Column("valid_from", sa.Date, nullable=False),
        sa.Column("valid_until", sa.Date, nullable=True),
        sa.Column("format", sa.String(32), nullable=False),
        sa.Column("location_id", sa.Uuid(as_uuid=True), nullable=True),
        sa.Column("is_active", sa.Boolean, nullable=False, server_default="true"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.UniqueConstraint(
            "organization_id",
            "availability_profile_id",
            "day_of_week",
            "start_local_time",
            "end_local_time",
            "format",
            name="uq_avail_rule_window",
            postgresql_nulls_not_distinct=True,
        ),
        sa.CheckConstraint("end_local_time > start_local_time", name="ck_avail_rule_time_range"),
    )
    op.create_index(
        "ix_avail_rule_org_profile",
        "availability_rules",
        ["organization_id", "availability_profile_id"],
    )


def _create_v2_exceptions() -> None:
    op.create_table(
        "availability_exceptions",
        sa.Column("id", sa.Uuid(as_uuid=True), primary_key=True),
        sa.Column(
            "organization_id",
            sa.Uuid(as_uuid=True),
            sa.ForeignKey("organizations.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column(
            "therapist_profile_id",
            sa.Uuid(as_uuid=True),
            sa.ForeignKey("therapist_matching_profiles.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column(
            "availability_profile_id",
            sa.Uuid(as_uuid=True),
            sa.ForeignKey("availability_profiles.id", ondelete="CASCADE"),
            nullable=True,
            index=True,
        ),
        sa.Column("kind", sa.String(32), nullable=False),
        sa.Column("starts_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("ends_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("format", sa.String(32), nullable=True),
        sa.Column("location_id", sa.Uuid(as_uuid=True), nullable=True),
        sa.Column("reason_code", sa.String(64), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.CheckConstraint("ends_at > starts_at", name="ck_avail_exception_time_range"),
    )
    op.create_index(
        "ix_avail_exception_org_therapist",
        "availability_exceptions",
        ["organization_id", "therapist_profile_id"],
    )


def _create_manual_slots() -> None:
    op.create_table(
        "manual_availability_slots",
        sa.Column("id", sa.Uuid(as_uuid=True), primary_key=True),
        sa.Column(
            "organization_id",
            sa.Uuid(as_uuid=True),
            sa.ForeignKey("organizations.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column(
            "availability_profile_id",
            sa.Uuid(as_uuid=True),
            sa.ForeignKey("availability_profiles.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column("starts_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("format", sa.String(32), nullable=False),
        sa.Column("location_id", sa.Uuid(as_uuid=True), nullable=True),
        sa.Column("source", sa.String(32), nullable=False, server_default="manual"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )
    op.create_index(
        "ix_manual_slot_org_profile_start",
        "manual_availability_slots",
        ["organization_id", "availability_profile_id", "starts_at"],
    )


def _create_v1_rules() -> None:
    op.create_table(
        "availability_rules",
        sa.Column("id", sa.Uuid(as_uuid=True), primary_key=True),
        sa.Column(
            "organization_id",
            sa.Uuid(as_uuid=True),
            sa.ForeignKey("organizations.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column(
            "therapist_profile_id",
            sa.Uuid(as_uuid=True),
            sa.ForeignKey("therapist_matching_profiles.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column("day_of_week", sa.Integer, nullable=False),
        sa.Column("start_time", sa.Time(), nullable=False),
        sa.Column("end_time", sa.Time(), nullable=False),
        sa.Column("valid_from", sa.Date, nullable=False),
        sa.Column("valid_until", sa.Date, nullable=True),
        sa.Column("format", sa.String(32), nullable=False),
        sa.Column("location_id", sa.Uuid(as_uuid=True), nullable=True),
        sa.Column("service_ids", sa.JSON, nullable=True),
        sa.Column("slot_duration_minutes", sa.Integer, nullable=False),
        sa.Column("buffer_before_minutes", sa.Integer, nullable=False, server_default="0"),
        sa.Column("buffer_after_minutes", sa.Integer, nullable=False, server_default="0"),
        sa.Column("is_active", sa.Boolean, nullable=False, server_default="true"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )
    op.create_index(
        "ix_avail_rule_org_therapist",
        "availability_rules",
        ["organization_id", "therapist_profile_id"],
    )


def _create_v1_exceptions() -> None:
    op.create_table(
        "availability_exceptions",
        sa.Column("id", sa.Uuid(as_uuid=True), primary_key=True),
        sa.Column(
            "organization_id",
            sa.Uuid(as_uuid=True),
            sa.ForeignKey("organizations.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column(
            "therapist_profile_id",
            sa.Uuid(as_uuid=True),
            sa.ForeignKey("therapist_matching_profiles.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column("exception_date", sa.Date, nullable=False),
        sa.Column("kind", sa.String(32), nullable=False),
        sa.Column("start_time", sa.Time(), nullable=True),
        sa.Column("end_time", sa.Time(), nullable=True),
        sa.Column("reason", sa.Text, nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.UniqueConstraint(
            "organization_id",
            "therapist_profile_id",
            "exception_date",
            "kind",
            name="uq_avail_exception_date_kind",
        ),
    )
    op.create_index(
        "ix_avail_exception_org_therapist_date",
        "availability_exceptions",
        ["organization_id", "therapist_profile_id", "exception_date"],
    )


def _assert_legacy_availability_is_empty(connection: Connection) -> tuple[bool, bool]:
    rule_columns = _columns(connection, "availability_rules")
    exception_columns = _columns(connection, "availability_exceptions")
    legacy_rules = "therapist_profile_id" in rule_columns
    legacy_exceptions = "exception_date" in exception_columns

    blocked: list[str] = []
    if legacy_rules:
        rule_count = connection.scalar(sa.text("SELECT count(*) FROM availability_rules"))
        if rule_count:
            blocked.append(f"availability_rules={rule_count}")
    elif not {"availability_profile_id", "start_local_time", "end_local_time"}.issubset(
        rule_columns
    ):
        raise RuntimeError("Unrecognised availability_rules schema; refusing V2 reconciliation")

    if legacy_exceptions:
        exception_count = connection.scalar(sa.text("SELECT count(*) FROM availability_exceptions"))
        if exception_count:
            blocked.append(f"availability_exceptions={exception_count}")
    elif not {"availability_profile_id", "starts_at", "ends_at"}.issubset(exception_columns):
        raise RuntimeError(
            "Unrecognised availability_exceptions schema; refusing V2 reconciliation"
        )

    if blocked:
        raise RuntimeError(
            "Booking V1→V2 reconciliation cannot guess how to convert non-empty legacy "
            "availability data (modified_hours and duplicated duration/buffer fields are "
            "ambiguous). No changes were committed. Export and map these rows explicitly: "
            + ", ".join(blocked)
        )
    return legacy_rules, legacy_exceptions


def upgrade() -> None:
    connection = op.get_bind()
    tables = set(sa.inspect(connection).get_table_names())
    required = {"service_booking_configs", "availability_rules", "availability_exceptions"}
    if missing := required - tables:
        raise RuntimeError(
            "Cannot reconcile booking availability; missing base tables: "
            + ", ".join(sorted(missing))
        )

    legacy_rules, legacy_exceptions = _assert_legacy_availability_is_empty(connection)

    if "availability_profiles" not in tables:
        _create_profiles()
    else:
        profile_columns = _columns(connection, "availability_profiles")
        expected = {"id", "organization_id", "therapist_profile_id", "mode", "timezone"}
        if missing := expected - profile_columns:
            raise RuntimeError(
                "Unrecognised availability_profiles schema; missing columns: "
                + ", ".join(sorted(missing))
            )

    config_columns = _columns(connection, "service_booking_configs")
    has_legacy_duration = "slot_duration_minutes" in config_columns
    has_v2_duration = "duration_minutes" in config_columns
    if has_legacy_duration and has_v2_duration:
        conflict = connection.scalar(
            sa.text(
                """
                SELECT EXISTS (
                    SELECT 1 FROM service_booking_configs
                    WHERE slot_duration_minutes IS NOT NULL
                      AND duration_minutes IS NOT NULL
                      AND slot_duration_minutes <> duration_minutes
                )
                """
            )
        )
        if conflict:
            raise RuntimeError(
                "Conflicting slot_duration_minutes and duration_minutes values; "
                "refusing automatic reconciliation"
            )
        op.execute(
            "UPDATE service_booking_configs SET duration_minutes = slot_duration_minutes "
            "WHERE duration_minutes IS NULL"
        )
        op.drop_column("service_booking_configs", "slot_duration_minutes")
    elif has_legacy_duration:
        op.alter_column(
            "service_booking_configs",
            "slot_duration_minutes",
            new_column_name="duration_minutes",
        )
    elif not has_v2_duration:
        raise RuntimeError("service_booking_configs has neither legacy nor V2 duration column")

    op.execute(
        """
        INSERT INTO availability_profiles (
            id, organization_id, therapist_profile_id, mode, timezone, enabled
        )
        SELECT gen_random_uuid(), source.organization_id, source.therapist_profile_id,
               'hourly_grid', 'Europe/Belgrade', true
        FROM (
            SELECT DISTINCT organization_id, therapist_profile_id
            FROM service_booking_configs
            WHERE therapist_profile_id IS NOT NULL
        ) AS source
        WHERE NOT EXISTS (
            SELECT 1
            FROM availability_profiles AS profile
            WHERE profile.organization_id = source.organization_id
              AND profile.therapist_profile_id = source.therapist_profile_id
              AND profile.mode = 'hourly_grid'
        )
        """
    )

    config_columns = _columns(connection, "service_booking_configs")
    added_profile_column = "availability_profile_id" not in config_columns
    if added_profile_column:
        op.add_column(
            "service_booking_configs",
            sa.Column("availability_profile_id", sa.Uuid(as_uuid=True), nullable=True),
        )
        op.execute(
            """
            UPDATE service_booking_configs AS config
            SET availability_profile_id = profile.id
            FROM availability_profiles AS profile
            WHERE config.therapist_profile_id IS NOT NULL
              AND profile.organization_id = config.organization_id
              AND profile.therapist_profile_id = config.therapist_profile_id
              AND profile.mode = 'hourly_grid'
            """
        )
    if not _has_profile_fk(connection):
        op.create_foreign_key(
            op.f("fk_service_booking_configs_availability_profile_id_availability_profiles"),
            "service_booking_configs",
            "availability_profiles",
            ["availability_profile_id"],
            ["id"],
            ondelete="SET NULL",
        )
    if not _has_index(connection, "service_booking_configs", ["availability_profile_id"]):
        op.create_index(
            op.f("ix_service_booking_configs_availability_profile_id"),
            "service_booking_configs",
            ["availability_profile_id"],
        )

    if legacy_rules:
        op.drop_table("availability_rules")
        _create_v2_rules()
    if legacy_exceptions:
        op.drop_table("availability_exceptions")
        _create_v2_exceptions()

    if "manual_availability_slots" not in tables:
        _create_manual_slots()


def downgrade() -> None:
    connection = op.get_bind()
    counts = {
        "availability_rules": connection.scalar(sa.text("SELECT count(*) FROM availability_rules")),
        "availability_exceptions": connection.scalar(
            sa.text("SELECT count(*) FROM availability_exceptions")
        ),
        "manual_availability_slots": connection.scalar(
            sa.text("SELECT count(*) FROM manual_availability_slots")
        ),
    }
    non_empty = [f"{table}={count}" for table, count in counts.items() if count]
    if non_empty:
        raise RuntimeError(
            "Refusing lossy availability V2→V1 downgrade with schedule data: "
            + ", ".join(non_empty)
        )

    op.drop_table("manual_availability_slots")
    op.drop_table("availability_exceptions")
    op.drop_table("availability_rules")
    _create_v1_rules()
    _create_v1_exceptions()

    inspector = sa.inspect(connection)
    for foreign_key in inspector.get_foreign_keys("service_booking_configs"):
        if foreign_key["constrained_columns"] == ["availability_profile_id"]:
            if foreign_key["name"] is None:
                raise RuntimeError("Unnamed availability_profile_id foreign key")
            op.drop_constraint(foreign_key["name"], "service_booking_configs", type_="foreignkey")
    for index in inspector.get_indexes("service_booking_configs"):
        if index["column_names"] == ["availability_profile_id"]:
            if index["name"] is None:
                raise RuntimeError("Unnamed availability_profile_id index")
            op.drop_index(index["name"], table_name="service_booking_configs")
    op.drop_column("service_booking_configs", "availability_profile_id")
    op.alter_column(
        "service_booking_configs",
        "duration_minutes",
        new_column_name="slot_duration_minutes",
    )
    op.drop_table("availability_profiles")
