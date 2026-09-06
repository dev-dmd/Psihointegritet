"""Read-only report for the booking V1/V2 Alembic reconciliation.

The Railway features database first applied the legacy form of revision 0007.
That historical file was later rewritten in place, so ``alembic_version`` and
the physical availability schema can legitimately disagree.  This command
only reports evidence; it never recommends dropping tables or blindly stamping
a revision.

Run inside an active Railway service container, where its private database
hostname is reachable (``railway run`` executes locally and cannot resolve it):

    railway ssh -s <features-service> python scripts/diagnose_migrations.py
"""

import asyncio

from sqlalchemy import text
from sqlalchemy.engine import make_url
from sqlalchemy.ext.asyncio import AsyncConnection

from psihointegritet.core.config import get_settings
from psihointegritet.db.session import create_engine

V1_BOOKING_TABLES = (
    "service_booking_configs",
    "availability_rules",
    "availability_exceptions",
    "slot_holds",
    "appointments",
    "appointment_requests",
    "alternative_proposals",
)
V2_ONLY_TABLES = ("availability_profiles", "manual_availability_slots")


async def _columns(connection: AsyncConnection, table: str) -> set[str]:
    rows = await connection.execute(
        text(
            "SELECT column_name FROM information_schema.columns "
            "WHERE table_schema = current_schema() AND table_name = :table"
        ),
        {"table": table},
    )
    return {row[0] for row in rows}


async def main() -> None:
    settings = get_settings()
    url = make_url(settings.database_url)
    print(f"database: {url.host or 'local socket'}:{url.port or 5432}/{url.database or '?'}")

    engine = create_engine(settings)
    try:
        async with engine.connect() as connection:
            version = await connection.scalar(text("SELECT version_num FROM alembic_version"))
            schema = await connection.scalar(text("SELECT current_schema()"))
            rows = await connection.execute(
                text(
                    "SELECT table_name FROM information_schema.tables "
                    "WHERE table_schema = current_schema()"
                )
            )
            present = {row[0] for row in rows}

            print(f"current_schema : {schema}")
            print(f"alembic_version: {version or '(prazno)'}")
            print()

            for table in (*V1_BOOKING_TABLES, *V2_ONLY_TABLES):
                print(f"  {'✓' if table in present else '✗'} {table}")

            legacy_core = all(table in present for table in V1_BOOKING_TABLES)
            if not legacy_core:
                print()
                print("Booking V1 jezgro nije kompletno. Ne pokreći stamp ili DROP napamet.")
                return

            config_columns = await _columns(connection, "service_booking_configs")
            rule_columns = await _columns(connection, "availability_rules")
            exception_columns = await _columns(connection, "availability_exceptions")
            is_v1 = (
                "slot_duration_minutes" in config_columns
                and "therapist_profile_id" in rule_columns
                and "exception_date" in exception_columns
            )
            is_v2 = (
                "duration_minutes" in config_columns
                and "availability_profile_id" in rule_columns
                and "starts_at" in exception_columns
                and all(table in present for table in V2_ONLY_TABLES)
            )

            print()
            print(
                f"schema shape   : {'V1 legacy' if is_v1 else 'V2' if is_v2 else 'mixed/unknown'}"
            )
            if is_v1:
                rule_count = await connection.scalar(
                    text("SELECT count(*) FROM availability_rules")
                )
                exception_count = await connection.scalar(
                    text("SELECT count(*) FROM availability_exceptions")
                )
                config_count = await connection.scalar(
                    text("SELECT count(*) FROM service_booking_configs")
                )
                print(f"config rows    : {config_count}")
                print(f"legacy rules   : {rule_count}")
                print(f"legacy except. : {exception_count}")
                print()
                if rule_count or exception_count:
                    print(
                        "Forward repair će namerno stati: legacy rules/exceptions traže "
                        "eksplicitno mapiranje bez gubitka značenja."
                    )
                else:
                    print(
                        "V1 availability je prazna i može bezbedno kroz novu "
                        "20260810_0022 reconciliation migraciju."
                    )
                if version == "3bb47763bb91":
                    print(
                        "Marker je vraćen unazad. Novi 0007/0008/0009 compatibility "
                        "guardovi će usvojiti postojeću kompletnu šemu; ne stampuj ponovo."
                    )
            elif is_v2:
                print("Fizička šema je već V2; reconciliation je idempotentna.")
            else:
                print("Mešovita šema zahteva ručnu analizu pre bilo kakve promene.")
    finally:
        await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())
