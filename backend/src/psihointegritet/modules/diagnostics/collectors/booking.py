"""Diagnostic Engine — Booking integrity collectors (DIAGNOSTIC_TODO.md §4).

Each collector is a standalone async function that receives keyword arguments
matching ``DiagnosticContext`` attribute names. They are read-only: no DML,
no external provider calls, no ``session.add`` or ``session.execute(update)``.

Every sample row carries stable identifiers only — no client names, emails,
phone numbers or free-text notes.
"""

# ruff: noqa: S608 — All ``text()`` calls below are constructed from literal
# SQL fragments. The only variable parts are ``org_filter`` (always either
# ``""`` or a literal ``"col = :org_id AND"`` snippet with a bound param) and
# the ``params`` dict. No user input reaches the SQL template at runtime.

from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from psihointegritet.modules.diagnostics.contracts import (
    DiagnosticDefinition,
    DiagnosticMode,
    DiagnosticResult,
    DiagnosticStatus,
)


def _now() -> datetime:
    return datetime.now(UTC)


# ── 4.1 booking.appointment_overlaps ────────────────────────────────────────


async def collect_appointment_overlaps(
    *,
    session: AsyncSession,
    organization_id: UUID | None,
    mode: DiagnosticMode,
    sample_limit: int,
    checked_at: datetime,
) -> DiagnosticResult:
    """Detect overlapping confirmed/completed/no-show appointments.

    Uses the same ``[)`` semantics as the exclusion constraint (0009 migration):
    same ``organization_id`` + ``therapist_profile_id``, status IN
    ('confirmed','completed','no_show'), ``tstzrange &&``.  Cancelled
    appointments are deliberately excluded.
    """
    params: dict[str, object] = {"limit": sample_limit}
    org_filter = "a1.organization_id = :org_id AND"
    if organization_id is not None:
        params["org_id"] = organization_id
    else:
        org_filter = ""

    sql = text(f"""
        SELECT DISTINCT
            a1.organization_id AS "organizationId",
            a1.therapist_profile_id AS "therapistId",
            a1.id AS "appointmentId",
            a2.id AS "conflictingAppointmentId",
            a1.start_time AT TIME ZONE 'UTC' AS "startsAt",
            a1.end_time AT TIME ZONE 'UTC' AS "endsAt"
        FROM appointments a1
        JOIN appointments a2 ON
            a2.therapist_profile_id = a1.therapist_profile_id
            AND a2.id != a1.id
            AND tstzrange(
                a2.start_time, a2.end_time, '[)'
            ) && tstzrange(
                a1.start_time, a1.end_time, '[)'
            )
        WHERE {org_filter}
            a1.status IN ('confirmed', 'completed', 'no_show')
            AND a2.status IN ('confirmed', 'completed', 'no_show')
        ORDER BY "organizationId", "therapistId", "startsAt"
        LIMIT :limit
    """)

    result = await session.execute(sql, params)
    rows = result.mappings().all()
    sample = [dict(r) for r in rows]

    # Count total overlaps for affected_count (COUNT-based, D3.3)
    count_sql = text(f"""
        SELECT COUNT(DISTINCT a1.id)
        FROM appointments a1
        JOIN appointments a2 ON
            a2.therapist_profile_id = a1.therapist_profile_id
            AND a2.id != a1.id
            AND tstzrange(
                a2.start_time, a2.end_time, '[)'
            ) && tstzrange(
                a1.start_time, a1.end_time, '[)'
            )
        WHERE {org_filter}
            a1.status IN ('confirmed', 'completed', 'no_show')
            AND a2.status IN ('confirmed', 'completed', 'no_show')
    """)

    count_result = await session.execute(count_sql, params)
    affected = count_result.scalar_one()

    if affected == 0:
        return DiagnosticResult(
            key="booking.appointment_overlaps",
            status=DiagnosticStatus.OK,
            affected_count=0,
            summary="Nema preklapajućih termina.",
            duration_ms=0,
            checked_at=checked_at,
        )

    return DiagnosticResult(
        key="booking.appointment_overlaps",
        status=DiagnosticStatus.ERROR,
        affected_count=affected,
        summary=(
            f"Pronađeno {affected} preklapajućih termina — "
            "DB constraint možda nije primenjen ili je zaobiđen."
        ),
        sample_rows=sample,
        suggestion=(
            "Proveriti da li je migracija 0009 (appointments_no_therapist_overlap) "
            "primenjena i da li je neko direktno manipulisao podacima van aplikacije."
        ),
        duration_ms=0,
        checked_at=checked_at,
    )


APPOINTMENT_OVERLAPS = DiagnosticDefinition(
    key="booking.appointment_overlaps",
    label="Preklapanje termina",
    description=(
        "Proverava da li postoje potvrđeni/odrađeni termini koji se vremenski "
        "preklapaju za istog terapeuta u istoj organizaciji."
    ),
    collector=collect_appointment_overlaps,
    category="booking",
    supported_modes=frozenset({DiagnosticMode.COMPACT, DiagnosticMode.FULL}),
    max_sample_rows=20,
    tenant_aware=True,
)

# ── 4.2 booking.duplicate_config_scope ──────────────────────────────────────


async def collect_duplicate_config_scope(
    *,
    session: AsyncSession,
    organization_id: UUID | None,
    mode: DiagnosticMode,
    sample_limit: int,
    checked_at: datetime,
) -> DiagnosticResult:
    """Find duplicate service booking configs with the same (org, service,
    therapist, format, location) key.  NULL ``location_id`` is treated as
    a concrete value by ``GROUP BY``, matching the 0008 UNIQUE NULLS NOT
    DISTINCT semantics.
    """
    params: dict[str, object] = {"limit": sample_limit}
    org_filter = "organization_id = :org_id AND"
    if organization_id is not None:
        params["org_id"] = organization_id
    else:
        org_filter = ""

    sql = text(f"""
        SELECT
            organization_id AS "organizationId",
            service_id AS "serviceId",
            therapist_profile_id AS "therapistId",
            format,
            location_id AS "locationId",
            COUNT(*) AS "count"
        FROM service_booking_configs
        WHERE {org_filter} is_active = true
        GROUP BY organization_id, service_id, therapist_profile_id, format, location_id
        HAVING COUNT(*) > 1
        ORDER BY organization_id, service_id
        LIMIT :limit
    """)

    result = await session.execute(sql, params)
    rows = result.mappings().all()
    sample = [dict(r) for r in rows]

    count_sql = text(f"""
        SELECT COUNT(*) FROM (
            SELECT 1
            FROM service_booking_configs
            WHERE {org_filter} is_active = true
            GROUP BY organization_id, service_id, therapist_profile_id, format, location_id
            HAVING COUNT(*) > 1
        ) sub
    """)

    count_result = await session.execute(count_sql, params)
    affected = count_result.scalar_one()

    if affected == 0:
        return DiagnosticResult(
            key="booking.duplicate_config_scope",
            status=DiagnosticStatus.OK,
            affected_count=0,
            summary="Nema dupliranih booking konfiguracija.",
            duration_ms=0,
            checked_at=checked_at,
        )

    return DiagnosticResult(
        key="booking.duplicate_config_scope",
        status=DiagnosticStatus.ERROR,
        affected_count=affected,
        summary=(
            f"Pronađeno {affected} dupliranih booking konfiguracija — "
            "UNIQUE NULLS NOT DISTINCT možda nije primenjen."
        ),
        sample_rows=sample,
        suggestion=(
            "Proveriti da li je migracija 0008 (uq_booking_config_offer sa "
            "NULLS NOT DISTINCT) primenjena ili su podaci uneti pre migracije."
        ),
        duration_ms=0,
        checked_at=checked_at,
    )


DUPLICATE_CONFIG_SCOPE = DiagnosticDefinition(
    key="booking.duplicate_config_scope",
    label="Duplirane konfiguracije",
    description=(
        "Proverava da li postoje aktivne booking konfiguracije "
        "sa istim (org, usluga, terapeut, format, lokacija)."
    ),
    collector=collect_duplicate_config_scope,
    category="booking",
    supported_modes=frozenset({DiagnosticMode.COMPACT, DiagnosticMode.FULL}),
    max_sample_rows=20,
    tenant_aware=True,
)

# ── 4.3 booking.request_appointment_mismatch ────────────────────────────────


async def collect_request_appointment_mismatch(
    *,
    session: AsyncSession,
    organization_id: UUID | None,
    mode: DiagnosticMode,
    sample_limit: int,
    checked_at: datetime,
) -> DiagnosticResult:
    """Four consistency checks between appointment_requests and appointments.

    1. Converted request without matching Appointment
    2. Appointment pointing to a non-converted request
    3. One request linked to multiple Appointments
    4. Accepted alternative without matching Appointment
    """
    params: dict[str, object] = {"limit": sample_limit}
    org_filter_req = "ar.organization_id = :org_id AND"
    org_filter_appt = "a.organization_id = :org_id AND"
    if organization_id is not None:
        params["org_id"] = organization_id
    else:
        org_filter_req = ""
        org_filter_appt = ""

    issues: list[dict[str, object]] = []

    # 1. Converted request without Appointment
    orphan_requests_sql = text(f"""
        SELECT
            ar.id AS "requestId",
            ar.organization_id AS "organizationId",
            ar.status AS "requestStatus",
            'converted_request_without_appointment' AS "issue"
        FROM appointment_requests ar
        LEFT JOIN appointments a ON a.appointment_request_id = ar.id
        WHERE {org_filter_req}
            ar.status = 'converted'
            AND a.id IS NULL
        LIMIT :limit
    """)
    result = await session.execute(orphan_requests_sql, params)
    issues.extend([dict(r) for r in result.mappings().all()])

    # 2. Appointment pointing to non-converted request
    mismatched_appt_sql = text(f"""
        SELECT
            a.id AS "appointmentId",
            a.organization_id AS "organizationId",
            a.appointment_request_id AS "requestId",
            ar.status AS "requestStatus",
            'appointment_with_unconverted_request' AS "issue"
        FROM appointments a
        JOIN appointment_requests ar ON ar.id = a.appointment_request_id
        WHERE {org_filter_appt}
            ar.status != 'converted'
        LIMIT :limit
    """)
    result = await session.execute(mismatched_appt_sql, params)
    issues.extend([dict(r) for r in result.mappings().all()])

    # 3. One request with multiple Appointments
    multi_appt_sql = text(f"""
        SELECT
            ar.id AS "requestId",
            ar.organization_id AS "organizationId",
            COUNT(a.id) AS "appointmentCount",
            'request_with_multiple_appointments' AS "issue"
        FROM appointment_requests ar
        JOIN appointments a ON a.appointment_request_id = ar.id
        WHERE {org_filter_req} ar.status = 'converted'
        GROUP BY ar.id, ar.organization_id
        HAVING COUNT(a.id) > 1
        LIMIT :limit
    """)
    result = await session.execute(multi_appt_sql, params)
    issues.extend([dict(r) for r in result.mappings().all()])

    # 4. Accepted alternative without Appointment
    orphan_alt_sql = text(f"""
        SELECT
            ap.id AS "alternativeId",
            ap.organization_id AS "organizationId",
            ap.appointment_request_id AS "requestId",
            ap.status AS "alternativeStatus",
            'accepted_alternative_without_appointment' AS "issue"
        FROM alternative_proposals ap
        LEFT JOIN appointments a ON a.appointment_request_id = ap.appointment_request_id
        WHERE {org_filter_req.replace("ar.", "ap.")}
            ap.status = 'accepted'
            AND a.id IS NULL
        LIMIT :limit
    """)
    result = await session.execute(orphan_alt_sql, params)
    issues.extend([dict(r) for r in result.mappings().all()])

    # Total: distinct appointment_request ids across all four checks
    affected = len(issues)

    if affected == 0:
        return DiagnosticResult(
            key="booking.request_appointment_mismatch",
            status=DiagnosticStatus.OK,
            affected_count=0,
            summary="Svi zahtevi i termini su konzistentni.",
            duration_ms=0,
            checked_at=checked_at,
        )

    return DiagnosticResult(
        key="booking.request_appointment_mismatch",
        status=DiagnosticStatus.ERROR,
        affected_count=affected,
        summary=f"Pronađeno {affected} nekonzistentnosti između zahteva i termina.",
        sample_rows=issues[:sample_limit],
        suggestion=(
            "Proveriti integritet veze appointment_requests ↔ appointments. "
            "Moguć uzrok: direktna SQL manipulacija ili bag u konverziji zahteva."
        ),
        duration_ms=0,
        checked_at=checked_at,
    )


REQUEST_APPOINTMENT_MISMATCH = DiagnosticDefinition(
    key="booking.request_appointment_mismatch",
    label="Neusklađenost zahteva i termina",
    description=(
        "Proverava konzistentnost između appointment_requests i appointments: "
        "siročiće, pogrešne statuse, duple veze i nepotvrđene alternative."
    ),
    collector=collect_request_appointment_mismatch,
    category="booking",
    supported_modes=frozenset({DiagnosticMode.COMPACT, DiagnosticMode.FULL}),
    max_sample_rows=20,
    tenant_aware=True,
)

# ── 4.4 booking.stuck_slot_holds ────────────────────────────────────────────


async def collect_stuck_slot_holds(
    *,
    session: AsyncSession,
    organization_id: UUID | None,
    mode: DiagnosticMode,
    sample_limit: int,
    checked_at: datetime,
) -> DiagnosticResult:
    """Find slot holds that are expired but still formally active, or that
    reference non-existent / terminal requests.
    """
    params: dict[str, object] = {"limit": sample_limit, "now": _now()}
    org_filter_sh = "sh.organization_id = :org_id AND"
    org_filter_sh1 = "sh1.organization_id = :org_id AND"
    if organization_id is not None:
        params["org_id"] = organization_id
    else:
        org_filter_sh = ""
        org_filter_sh1 = ""

    issues: list[dict[str, object]] = []
    warning_count = 0
    error_count = 0

    # 1. Expired holds that are still active (WARNING — D4.4)
    expired_sql = text(f"""
        SELECT
            sh.id AS "holdId",
            sh.organization_id AS "organizationId",
            sh.therapist_profile_id AS "therapistId",
            sh.expires_at AS "expiresAt",
            sh.slot_start AT TIME ZONE 'UTC' AS "slotStart",
            sh.slot_end AT TIME ZONE 'UTC' AS "slotEnd",
            'expired_hold_still_active' AS "issue",
            'warning' AS "severity"
        FROM slot_holds sh
        WHERE {org_filter_sh}
            sh.expires_at < :now
        LIMIT :limit
    """)
    result = await session.execute(expired_sql, params)
    expired = [dict(r) for r in result.mappings().all()]
    issues.extend(expired)
    warning_count += len(expired)

    # 2. Hold linked to terminal request (ERROR — D4.4)
    terminal_sql = text(f"""
        SELECT
            sh.id AS "holdId",
            sh.organization_id AS "organizationId",
            ar.id AS "requestId",
            ar.status AS "requestStatus",
            'hold_on_terminal_request' AS "issue",
            'error' AS "severity"
        FROM slot_holds sh
        JOIN appointments a ON
            a.therapist_profile_id = sh.therapist_profile_id
            AND tstzrange(
                sh.slot_start, sh.slot_end, '[)'
            ) && tstzrange(
                a.start_time, a.end_time, '[)'
            )
        JOIN appointment_requests ar ON a.appointment_request_id = ar.id
        WHERE {org_filter_sh}
            sh.expires_at > :now
            AND ar.status IN ('declined', 'withdrawn', 'expired')
        LIMIT :limit
    """)
    result = await session.execute(terminal_sql, params)
    terminal = [dict(r) for r in result.mappings().all()]
    issues.extend(terminal)
    error_count += len(terminal)

    # 3. Multiple active holds for the same slot
    multi_hold_sql = text(f"""
        SELECT
            sh1.id AS "holdId",
            sh1.organization_id AS "organizationId",
            sh1.therapist_profile_id AS "therapistId",
            sh1.slot_start AT TIME ZONE 'UTC' AS "slotStart",
            sh1.slot_end AT TIME ZONE 'UTC' AS "slotEnd",
            sh2.id AS "otherHoldId",
            'multiple_active_holds_for_slot' AS "issue",
            'error' AS "severity"
        FROM slot_holds sh1
        JOIN slot_holds sh2 ON
            sh2.therapist_profile_id = sh1.therapist_profile_id
            AND sh2.id != sh1.id
            AND tstzrange(
                sh2.slot_start, sh2.slot_end, '[)'
            ) && tstzrange(
                sh1.slot_start, sh1.slot_end, '[)'
            )
        WHERE {org_filter_sh1}
            sh1.expires_at > :now
            AND sh2.expires_at > :now
        LIMIT :limit
    """)
    result = await session.execute(multi_hold_sql, params)
    multi = [dict(r) for r in result.mappings().all()]
    issues.extend(multi)
    error_count += len(multi)

    affected = len(issues)

    if affected == 0:
        return DiagnosticResult(
            key="booking.stuck_slot_holds",
            status=DiagnosticStatus.OK,
            affected_count=0,
            summary="Nema zaglavljenih slot hold-ova.",
            duration_ms=0,
            checked_at=checked_at,
        )

    # Overall status: error trumps warning
    overall = DiagnosticStatus.ERROR if error_count > 0 else DiagnosticStatus.WARNING

    return DiagnosticResult(
        key="booking.stuck_slot_holds",
        status=overall,
        affected_count=affected,
        summary=(
            f"Pronađeno {affected} problematičnih hold-ova "
            f"({error_count} grešaka, {warning_count} upozorenja)."
        ),
        sample_rows=issues[:sample_limit],
        suggestion=(
            "Istekli hold-ovi se mogu očistiti (nema automatskog čišćenja). "
            "Hold-ovi nad terminalnim zahtevima ukazuju na bag u oslobađanju."
        ),
        duration_ms=0,
        checked_at=checked_at,
    )


STUCK_SLOT_HOLDS = DiagnosticDefinition(
    key="booking.stuck_slot_holds",
    label="Zaglavljeni slot hold-ovi",
    description=(
        "Proverava istekle hold-ove, hold-ove nad terminalnim zahtevima "
        "i višestruke aktivne hold-ove za isti slot."
    ),
    collector=collect_stuck_slot_holds,
    category="booking",
    supported_modes=frozenset({DiagnosticMode.COMPACT, DiagnosticMode.FULL}),
    max_sample_rows=20,
    tenant_aware=True,
)
