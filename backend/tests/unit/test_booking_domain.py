"""Unit tests for Booking domain logic.

ADR-013: Request-First Booking Aggregates
ADR-015: Availability Service Contract
Pure functions — no database, no FastAPI, no Redis.
"""

from datetime import UTC, date, datetime, time, timedelta
from uuid import UUID

import pytest

from psihointegritet.modules.booking.domain import (
    AvailabilityWindow,
    CandidateStart,
    can_client_cancel,
    derive_slots,
    flexible_grid_strategy,
    hourly_grid_strategy,
    is_available,
    manual_slots_strategy,
    occupancy_resolver,
    require_appointment_request_transition,
    require_appointment_transition,
    resolve_booking_mode,
)
from psihointegritet.modules.booking.models import (
    AppointmentRequestStatus,
    AppointmentStatus,
    BookingMode,
)

# ── resolve_booking_mode ─────────────────────────────────────────────────────


class TestResolveBookingMode:
    def test_service_mode_is_default_when_no_overrides(self) -> None:
        assert resolve_booking_mode(BookingMode.SLOT_REQUEST) is BookingMode.SLOT_REQUEST

    def test_therapist_override_narrows_to_request(self) -> None:
        assert (
            resolve_booking_mode(BookingMode.SLOT_REQUEST, therapist_override=BookingMode.REQUEST)
            is BookingMode.REQUEST
        )

    def test_format_override_narrows_to_disabled(self) -> None:
        assert (
            resolve_booking_mode(BookingMode.SLOT_REQUEST, format_override=BookingMode.DISABLED)
            is BookingMode.DISABLED
        )

    def test_location_override_cannot_expand(self) -> None:
        # request cannot expand back to slot_request
        assert (
            resolve_booking_mode(BookingMode.REQUEST, location_override=BookingMode.SLOT_REQUEST)
            is BookingMode.REQUEST
        )

    def test_most_restrictive_wins(self) -> None:
        # slot_request narrowed by therapist=request, format=disabled → disabled
        assert (
            resolve_booking_mode(
                BookingMode.SLOT_REQUEST,
                therapist_override=BookingMode.REQUEST,
                format_override=BookingMode.DISABLED,
            )
            is BookingMode.DISABLED
        )

    def test_all_disabled_stays_disabled(self) -> None:
        assert (
            resolve_booking_mode(
                BookingMode.DISABLED,
                therapist_override=BookingMode.SLOT_REQUEST,
                format_override=BookingMode.SLOT_REQUEST,
            )
            is BookingMode.DISABLED
        )


# ── is_available ────────────────────────────────────────────────────────────


class TestIsAvailable:
    def test_no_conflicts_returns_true(self) -> None:
        candidate = (
            datetime(2026, 8, 10, 10, 0, tzinfo=UTC),
            datetime(2026, 8, 10, 11, 0, tzinfo=UTC),
        )
        assert is_available(candidate, [], []) is True

    def test_booking_overlaps_start(self) -> None:
        candidate = (
            datetime(2026, 8, 10, 10, 0, tzinfo=UTC),
            datetime(2026, 8, 10, 11, 0, tzinfo=UTC),
        )
        bookings = [
            (
                datetime(2026, 8, 10, 9, 30, tzinfo=UTC),
                datetime(2026, 8, 10, 10, 15, tzinfo=UTC),
            )
        ]
        assert is_available(candidate, bookings, []) is False

    def test_booking_overlaps_end(self) -> None:
        candidate = (
            datetime(2026, 8, 10, 10, 0, tzinfo=UTC),
            datetime(2026, 8, 10, 11, 0, tzinfo=UTC),
        )
        bookings = [
            (
                datetime(2026, 8, 10, 10, 45, tzinfo=UTC),
                datetime(2026, 8, 10, 11, 30, tzinfo=UTC),
            )
        ]
        assert is_available(candidate, bookings, []) is False

    def test_booking_contained_is_conflict(self) -> None:
        candidate = (
            datetime(2026, 8, 10, 10, 0, tzinfo=UTC),
            datetime(2026, 8, 10, 11, 0, tzinfo=UTC),
        )
        bookings = [
            (
                datetime(2026, 8, 10, 10, 15, tzinfo=UTC),
                datetime(2026, 8, 10, 10, 45, tzinfo=UTC),
            )
        ]
        assert is_available(candidate, bookings, []) is False

    def test_booking_enclosing_is_conflict(self) -> None:
        candidate = (
            datetime(2026, 8, 10, 10, 0, tzinfo=UTC),
            datetime(2026, 8, 10, 11, 0, tzinfo=UTC),
        )
        bookings = [
            (
                datetime(2026, 8, 10, 9, 0, tzinfo=UTC),
                datetime(2026, 8, 10, 12, 0, tzinfo=UTC),
            )
        ]
        assert is_available(candidate, bookings, []) is False

    def test_adjacent_booking_no_conflict(self) -> None:
        candidate = (
            datetime(2026, 8, 10, 10, 0, tzinfo=UTC),
            datetime(2026, 8, 10, 11, 0, tzinfo=UTC),
        )
        bookings = [
            (
                datetime(2026, 8, 10, 11, 0, tzinfo=UTC),
                datetime(2026, 8, 10, 12, 0, tzinfo=UTC),
            )
        ]
        assert is_available(candidate, bookings, []) is True

    def test_hold_conflicts_block_slot(self) -> None:
        candidate = (
            datetime(2026, 8, 10, 10, 0, tzinfo=UTC),
            datetime(2026, 8, 10, 11, 0, tzinfo=UTC),
        )
        holds = [
            (
                datetime(2026, 8, 10, 10, 0, tzinfo=UTC),
                datetime(2026, 8, 10, 11, 0, tzinfo=UTC),
            )
        ]
        assert is_available(candidate, [], holds) is False


# ── derive_slots ─────────────────────────────────────────────────────────────


def _reference_date() -> date:
    return date(2026, 8, 10)  # Monday


def _window(
    d: date | None = None,
    start_hour: int = 9,
    end_hour: int = 17,
    duration: int = 60,
    step: int = 60,
    buffer_before: int = 0,
    buffer_after: int = 0,
    timezone: str = "UTC",
) -> AvailabilityWindow:
    d = d or _reference_date()
    return AvailabilityWindow(
        date=d,
        start_time=time(start_hour, 0),
        end_time=time(end_hour, 0),
        timezone=timezone,
        start_step_minutes=step,
        duration_minutes=duration,
        buffer_before_minutes=buffer_before,
        buffer_after_minutes=buffer_after,
        format="online",
        location_id=None,
    )


class TestDeriveSlots:
    def test_empty_windows_produces_no_slots(self) -> None:
        slots = derive_slots([], [], [], _reference_date(), _reference_date())
        assert slots == []

    def test_single_window_produces_correct_number_of_slots(self) -> None:
        # 9:00-17:00 with 60-min slots = 8 slots
        window = _window()
        slots = derive_slots([window], [], [], _reference_date(), _reference_date())
        assert len(slots) == 8  # 9,10,11,12,13,14,15,16 = 8 slots
        assert slots[0].start == datetime(2026, 8, 10, 9, 0, tzinfo=UTC)
        assert slots[-1].end == datetime(2026, 8, 10, 17, 0, tzinfo=UTC)

    def test_slot_does_not_overflow_window(self) -> None:
        # 9:00-9:45 with 60-min slot = 0 slots (can't fit 60 in 45)
        window = _window(start_hour=9, end_hour=9, duration=60)
        window = AvailabilityWindow(
            date=_reference_date(),
            start_time=time(9, 0),
            end_time=time(9, 45),
            timezone="UTC",
            start_step_minutes=60,
            duration_minutes=60,
            buffer_before_minutes=0,
            buffer_after_minutes=0,
            format="online",
            location_id=None,
        )
        slots = derive_slots([window], [], [], _reference_date(), _reference_date())
        assert slots == []

    def test_existing_booking_removes_slot(self) -> None:
        window = _window()
        booking_start = datetime(2026, 8, 10, 10, 0, tzinfo=UTC)
        booking_end = datetime(2026, 8, 10, 11, 0, tzinfo=UTC)
        slots = derive_slots(
            [window], [(booking_start, booking_end)], [], _reference_date(), _reference_date()
        )
        assert len(slots) == 7  # 10:00 slot removed
        slot_starts = {s.start for s in slots}
        assert booking_start not in slot_starts

    def test_buffer_after_blocks_adjacent_slot(self) -> None:
        # 15-min buffer after means the slot extends past its end, blocking the next
        window = _window(buffer_after=15)
        # Booking at 11:00-12:00 → slot 10:00-11:00 effective block is 10:00-11:15
        # block_end(11:15) > booking_start(11:00) → conflict, slot removed
        booking_start = datetime(2026, 8, 10, 11, 0, tzinfo=UTC)
        booking_end = datetime(2026, 8, 10, 12, 0, tzinfo=UTC)
        slots = derive_slots(
            [window], [(booking_start, booking_end)], [], _reference_date(), _reference_date()
        )
        slot_starts = {s.start for s in slots}
        # Slot at 10:00 has block_end=11:15, which overlaps booking at 11:00 → removed
        assert datetime(2026, 8, 10, 10, 0, tzinfo=UTC) not in slot_starts

    def test_active_hold_removes_slot(self) -> None:
        window = _window()
        hold_start = datetime(2026, 8, 10, 14, 0, tzinfo=UTC)
        hold_end = datetime(2026, 8, 10, 15, 0, tzinfo=UTC)
        slots = derive_slots(
            [window], [], [(hold_start, hold_end)], _reference_date(), _reference_date()
        )
        assert len(slots) == 7  # 14:00 slot removed
        slot_starts = {s.start for s in slots}
        assert hold_start not in slot_starts

    def test_outside_date_range_excluded(self) -> None:
        window = _window(d=date(2026, 8, 10))  # Monday Aug 10
        slots = derive_slots(
            [window],
            [],
            [],
            date(2026, 8, 11),
            date(2026, 8, 12),  # Tuesday-Wednesday
        )
        assert slots == []

    def test_slots_are_chronologically_sorted(self) -> None:
        window = _window(start_hour=14, end_hour=16)  # 2 afternoon slots
        slots = derive_slots([window], [], [], _reference_date(), _reference_date())
        assert len(slots) == 2
        assert slots[0].start < slots[1].start


# ── State machine: AppointmentRequest ────────────────────────────────────────


class TestAppointmentRequestTransitions:
    def test_submitted_to_under_review_allowed(self) -> None:
        require_appointment_request_transition(
            AppointmentRequestStatus.SUBMITTED, AppointmentRequestStatus.UNDER_REVIEW
        )

    def test_submitted_to_withdrawn_allowed(self) -> None:
        require_appointment_request_transition(
            AppointmentRequestStatus.SUBMITTED, AppointmentRequestStatus.WITHDRAWN
        )

    def test_submitted_to_converted_not_allowed(self) -> None:
        with pytest.raises(ValueError, match="Invalid AppointmentRequest transition"):
            require_appointment_request_transition(
                AppointmentRequestStatus.SUBMITTED, AppointmentRequestStatus.CONVERTED
            )

    def test_under_review_to_converted_allowed(self) -> None:
        require_appointment_request_transition(
            AppointmentRequestStatus.UNDER_REVIEW, AppointmentRequestStatus.CONVERTED
        )

    def test_under_review_to_alternative_proposed_allowed(self) -> None:
        require_appointment_request_transition(
            AppointmentRequestStatus.UNDER_REVIEW,
            AppointmentRequestStatus.ALTERNATIVE_PROPOSED,
        )

    def test_alternative_proposed_to_awaiting_client_allowed(self) -> None:
        require_appointment_request_transition(
            AppointmentRequestStatus.ALTERNATIVE_PROPOSED,
            AppointmentRequestStatus.AWAITING_CLIENT,
        )

    def test_awaiting_client_to_converted_allowed(self) -> None:
        require_appointment_request_transition(
            AppointmentRequestStatus.AWAITING_CLIENT, AppointmentRequestStatus.CONVERTED
        )

    def test_terminal_converted_cannot_transition(self) -> None:
        with pytest.raises(ValueError, match="Invalid AppointmentRequest transition"):
            require_appointment_request_transition(
                AppointmentRequestStatus.CONVERTED, AppointmentRequestStatus.WITHDRAWN
            )

    def test_terminal_declined_cannot_transition(self) -> None:
        with pytest.raises(ValueError, match="Invalid AppointmentRequest transition"):
            require_appointment_request_transition(
                AppointmentRequestStatus.DECLINED, AppointmentRequestStatus.SUBMITTED
            )

    def test_terminal_withdrawn_cannot_transition(self) -> None:
        with pytest.raises(ValueError, match="Invalid AppointmentRequest transition"):
            require_appointment_request_transition(
                AppointmentRequestStatus.WITHDRAWN, AppointmentRequestStatus.SUBMITTED
            )

    def test_terminal_expired_cannot_transition(self) -> None:
        with pytest.raises(ValueError, match="Invalid AppointmentRequest transition"):
            require_appointment_request_transition(
                AppointmentRequestStatus.EXPIRED, AppointmentRequestStatus.SUBMITTED
            )


# ── State machine: Appointment ───────────────────────────────────────────────


class TestAppointmentTransitions:
    def test_confirmed_to_completed_allowed(self) -> None:
        require_appointment_transition(AppointmentStatus.CONFIRMED, AppointmentStatus.COMPLETED)

    def test_confirmed_to_no_show_allowed(self) -> None:
        require_appointment_transition(AppointmentStatus.CONFIRMED, AppointmentStatus.NO_SHOW)

    def test_confirmed_to_cancelled_allowed(self) -> None:
        require_appointment_transition(AppointmentStatus.CONFIRMED, AppointmentStatus.CANCELLED)

    def test_completed_cannot_transition(self) -> None:
        with pytest.raises(ValueError, match="Invalid Appointment transition"):
            require_appointment_transition(AppointmentStatus.COMPLETED, AppointmentStatus.NO_SHOW)

    def test_no_show_cannot_transition(self) -> None:
        with pytest.raises(ValueError, match="Invalid Appointment transition"):
            require_appointment_transition(AppointmentStatus.NO_SHOW, AppointmentStatus.COMPLETED)

    def test_cancelled_cannot_transition(self) -> None:
        with pytest.raises(ValueError, match="Invalid Appointment transition"):
            require_appointment_transition(AppointmentStatus.CANCELLED, AppointmentStatus.CONFIRMED)


# ── can_client_cancel ────────────────────────────────────────────────────────


class TestCanClientCancel:
    def test_within_notice_returns_true(self) -> None:
        appointment_start = datetime.now(UTC) + timedelta(hours=48)
        assert can_client_cancel(appointment_start, cancellation_notice_hours=24) is True

    def test_past_notice_returns_false(self) -> None:
        appointment_start = datetime.now(UTC) + timedelta(hours=12)
        assert can_client_cancel(appointment_start, cancellation_notice_hours=24) is False

    def test_exactly_at_boundary_returns_true(self) -> None:
        now = datetime(2026, 8, 10, 10, 0, tzinfo=UTC)
        appointment_start = now + timedelta(hours=24)
        assert can_client_cancel(appointment_start, cancellation_notice_hours=24, now=now) is True

    def test_custom_notice_hours(self) -> None:
        appointment_start = datetime.now(UTC) + timedelta(hours=48)
        assert can_client_cancel(appointment_start, cancellation_notice_hours=72) is False

    def test_explicit_now_parameter(self) -> None:
        now = datetime(2026, 8, 10, 10, 0, tzinfo=UTC)
        appointment_start = datetime(2026, 8, 11, 8, 0, tzinfo=UTC)  # 22h from now
        assert can_client_cancel(appointment_start, cancellation_notice_hours=24, now=now) is False


# ── Strategies & Occupancy (ADR-015 v2 §2.7) ────────────────────────────────


class TestGridStrategies:
    def _window(self, step: int, duration: int = 60, start_hour: int = 9, end_hour: int = 12):
        return AvailabilityWindow(
            date=_reference_date(),
            start_time=time(start_hour, 0),
            end_time=time(end_hour, 0),
            timezone="UTC",
            start_step_minutes=step,
            duration_minutes=duration,
            buffer_before_minutes=0,
            buffer_after_minutes=0,
            format="online",
            location_id=None,
        )

    def test_hourly_grid_starts_on_the_hour(self) -> None:
        candidates = hourly_grid_strategy(self._window(step=60))
        starts = [c.start.hour for c in candidates]
        assert starts == [9, 10, 11]

    def test_flexible_grid_uses_profile_step(self) -> None:
        candidates = flexible_grid_strategy(self._window(step=30))
        starts = [c.start.hour * 60 + c.start.minute for c in candidates]
        # 11:30 + 60 does not fit before 12:00, so the last candidate is 11:00
        assert starts == [9 * 60, 9 * 60 + 30, 10 * 60, 10 * 60 + 30, 11 * 60]

    def test_duration_independent_of_step(self) -> None:
        # duration=90, step=60 → starts 09,10 (11:00+90 does not fit before 12:00)
        candidates = hourly_grid_strategy(self._window(step=60, duration=90))
        assert len(candidates) == 2
        assert all(isinstance(c, CandidateStart) for c in candidates)

    def test_last_candidate_must_fit_fully(self) -> None:
        # end 11:00, duration 90 → 9:00+90 fits, 10:00+90=11:30 exceeds 11:00
        candidates = hourly_grid_strategy(self._window(step=60, duration=90, end_hour=11))
        assert [c.start.hour for c in candidates] == [9]

    def test_manual_slots_strategy_returns_explicit_starts(self) -> None:
        d = _reference_date()
        starts: list[tuple[datetime, str, UUID | None]] = [
            (datetime.combine(d, time(14, 0), tzinfo=UTC), "online", None),
            (datetime.combine(d, time(16, 0), tzinfo=UTC), "online", None),
        ]
        candidates = manual_slots_strategy(starts)
        assert [c.start.hour for c in candidates] == [14, 16]


class TestOccupancyResolver:
    def _candidate(self, hour: int) -> CandidateStart:
        return CandidateStart(
            start=datetime.combine(_reference_date(), time(hour, 0), tzinfo=UTC),
            format="online",
            location_id=None,
        )

    def test_unavailable_interval_blocks_overlapping_candidate(self) -> None:
        d = _reference_date()
        candidates = [self._candidate(9), self._candidate(10), self._candidate(11)]
        unavailable = [
            (
                datetime.combine(d, time(9, 30), tzinfo=UTC),
                datetime.combine(d, time(10, 30), tzinfo=UTC),
            )
        ]
        result = occupancy_resolver(
            candidates,
            duration_minutes=60,
            unavailable_intervals=unavailable,
        )
        # 9:00-10:00 overlaps 9:30-10:30; 10:00-11:00 overlaps it too; 11:00 free
        assert [s.start.hour for s in result] == [11]

    def test_full_day_unavailable_blocks_everything(self) -> None:
        d = _reference_date()
        candidates = [self._candidate(9), self._candidate(10)]
        unavailable = [
            (
                datetime.combine(d, datetime.min.time(), tzinfo=UTC),
                datetime.combine(d, datetime.max.time(), tzinfo=UTC),
            )
        ]
        result = occupancy_resolver(
            candidates,
            duration_minutes=60,
            unavailable_intervals=unavailable,
        )
        assert result == []

    def test_booking_and_hold_block(self) -> None:
        d = _reference_date()
        candidates = [self._candidate(9), self._candidate(11)]
        booking = [
            (
                datetime.combine(d, time(9, 0), tzinfo=UTC),
                datetime.combine(d, time(10, 0), tzinfo=UTC),
            )
        ]
        hold = [
            (
                datetime.combine(d, time(11, 0), tzinfo=UTC),
                datetime.combine(d, time(12, 0), tzinfo=UTC),
            )
        ]
        result = occupancy_resolver(
            candidates,
            duration_minutes=60,
            existing_bookings=booking,
            existing_holds=hold,
        )
        assert result == []

    def test_adjacent_booking_does_not_block(self) -> None:
        d = _reference_date()
        candidates = [self._candidate(10)]
        booking = [
            (
                datetime.combine(d, time(11, 0), tzinfo=UTC),
                datetime.combine(d, time(12, 0), tzinfo=UTC),
            )
        ]
        result = occupancy_resolver(
            candidates,
            duration_minutes=60,
            existing_bookings=booking,
        )
        assert [s.start.hour for s in result] == [10]

    def test_buffer_zones_extend_the_block(self) -> None:
        d = _reference_date()
        candidates = [self._candidate(10)]
        booking = [
            (
                datetime.combine(d, time(11, 0), tzinfo=UTC),
                datetime.combine(d, time(12, 0), tzinfo=UTC),
            )
        ]
        # without buffer the candidate 10:00-11:00 does not overlap 11:00-12:00
        free = occupancy_resolver(candidates, duration_minutes=60, existing_bookings=booking)
        assert len(free) == 1
        # with a 15-minute after-buffer the block becomes 10:00-11:15, a conflict
        blocked = occupancy_resolver(
            candidates,
            duration_minutes=60,
            buffer_after_minutes=15,
            existing_bookings=booking,
        )
        assert blocked == []


# ── Timezone / DST (ADR-015 v2 §2.7.3, D29) ─────────────────────────────────


class TestLocalWallClockToUtc:
    """Recurring rules are local wall clock; UTC exists only per concrete date.

    Before this was fixed, `datetime.combine(date, start_time, tzinfo=UTC)`
    stamped 08:00 Belgrade as 08:00Z, so every published slot was two hours off
    in summer and one in winter, and DST never applied at all.
    """

    def _belgrade_window(self, d: date) -> AvailabilityWindow:
        return AvailabilityWindow(
            date=d,
            start_time=time(8, 0),
            end_time=time(12, 0),
            timezone="Europe/Belgrade",
            start_step_minutes=60,
            duration_minutes=60,
            buffer_before_minutes=0,
            buffer_after_minutes=0,
            format="online",
            location_id=None,
        )

    def test_summer_local_eight_is_six_utc(self) -> None:
        day = date(2026, 8, 10)  # CEST, UTC+2
        slots = derive_slots([self._belgrade_window(day)], [], [], day, day)
        assert slots[0].start == datetime(2026, 8, 10, 6, 0, tzinfo=UTC)

    def test_winter_local_eight_is_seven_utc(self) -> None:
        day = date(2026, 1, 12)  # CET, UTC+1
        slots = derive_slots([self._belgrade_window(day)], [], [], day, day)
        assert slots[0].start == datetime(2026, 1, 12, 7, 0, tzinfo=UTC)

    def test_working_day_keeps_its_local_length_across_the_dst_switch(self) -> None:
        # The therapist works 08:00-12:00 local on both days; the UTC instants
        # differ but the number of hours offered must not.
        summer = derive_slots(
            [self._belgrade_window(date(2026, 8, 10))], [], [], date(2026, 8, 10), date(2026, 8, 10)
        )
        winter = derive_slots(
            [self._belgrade_window(date(2026, 1, 12))], [], [], date(2026, 1, 12), date(2026, 1, 12)
        )
        assert len(summer) == len(winter) == 4
