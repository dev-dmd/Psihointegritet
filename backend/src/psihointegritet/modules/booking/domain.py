"""Booking Engine — domain logic.

Pure functions and value objects. No FastAPI, SQLAlchemy, or Redis imports.
"""

from dataclasses import dataclass
from datetime import UTC, date, datetime, time, timedelta
from uuid import UUID

from .models import (
    AppointmentRequestStatus,
    AppointmentStatus,
    BookingMode,
)

# ── Value Objects ────────────────────────────────────────────────────────────


@dataclass(frozen=True, slots=True)
class BookingOfferContext:
    """Concrete offer for which booking mode is resolved."""

    service_id: str
    therapist_profile_id: str | None = None
    format: str = "in_person"
    location_id: str | None = None


@dataclass(frozen=True, slots=True)
class DerivedSlot:
    """A computed availability slot ready for client display."""

    start: datetime
    end: datetime
    therapist_profile_id: str
    service_id: str
    format: str
    location_id: UUID | None = None
    slot_duration_minutes: int = 60
    buffer_before_minutes: int = 0
    buffer_after_minutes: int = 0


@dataclass(frozen=True, slots=True)
class AvailabilityWindow:
    """Internal: a resolved availability window for one day (ADR-015 v2).

    ``start_step_minutes`` is the grid step (how often candidates start);
    ``duration_minutes`` is how long a candidate occupies the calendar. The
    two are independent: duration=90 with step=60 gives starts 08,09,10… that
    each occupy 90 minutes.
    """

    date: date
    start_time: time
    end_time: time
    start_step_minutes: int
    duration_minutes: int
    buffer_before_minutes: int
    buffer_after_minutes: int
    format: str
    location_id: UUID | None


# ── Booking Mode Resolution ──────────────────────────────────────────────────


def resolve_booking_mode(
    service_mode: BookingMode,
    therapist_override: BookingMode | None = None,
    format_override: BookingMode | None = None,
    location_override: BookingMode | None = None,
) -> BookingMode:
    """Compute effective booking mode from most restrictive override.

    Overrides can only narrow the mode: slot_request → request → disabled.
    They can never expand it.
    """
    mode_order = {
        BookingMode.SLOT_REQUEST: 0,
        BookingMode.REQUEST: 1,
        BookingMode.DISABLED: 2,
    }
    effective = mode_order[service_mode]
    for override in (therapist_override, format_override, location_override):
        if override is not None:
            effective = max(effective, mode_order[override])
    # Map back to enum
    reverse = {v: k for k, v in mode_order.items()}
    return reverse[effective]


# ── Slot Derivation ──────────────────────────────────────────────────────────


def derive_slots(
    windows: list[AvailabilityWindow],
    existing_bookings: list[tuple[datetime, datetime]],
    existing_holds: list[tuple[datetime, datetime]],
    date_from: date,
    date_until: date,
    tz_offset_hours: int = 2,  # Europe/Belgrade default
) -> list[DerivedSlot]:
    """Compute candidate slots from availability windows minus conflicts.

    Candidates advance by ``start_step_minutes`` (grid step); each candidate
    occupies ``duration_minutes``. The occupancy check includes buffer zones.

    Args:
        windows: Resolved availability windows from rules minus exceptions.
        existing_bookings: List of (start, end) for confirmed appointments.
        existing_holds: List of (start, end) for active slot holds.
        date_from: Start of query range (inclusive).
        date_until: End of query range (inclusive).
        tz_offset_hours: UTC offset for the organization's timezone.

    Returns:
        Chronologically sorted list of available DerivedSlot objects.
    """
    slots: list[DerivedSlot] = []

    for window in windows:
        if window.date < date_from or window.date > date_until:
            continue
        # Convert window times to UTC datetimes for the given date
        day_start = datetime.combine(window.date, window.start_time, tzinfo=UTC)
        day_end = datetime.combine(window.date, window.end_time, tzinfo=UTC)
        step = timedelta(minutes=window.start_step_minutes)
        duration = timedelta(minutes=window.duration_minutes)
        current = day_start
        while current + duration <= day_end:
            slot_start = current
            slot_end = current + duration
            # Check for conflicts with existing bookings (including buffer zones)
            block_start = slot_start - timedelta(minutes=window.buffer_before_minutes)
            block_end = slot_end + timedelta(minutes=window.buffer_after_minutes)
            if is_available((block_start, block_end), existing_bookings, existing_holds):
                slots.append(
                    DerivedSlot(
                        start=slot_start,
                        end=slot_end,
                        therapist_profile_id="",  # filled by caller
                        service_id="",  # filled by caller
                        format=window.format,
                        location_id=window.location_id,
                        slot_duration_minutes=window.duration_minutes,
                        buffer_before_minutes=window.buffer_before_minutes,
                        buffer_after_minutes=window.buffer_after_minutes,
                    )
                )
            current += step
    slots.sort(key=lambda s: s.start)
    return slots


def is_available(
    candidate: tuple[datetime, datetime],
    bookings: list[tuple[datetime, datetime]],
    holds: list[tuple[datetime, datetime]],
) -> bool:
    """Check if a candidate time block is free from all conflicts."""
    c_start, c_end = candidate
    return all(not (c_start < b_end and c_end > b_start) for b_start, b_end in bookings + holds)


# ── State Machines ───────────────────────────────────────────────────────────


# AppointmentRequest transitions (BDS-004)
_APPOINTMENT_REQUEST_TRANSITIONS: dict[AppointmentRequestStatus, set[AppointmentRequestStatus]] = {
    AppointmentRequestStatus.SUBMITTED: {
        AppointmentRequestStatus.UNDER_REVIEW,
        AppointmentRequestStatus.WITHDRAWN,
        AppointmentRequestStatus.EXPIRED,
    },
    AppointmentRequestStatus.UNDER_REVIEW: {
        AppointmentRequestStatus.ALTERNATIVE_PROPOSED,
        AppointmentRequestStatus.CONVERTED,
        AppointmentRequestStatus.DECLINED,
        AppointmentRequestStatus.WITHDRAWN,
        AppointmentRequestStatus.EXPIRED,
    },
    AppointmentRequestStatus.ALTERNATIVE_PROPOSED: {
        AppointmentRequestStatus.AWAITING_CLIENT,
        AppointmentRequestStatus.DECLINED,
        AppointmentRequestStatus.WITHDRAWN,
        AppointmentRequestStatus.EXPIRED,
    },
    AppointmentRequestStatus.AWAITING_CLIENT: {
        AppointmentRequestStatus.CONVERTED,
        AppointmentRequestStatus.DECLINED,
        AppointmentRequestStatus.WITHDRAWN,
        AppointmentRequestStatus.EXPIRED,
    },
    # Terminal states
    AppointmentRequestStatus.CONVERTED: set(),
    AppointmentRequestStatus.DECLINED: set(),
    AppointmentRequestStatus.WITHDRAWN: set(),
    AppointmentRequestStatus.EXPIRED: set(),
}

# Appointment transitions (BDS-005)
_APPOINTMENT_TRANSITIONS: dict[AppointmentStatus, set[AppointmentStatus]] = {
    AppointmentStatus.CONFIRMED: {
        AppointmentStatus.COMPLETED,
        AppointmentStatus.NO_SHOW,
        AppointmentStatus.CANCELLED,
    },
    AppointmentStatus.COMPLETED: set(),
    AppointmentStatus.NO_SHOW: set(),
    AppointmentStatus.CANCELLED: set(),
}


def require_appointment_request_transition(
    current: AppointmentRequestStatus,
    target: AppointmentRequestStatus,
) -> None:
    """Raise ValueError if the transition is not allowed."""
    allowed = _APPOINTMENT_REQUEST_TRANSITIONS.get(current, set())
    if target not in allowed:
        raise ValueError(f"Invalid AppointmentRequest transition: {current.value} → {target.value}")


def require_appointment_transition(
    current: AppointmentStatus,
    target: AppointmentStatus,
) -> None:
    """Raise ValueError if the transition is not allowed."""
    allowed = _APPOINTMENT_TRANSITIONS.get(current, set())
    if target not in allowed:
        raise ValueError(f"Invalid Appointment transition: {current.value} → {target.value}")


# ── Cancellation Policy ──────────────────────────────────────────────────────


def can_client_cancel(
    appointment_start: datetime,
    cancellation_notice_hours: int = 24,
    now: datetime | None = None,
) -> bool:
    """Check if the cancellation notice period is satisfied."""
    now = now or datetime.now(UTC)
    return (appointment_start - now).total_seconds() / 3600 >= cancellation_notice_hours
