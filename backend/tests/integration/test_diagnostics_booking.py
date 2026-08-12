"""Diagnostic booking collector integration tests (DIAGNOSTIC_TODO.md §7.2).

Healthy-state + one expired-slot-hold test.  Negative scenarios (duplicate
configs, overlapping appointments) are prevented by DB constraints — the
diagnostic SQL itself is exercised by the read-only-guarantee test below.
"""

from datetime import UTC, datetime, timedelta
from typing import TypedDict
from uuid import UUID, uuid4

import pytest
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from psihointegritet.modules.content.models import ContentEntry, ContentType
from psihointegritet.modules.diagnostics.collectors.booking import (
    collect_appointment_overlaps,
    collect_duplicate_config_scope,
    collect_request_appointment_mismatch,
    collect_stuck_slot_holds,
)
from psihointegritet.modules.diagnostics.contracts import DiagnosticMode, DiagnosticStatus
from psihointegritet.modules.guidance.models import TherapistMatchingProfile

# Side-effect import: registers the `internal_users` table in the metadata so the
# `therapist_matching_profiles.assigned_user_id` FK resolves at mapper configure.
from psihointegritet.modules.identity.models import (
    InternalUser,  # noqa: F401  # pyright: ignore[reportUnusedImport]
)
from psihointegritet.modules.organizations.models import Organization

NOW = datetime(2026, 8, 8, 12, 0, tzinfo=UTC)


class _Kw(TypedDict):
    session: AsyncSession
    organization_id: UUID
    mode: DiagnosticMode
    sample_limit: int
    checked_at: datetime


@pytest.fixture
async def env(db_session: AsyncSession) -> tuple[UUID, UUID, UUID]:
    org = Organization(slug=f"diag-{uuid4().hex[:8]}", display_name="Diag org")
    db_session.add(org)
    await db_session.flush()
    tp = TherapistMatchingProfile(
        organization_id=org.id,
        slug=f"dt-{uuid4().hex[:8]}",
        display_name="Diag T",
        services=[],
        areas=[],
        formats=[],
        locations=[],
        min_child_age=0,
    )
    db_session.add(tp)
    await db_session.flush()
    entry = ContentEntry(
        organization_id=org.id,
        content_type=ContentType.SERVICE,
        slug=f"ds-{uuid4().hex[:8]}",
    )
    db_session.add(entry)
    await db_session.flush()
    return org.id, tp.id, entry.id


async def _insert_appt(
    session: AsyncSession,
    *,
    o: UUID,
    t: UUID,
    s: UUID,
    start: datetime,
    end: datetime,
    status: str = "confirmed",
) -> UUID:
    aid = uuid4()
    await session.execute(
        text("""
        INSERT INTO appointments (id, organization_id, therapist_profile_id, service_id,
            start_time, end_time, status, format, client_name, client_email, client_timezone)
        VALUES (:id,:o,:t,:s,:st,:en,:status,'in_person','Test','t@e.com','Europe/Belgrade')
    """),
        {"id": aid, "o": o, "t": t, "s": s, "st": start, "en": end, "status": status},
    )
    await session.flush()
    return aid


async def _insert_cfg(session: AsyncSession, *, o: UUID, s: UUID, t: UUID | None = None) -> UUID:
    cid = uuid4()
    await session.execute(
        text("""
        INSERT INTO service_booking_configs (id, organization_id, service_id,
            therapist_profile_id, format, location_id, booking_mode)
        VALUES (:id,:o,:s,:t,'in_person',NULL,'request')
    """),
        {"id": cid, "o": o, "s": s, "t": t},
    )
    await session.flush()
    return cid


# ── Healthy-state tests ─────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_appointments_healthy(db_session: AsyncSession, env: tuple[UUID, UUID, UUID]) -> None:
    o, t, s = env
    d1, d2, d3 = NOW + timedelta(hours=1), NOW + timedelta(hours=2), NOW + timedelta(hours=3)
    await _insert_appt(db_session, o=o, t=t, s=s, start=d1, end=d2)
    await _insert_appt(db_session, o=o, t=t, s=s, start=d2, end=d3)
    r = await collect_appointment_overlaps(
        session=db_session,
        organization_id=o,
        mode=DiagnosticMode.COMPACT,
        sample_limit=5,
        checked_at=NOW,
    )
    assert r.status == DiagnosticStatus.OK and r.affected_count == 0


@pytest.mark.asyncio
async def test_appointments_adjacent(
    db_session: AsyncSession, env: tuple[UUID, UUID, UUID]
) -> None:
    o, t, s = env
    d1, d2, d3 = NOW + timedelta(hours=1), NOW + timedelta(hours=2), NOW + timedelta(hours=3)
    await _insert_appt(db_session, o=o, t=t, s=s, start=d1, end=d2)
    await _insert_appt(db_session, o=o, t=t, s=s, start=d2, end=d3)
    r = await collect_appointment_overlaps(
        session=db_session,
        organization_id=o,
        mode=DiagnosticMode.COMPACT,
        sample_limit=5,
        checked_at=NOW,
    )
    assert r.status == DiagnosticStatus.OK


@pytest.mark.asyncio
async def test_configs_healthy(db_session: AsyncSession, env: tuple[UUID, UUID, UUID]) -> None:
    o, _, s = env
    await _insert_cfg(db_session, o=o, s=s)
    r = await collect_duplicate_config_scope(
        session=db_session,
        organization_id=o,
        mode=DiagnosticMode.COMPACT,
        sample_limit=5,
        checked_at=NOW,
    )
    assert r.status == DiagnosticStatus.OK


@pytest.mark.asyncio
async def test_request_mismatch_healthy(
    db_session: AsyncSession, env: tuple[UUID, UUID, UUID]
) -> None:
    o, _, _ = env
    r = await collect_request_appointment_mismatch(
        session=db_session,
        organization_id=o,
        mode=DiagnosticMode.COMPACT,
        sample_limit=5,
        checked_at=NOW,
    )
    assert r.status == DiagnosticStatus.OK and r.affected_count == 0


@pytest.mark.asyncio
async def test_holds_healthy(db_session: AsyncSession, env: tuple[UUID, UUID, UUID]) -> None:
    o, _, _ = env
    r = await collect_stuck_slot_holds(
        session=db_session,
        organization_id=o,
        mode=DiagnosticMode.COMPACT,
        sample_limit=5,
        checked_at=NOW,
    )
    assert r.status == DiagnosticStatus.OK and r.affected_count == 0


@pytest.mark.asyncio
async def test_holds_expired(db_session: AsyncSession, env: tuple[UUID, UUID, UUID]) -> None:
    o, t, s = env
    real_now = datetime.now(UTC)
    await db_session.execute(
        text("""
        INSERT INTO slot_holds (id, organization_id, therapist_profile_id, service_id,
            slot_start, slot_end, client_timezone, idempotency_key, expires_at)
        VALUES (:id,:o,:t,:s,:ss,:se,'Europe/Belgrade',:ik,:ex)
    """),
        {
            "id": str(uuid4()),
            "o": o,
            "t": t,
            "s": s,
            "ss": real_now - timedelta(hours=2),
            "se": real_now - timedelta(hours=1),
            "ik": f"h-{uuid4().hex[:8]}",
            "ex": real_now - timedelta(hours=1),
        },
    )
    await db_session.flush()
    r = await collect_stuck_slot_holds(
        session=db_session,
        organization_id=o,
        mode=DiagnosticMode.FULL,
        sample_limit=5,
        checked_at=NOW,
    )
    assert r.status in (DiagnosticStatus.WARNING, DiagnosticStatus.ERROR)
    assert r.affected_count >= 1


@pytest.mark.asyncio
async def test_all_read_only(db_session: AsyncSession, env: tuple[UUID, UUID, UUID]) -> None:
    o, _, _ = env
    colls = [
        collect_appointment_overlaps,
        collect_duplicate_config_scope,
        collect_request_appointment_mismatch,
        collect_stuck_slot_holds,
    ]
    for cf in colls:
        kw: _Kw = {
            "session": db_session,
            "organization_id": o,
            "mode": DiagnosticMode.COMPACT,
            "sample_limit": 5,
            "checked_at": NOW,
        }
        r1, r2 = await cf(**kw), await cf(**kw)
        assert r1.affected_count == r2.affected_count, f"{cf.__name__} not read-only"


# ── Negative scenarios (DIAGNOSTIC_TODO.md §7.2) ─────────────────────────────
# DB constraints normally prevent these states, so each negative test drops the
# relevant constraint inside its own transaction; the rollback restores it.


async def _insert_request(
    session: AsyncSession,
    *,
    o: UUID,
    t: UUID,
    s: UUID,
    status: str = "submitted",
) -> UUID:
    rid = uuid4()
    await session.execute(
        text("""
        INSERT INTO appointment_requests (id, organization_id, therapist_profile_id,
            service_id, request_type, status, format, client_name, client_email,
            client_timezone, idempotency_key)
        VALUES (:id,:o,:t,:s,'initial',:status,'in_person','Test','t@e.com',
            'Europe/Belgrade',:ik)
    """),
        {"id": str(rid), "o": o, "t": t, "s": s, "status": status, "ik": f"r-{uuid4().hex[:8]}"},
    )
    await session.flush()
    return rid


@pytest.mark.asyncio
async def test_appointment_overlaps_error(
    db_session: AsyncSession, env: tuple[UUID, UUID, UUID]
) -> None:
    """Overlapping confirmed appointments must be reported as ERROR (4.1)."""
    o, t, s = env
    await db_session.execute(
        text("ALTER TABLE appointments DROP CONSTRAINT appointments_no_therapist_overlap")
    )
    d1, d2, d3 = NOW + timedelta(hours=1), NOW + timedelta(hours=2), NOW + timedelta(hours=3)
    await _insert_appt(db_session, o=o, t=t, s=s, start=d1, end=d3)
    await _insert_appt(db_session, o=o, t=t, s=s, start=d2, end=d3)

    r = await collect_appointment_overlaps(
        session=db_session,
        organization_id=o,
        mode=DiagnosticMode.FULL,
        sample_limit=5,
        checked_at=NOW,
    )
    assert r.status == DiagnosticStatus.ERROR
    assert r.affected_count >= 1
    # sample_rows must not carry client PII
    for row in r.sample_rows:
        assert "client_name" not in row and "client_email" not in row
        assert "client_phone" not in row and "client_note" not in row
        assert {"organizationId", "therapistId", "appointmentId"} <= set(row)


@pytest.mark.asyncio
async def test_appointment_overlaps_ignores_cancelled(
    db_session: AsyncSession, env: tuple[UUID, UUID, UUID]
) -> None:
    """Cancelled appointments do not participate in overlap detection (4.1)."""
    o, t, s = env
    await db_session.execute(
        text("ALTER TABLE appointments DROP CONSTRAINT appointments_no_therapist_overlap")
    )
    d1, d2, d3 = NOW + timedelta(hours=1), NOW + timedelta(hours=2), NOW + timedelta(hours=3)
    await _insert_appt(db_session, o=o, t=t, s=s, start=d1, end=d3, status="cancelled")
    await _insert_appt(db_session, o=o, t=t, s=s, start=d2, end=d3, status="confirmed")

    r = await collect_appointment_overlaps(
        session=db_session,
        organization_id=o,
        mode=DiagnosticMode.COMPACT,
        sample_limit=5,
        checked_at=NOW,
    )
    assert r.status == DiagnosticStatus.OK and r.affected_count == 0


@pytest.mark.asyncio
async def test_duplicate_config_null_location(
    db_session: AsyncSession, env: tuple[UUID, UUID, UUID]
) -> None:
    """Two configs with NULL location_id must be reported (4.2)."""
    o, _, s = env
    await db_session.execute(
        text("ALTER TABLE service_booking_configs DROP CONSTRAINT uq_booking_config_offer")
    )
    await _insert_cfg(db_session, o=o, s=s)
    await _insert_cfg(db_session, o=o, s=s)

    r = await collect_duplicate_config_scope(
        session=db_session,
        organization_id=o,
        mode=DiagnosticMode.COMPACT,
        sample_limit=5,
        checked_at=NOW,
    )
    assert r.status == DiagnosticStatus.ERROR
    assert r.affected_count >= 1
    for row in r.sample_rows:
        assert row.get("locationId") is None
        count = row.get("count")
        assert isinstance(count, int) and count >= 2


@pytest.mark.asyncio
async def test_request_mismatch_converted_without_appointment(
    db_session: AsyncSession, env: tuple[UUID, UUID, UUID]
) -> None:
    """A converted request with no Appointment must be reported (4.3)."""
    o, t, s = env
    await _insert_request(db_session, o=o, t=t, s=s, status="converted")

    r = await collect_request_appointment_mismatch(
        session=db_session,
        organization_id=o,
        mode=DiagnosticMode.COMPACT,
        sample_limit=5,
        checked_at=NOW,
    )
    assert r.status == DiagnosticStatus.ERROR
    assert r.affected_count >= 1


@pytest.mark.asyncio
async def test_tenant_isolation(db_session: AsyncSession, env: tuple[UUID, UUID, UUID]) -> None:
    """Another tenant's findings must not leak into a tenant-scoped result."""
    o, t, s = env
    await db_session.execute(
        text("ALTER TABLE appointments DROP CONSTRAINT appointments_no_therapist_overlap")
    )
    d1, d2, d3 = NOW + timedelta(hours=1), NOW + timedelta(hours=2), NOW + timedelta(hours=3)
    await _insert_appt(db_session, o=o, t=t, s=s, start=d1, end=d3)
    await _insert_appt(db_session, o=o, t=t, s=s, start=d2, end=d3)

    other_org = Organization(slug=f"diag-other-{uuid4().hex[:8]}", display_name="Other org")
    db_session.add(other_org)
    await db_session.flush()

    r_other = await collect_appointment_overlaps(
        session=db_session,
        organization_id=other_org.id,
        mode=DiagnosticMode.COMPACT,
        sample_limit=5,
        checked_at=NOW,
    )
    assert r_other.status == DiagnosticStatus.OK and r_other.affected_count == 0

    r_all = await collect_appointment_overlaps(
        session=db_session,
        organization_id=None,
        mode=DiagnosticMode.COMPACT,
        sample_limit=5,
        checked_at=NOW,
    )
    assert r_all.status == DiagnosticStatus.ERROR
    assert r_all.affected_count >= 1
