"""Booking Engine — application service layer.

Orchestrates transactions, authorization, and event emission.
No SQL in routers; no business logic outside this layer.
"""

from datetime import UTC, datetime, time, timedelta
from uuid import UUID, uuid4

from sqlalchemy import CursorResult, delete, func, or_, select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from psihointegritet.core.config import Settings
from psihointegritet.core.logging import get_logger
from psihointegritet.modules.booking.domain import (
    AvailabilityWindow,
    CandidateStart,
    can_client_cancel,
    flexible_grid_strategy,
    hourly_grid_strategy,
    manual_slots_strategy,
    occupancy_resolver,
    require_appointment_request_transition,
    require_appointment_transition,
)
from psihointegritet.modules.booking.models import (
    AlternativeProposal,
    AlternativeProposalStatus,
    Appointment,
    AppointmentRequest,
    AppointmentRequestStatus,
    AppointmentRequestType,
    AppointmentStatus,
    AvailabilityException,
    AvailabilityExceptionKind,
    AvailabilityMode,
    AvailabilityProfile,
    AvailabilityRule,
    BookingMode,
    CancellationActor,
    ManualAvailabilitySlot,
    ManualAvailabilitySlotSource,
    ServiceBookingConfig,
    SlotHold,
)
from psihointegritet.modules.booking.schemas import (
    AcceptAlternativeRequest,
    AppointmentOut,
    AppointmentRequestIn,
    AppointmentRequestOut,
    AvailabilityExceptionIn,
    AvailabilityExceptionOut,
    AvailabilityProfileIn,
    AvailabilityProfileOut,
    AvailabilityRuleIn,
    AvailabilityRuleOut,
    CancelAppointmentRequest,
    DerivedSlotOut,
    ManualAvailabilitySlotIn,
    ManualAvailabilitySlotOut,
    ReviewAction,
    ServiceBookingConfigIn,
    ServiceBookingConfigOut,
    SlotHoldOut,
    SlotHoldRequest,
    SlotQueryParams,
)

logger = get_logger(__name__)


def _parse_time(value: str) -> time:
    """Parse a time string like '07:00' or '07:00:00' into a time object."""
    try:
        return time.fromisoformat(value)
    except ValueError:
        # Try with HH:MM format
        parts = value.strip().split(":")
        return time(int(parts[0]), int(parts[1]), int(parts[2][:2]) if len(parts) > 2 else 0)


class BookingConflictError(RuntimeError):
    """Optimistic concurrency or availability conflict."""

    code = "BOOKING_CONFLICT"


class BookingSlotConflictError(BookingConflictError):
    """The DB exclusion constraint rejected an overlapping appointment insert.

    Raised only after PostgreSQL itself refused the INSERT (sqlstate 23P01,
    `appointments_no_therapist_overlap` — see 0009 migration). The
    application-level availability re-check in `review_request`/
    `accept_alternative` catches most conflicts earlier for a faster response,
    but the DB is what actually decides who gets the slot under concurrency.
    """

    code = "BOOKING_SLOT_CONFLICT"


class BookingValidationError(ValueError):
    """Input validation failure in booking domain."""


_EXCLUSION_VIOLATION_SQLSTATE = "23P01"


def _is_exclusion_violation(error: IntegrityError) -> bool:
    return getattr(error.orig, "sqlstate", None) == _EXCLUSION_VIOLATION_SQLSTATE


class BookingService:
    """Application layer for therapist availability and client booking."""

    def __init__(self, session: AsyncSession, settings: Settings) -> None:
        self._session = session
        self._settings = settings

    # ── Booking Config ──────────────────────────────────────────────────

    async def upsert_booking_config(
        self, organization_id: UUID, data: ServiceBookingConfigIn
    ) -> ServiceBookingConfigOut:
        """Create or update a booking config for a concrete offer.

        `uq_booking_config_offer` is NULLS NOT DISTINCT (0008 migration), so
        the DB-level ON CONFLICT below is what actually enforces "one active
        config per offer" — including offers with no location_id. A
        select-then-insert-or-update in Python cannot be made race-free here;
        this single statement can.
        """
        stmt = pg_insert(ServiceBookingConfig).values(
            id=uuid4(),
            organization_id=organization_id,
            service_id=data.service_id,
            therapist_profile_id=data.therapist_profile_id,
            format=data.format,
            location_id=data.location_id,
            booking_mode=BookingMode(data.booking_mode),
            duration_minutes=data.duration_minutes,
            buffer_before_minutes=data.buffer_before_minutes,
            buffer_after_minutes=data.buffer_after_minutes,
            availability_profile_id=data.availability_profile_id,
            is_active=data.is_active,
        )
        stmt = stmt.on_conflict_do_update(
            constraint="uq_booking_config_offer",
            set_={
                "booking_mode": stmt.excluded.booking_mode,
                "duration_minutes": stmt.excluded.duration_minutes,
                "buffer_before_minutes": stmt.excluded.buffer_before_minutes,
                "buffer_after_minutes": stmt.excluded.buffer_after_minutes,
                "availability_profile_id": stmt.excluded.availability_profile_id,
                "is_active": stmt.excluded.is_active,
                "updated_at": func.now(),
            },
        ).returning(ServiceBookingConfig)
        result = await self._session.scalars(stmt)
        config = result.one()
        await self._session.flush()
        return ServiceBookingConfigOut.model_validate(config)

    # ── Availability Profiles (ADR-015 v2) ────────────────────────────────

    async def create_availability_profile(
        self, organization_id: UUID, data: AvailabilityProfileIn
    ) -> AvailabilityProfileOut:
        profile = AvailabilityProfile(
            id=uuid4(),
            organization_id=organization_id,
            therapist_profile_id=data.therapist_profile_id,
            mode=AvailabilityMode(data.mode),
            timezone=data.timezone,
            start_step_minutes=data.start_step_minutes,
            enabled=data.enabled,
        )
        self._session.add(profile)
        try:
            await self._session.flush()
        except IntegrityError:
            await self._session.rollback()
            raise BookingConflictError(
                "An availability profile already exists for this therapist and mode"
            ) from None
        return AvailabilityProfileOut.model_validate(profile)

    async def list_availability_profiles(
        self, organization_id: UUID, therapist_profile_id: UUID
    ) -> list[AvailabilityProfileOut]:
        result = await self._session.execute(
            select(AvailabilityProfile)
            .where(
                AvailabilityProfile.organization_id == organization_id,
                AvailabilityProfile.therapist_profile_id == therapist_profile_id,
            )
            .order_by(AvailabilityProfile.created_at)
        )
        return [AvailabilityProfileOut.model_validate(p) for p in result.scalars().all()]

    async def get_availability_profile(
        self, organization_id: UUID, profile_id: UUID
    ) -> AvailabilityProfileOut:
        result = await self._session.execute(
            select(AvailabilityProfile).where(
                AvailabilityProfile.id == profile_id,
                AvailabilityProfile.organization_id == organization_id,
            )
        )
        profile = result.scalar_one_or_none()
        if profile is None:
            raise BookingValidationError("Availability profile not found")
        return AvailabilityProfileOut.model_validate(profile)

    async def update_availability_profile(
        self, organization_id: UUID, profile_id: UUID, data: AvailabilityProfileIn
    ) -> AvailabilityProfileOut:
        result = await self._session.execute(
            select(AvailabilityProfile).where(
                AvailabilityProfile.id == profile_id,
                AvailabilityProfile.organization_id == organization_id,
            )
        )
        profile = result.scalar_one_or_none()
        if profile is None:
            raise BookingValidationError("Availability profile not found")
        profile.mode = AvailabilityMode(data.mode)
        profile.timezone = data.timezone
        profile.start_step_minutes = data.start_step_minutes
        profile.enabled = data.enabled
        await self._session.flush()
        await self._session.refresh(profile)
        return AvailabilityProfileOut.model_validate(profile)

    async def delete_availability_profile(self, organization_id: UUID, profile_id: UUID) -> None:
        result = await self._session.execute(
            delete(AvailabilityProfile).where(
                AvailabilityProfile.id == profile_id,
                AvailabilityProfile.organization_id == organization_id,
            )
        )
        if isinstance(result, CursorResult) and result.rowcount == 0:
            raise BookingValidationError("Availability profile not found")
        await self._session.flush()

    # ── Availability Rules ──────────────────────────────────────────────

    async def create_availability_rule(
        self, organization_id: UUID, data: AvailabilityRuleIn
    ) -> AvailabilityRuleOut:
        rule = AvailabilityRule(
            id=uuid4(),
            organization_id=organization_id,
            availability_profile_id=data.availability_profile_id,
            day_of_week=data.day_of_week,
            start_local_time=_parse_time(data.start_local_time),
            end_local_time=_parse_time(data.end_local_time),
            valid_from=data.valid_from,
            valid_until=data.valid_until,
            format=data.format,
            location_id=data.location_id,
        )
        self._session.add(rule)
        try:
            await self._session.flush()
        except IntegrityError:
            await self._session.rollback()
            raise BookingConflictError(
                "An overlapping rule already exists for this profile and weekday"
            ) from None
        return AvailabilityRuleOut.model_validate(rule)

    async def list_availability_rules(
        self, organization_id: UUID, availability_profile_id: UUID
    ) -> list[AvailabilityRuleOut]:
        result = await self._session.execute(
            select(AvailabilityRule)
            .where(
                AvailabilityRule.organization_id == organization_id,
                AvailabilityRule.availability_profile_id == availability_profile_id,
                AvailabilityRule.is_active == True,  # noqa: E712
            )
            .order_by(AvailabilityRule.day_of_week, AvailabilityRule.start_local_time)
        )
        return [AvailabilityRuleOut.model_validate(r) for r in result.scalars().all()]

    async def update_availability_rule(
        self, organization_id: UUID, rule_id: UUID, data: AvailabilityRuleIn
    ) -> AvailabilityRuleOut:
        rule = await self._get_availability_rule(organization_id, rule_id)
        rule.availability_profile_id = data.availability_profile_id
        rule.day_of_week = data.day_of_week
        rule.start_local_time = _parse_time(data.start_local_time)
        rule.end_local_time = _parse_time(data.end_local_time)
        rule.valid_from = data.valid_from
        rule.valid_until = data.valid_until
        rule.format = data.format
        rule.location_id = data.location_id
        try:
            await self._session.flush()
        except IntegrityError:
            await self._session.rollback()
            raise BookingConflictError(
                "An overlapping rule already exists for this profile and weekday"
            ) from None
        await self._session.refresh(rule)
        return AvailabilityRuleOut.model_validate(rule)

    async def delete_availability_rule(self, organization_id: UUID, rule_id: UUID) -> None:
        rule = await self._get_availability_rule(organization_id, rule_id)
        rule.is_active = False
        await self._session.flush()

    async def _get_availability_rule(
        self, organization_id: UUID, rule_id: UUID
    ) -> AvailabilityRule:
        result = await self._session.execute(
            select(AvailabilityRule).where(
                AvailabilityRule.id == rule_id,
                AvailabilityRule.organization_id == organization_id,
            )
        )
        rule = result.scalar_one_or_none()
        if rule is None:
            raise BookingValidationError("Availability rule not found")
        return rule

    # ── Availability Exceptions (ADR-015 v2) ──────────────────────────────

    async def create_availability_exception(
        self, organization_id: UUID, data: AvailabilityExceptionIn
    ) -> AvailabilityExceptionOut:
        exc = AvailabilityException(
            id=uuid4(),
            organization_id=organization_id,
            therapist_profile_id=data.therapist_profile_id,
            availability_profile_id=data.availability_profile_id,
            kind=AvailabilityExceptionKind(data.kind),
            starts_at=data.starts_at,
            ends_at=data.ends_at,
            format=data.format,
            location_id=data.location_id,
            reason_code=data.reason_code,
        )
        self._session.add(exc)
        await self._session.flush()
        return AvailabilityExceptionOut.model_validate(exc)

    async def delete_availability_exception(
        self, organization_id: UUID, exception_id: UUID
    ) -> None:
        result = await self._session.execute(
            delete(AvailabilityException).where(
                AvailabilityException.id == exception_id,
                AvailabilityException.organization_id == organization_id,
            )
        )
        if isinstance(result, CursorResult) and result.rowcount == 0:
            raise BookingValidationError("Availability exception not found")
        await self._session.flush()

    # ── Manual Availability Slots (ADR-015 v2 §2.7.5) ─────────────────────

    async def create_manual_availability_slot(
        self, organization_id: UUID, data: ManualAvailabilitySlotIn
    ) -> ManualAvailabilitySlotOut:
        slot = ManualAvailabilitySlot(
            id=uuid4(),
            organization_id=organization_id,
            availability_profile_id=data.availability_profile_id,
            starts_at=data.starts_at,
            format=data.format,
            location_id=data.location_id,
            source=ManualAvailabilitySlotSource(data.source),
        )
        self._session.add(slot)
        await self._session.flush()
        return ManualAvailabilitySlotOut.model_validate(slot)

    async def delete_manual_availability_slot(self, organization_id: UUID, slot_id: UUID) -> None:
        result = await self._session.execute(
            delete(ManualAvailabilitySlot).where(
                ManualAvailabilitySlot.id == slot_id,
                ManualAvailabilitySlot.organization_id == organization_id,
            )
        )
        if isinstance(result, CursorResult) and result.rowcount == 0:
            raise BookingValidationError("Manual availability slot not found")
        await self._session.flush()

    # ── Slot Derivation & Hold ──────────────────────────────────────────

    async def get_available_slots(
        self, organization_id: UUID, params: SlotQueryParams
    ) -> list[DerivedSlotOut]:
        """Compute available slots for a given service/therapist/format combo.

        ADR-015 v2: availability is resolved through ``AvailabilityProfile``
        (mode/step), ``AvailabilityRule`` (when), ``AvailabilityException``
        (unavailable / extra_available) and ``ManualAvailabilitySlot``
        (manual mode). Per-offer duration/buffers come from
        ``ServiceBookingConfig``; defaults apply when no config exists yet.
        """
        # Per-offer duration/buffers (KOLIKO) — ADR-015 v2 §2.7.2
        config_result = await self._session.execute(
            select(ServiceBookingConfig).where(
                ServiceBookingConfig.organization_id == organization_id,
                ServiceBookingConfig.service_id == params.service_id,
                ServiceBookingConfig.therapist_profile_id == params.therapist_profile_id,
                ServiceBookingConfig.format == params.format,
                ServiceBookingConfig.is_active == True,  # noqa: E712
            )
        )
        config = config_result.scalar_one_or_none()
        duration_minutes = config.duration_minutes if config and config.duration_minutes else 60
        buffer_before = config.buffer_before_minutes if config else 0
        buffer_after = config.buffer_after_minutes if config else 0
        profile_id = config.availability_profile_id if config else None

        # Availability profile (KAKO) — from config, or first enabled for therapist
        profile: AvailabilityProfile | None = None
        if profile_id is not None:
            prof_result = await self._session.execute(
                select(AvailabilityProfile).where(
                    AvailabilityProfile.id == profile_id,
                    AvailabilityProfile.organization_id == organization_id,
                    AvailabilityProfile.enabled == True,  # noqa: E712
                )
            )
            profile = prof_result.scalar_one_or_none()
        if profile is None:
            prof_result = await self._session.execute(
                select(AvailabilityProfile)
                .where(
                    AvailabilityProfile.organization_id == organization_id,
                    AvailabilityProfile.therapist_profile_id == params.therapist_profile_id,
                    AvailabilityProfile.enabled == True,  # noqa: E712
                )
                .order_by(AvailabilityProfile.created_at)
                .limit(1)
            )
            profile = prof_result.scalars().first()
        if profile is None:
            return []
        start_step = profile.start_step_minutes or 60
        profile_id = profile.id

        # Availability rules (KADA) on the resolved profile
        rules_result = await self._session.execute(
            select(AvailabilityRule).where(
                AvailabilityRule.organization_id == organization_id,
                AvailabilityRule.availability_profile_id == profile_id,
                AvailabilityRule.is_active == True,  # noqa: E712
                AvailabilityRule.format == params.format,
                AvailabilityRule.valid_from <= params.date_until,
                or_(
                    AvailabilityRule.valid_until.is_(None),
                    AvailabilityRule.valid_until >= params.date_from,
                ),
            )
        )
        rules = list(rules_result.scalars().all())

        # Exceptions (unavailable / extra_available) — global or profile-scoped
        exc_result = await self._session.execute(
            select(AvailabilityException).where(
                AvailabilityException.organization_id == organization_id,
                AvailabilityException.therapist_profile_id == params.therapist_profile_id,
                or_(
                    AvailabilityException.availability_profile_id.is_(None),
                    AvailabilityException.availability_profile_id == profile_id,
                ),
                AvailabilityException.ends_at
                >= datetime.combine(params.date_from, datetime.min.time(), tzinfo=UTC),
                AvailabilityException.starts_at
                <= datetime.combine(params.date_until, datetime.max.time(), tzinfo=UTC)
                + timedelta(days=1),
            )
        )
        exceptions = list(exc_result.scalars().all())

        # Manual slots for manual_slots mode
        manual_slots: list[ManualAvailabilitySlot] = []
        if profile.mode == AvailabilityMode.MANUAL_SLOTS:
            manual_result = await self._session.execute(
                select(ManualAvailabilitySlot).where(
                    ManualAvailabilitySlot.organization_id == organization_id,
                    ManualAvailabilitySlot.availability_profile_id == profile_id,
                    ManualAvailabilitySlot.starts_at
                    >= datetime.combine(params.date_from, datetime.min.time(), tzinfo=UTC),
                    ManualAvailabilitySlot.starts_at
                    <= datetime.combine(params.date_until, datetime.max.time(), tzinfo=UTC),
                )
            )
            manual_slots = list(manual_result.scalars().all())

        # Load confirmed appointments
        appts_result = await self._session.execute(
            select(Appointment).where(
                Appointment.organization_id == organization_id,
                Appointment.therapist_profile_id == params.therapist_profile_id,
                Appointment.status == AppointmentStatus.CONFIRMED,
                Appointment.start_time
                >= datetime.combine(params.date_from, datetime.min.time(), tzinfo=UTC),
                Appointment.end_time
                <= datetime.combine(params.date_until, datetime.max.time(), tzinfo=UTC)
                + timedelta(days=1),
            )
        )
        bookings = [(a.start_time, a.end_time) for a in appts_result.scalars().all()]

        # Load active holds
        now = datetime.now(UTC)
        holds_result = await self._session.execute(
            select(SlotHold).where(
                SlotHold.organization_id == organization_id,
                SlotHold.therapist_profile_id == params.therapist_profile_id,
                SlotHold.expires_at > now,
            )
        )
        holds = [(h.slot_start, h.slot_end) for h in holds_result.scalars().all()]

        # ── POSITIVE AVAILABILITY: generate candidates per mode ───────────
        # hourly_grid / flexible_grid → grid windows from rules + extra
        # manual_slots → explicit starts (ADR-015 v2 §2.7.6)
        from datetime import timedelta as td

        candidates: list[CandidateStart] = []

        if profile.mode == AvailabilityMode.MANUAL_SLOTS:
            # manual mode: only explicit therapist-chosen starts
            candidates = manual_slots_strategy(
                [(m.starts_at, m.format, m.location_id) for m in manual_slots]
            )
        else:
            windows: list[AvailabilityWindow] = []
            current_date = params.date_from
            while current_date <= params.date_until:
                for rule in rules:
                    if rule.day_of_week != current_date.weekday():
                        continue
                    windows.append(
                        AvailabilityWindow(
                            date=current_date,
                            start_time=rule.start_local_time,
                            end_time=rule.end_local_time,
                            start_step_minutes=start_step,
                            duration_minutes=duration_minutes,
                            buffer_before_minutes=buffer_before,
                            buffer_after_minutes=buffer_after,
                            format=rule.format,
                            location_id=rule.location_id,
                        )
                    )
                for exc in exceptions:
                    if exc.kind != AvailabilityExceptionKind.EXTRA_AVAILABLE:
                        continue
                    if exc.starts_at.date() != current_date:
                        continue
                    windows.append(
                        AvailabilityWindow(
                            date=current_date,
                            start_time=exc.starts_at.time(),
                            end_time=exc.ends_at.time(),
                            start_step_minutes=start_step,
                            duration_minutes=duration_minutes,
                            buffer_before_minutes=0,
                            buffer_after_minutes=0,
                            format=exc.format or params.format,
                            location_id=exc.location_id or params.location_id,
                        )
                    )
                current_date += td(days=1)

            strategy = (
                hourly_grid_strategy
                if profile.mode == AvailabilityMode.HOURLY_GRID
                else flexible_grid_strategy
            )
            for window in windows:
                candidates.extend(strategy(window))

        # ── BLOCKERS: unavailable intervals + appointments + holds ─────────
        unavailable_intervals = [
            (exc.starts_at, exc.ends_at)
            for exc in exceptions
            if exc.kind == AvailabilityExceptionKind.UNAVAILABLE
        ]

        slots = occupancy_resolver(
            candidates,
            duration_minutes=duration_minutes,
            buffer_before_minutes=buffer_before,
            buffer_after_minutes=buffer_after,
            existing_bookings=bookings,
            existing_holds=holds,
            unavailable_intervals=unavailable_intervals,
            therapist_profile_id=str(params.therapist_profile_id),
            service_id=str(params.service_id),
        )

        return [
            DerivedSlotOut(
                start=s.start,
                end=s.end,
                therapist_profile_id=params.therapist_profile_id,
                service_id=params.service_id,
                format=s.format,
                duration_minutes=s.slot_duration_minutes,
            )
            for s in slots
        ]

    async def create_slot_hold(self, organization_id: UUID, data: SlotHoldRequest) -> SlotHoldOut:
        """Atomically hold a slot for the duration of form submission."""
        ttl = self._settings.slot_hold_ttl_seconds
        expires_at = datetime.now(UTC) + timedelta(seconds=ttl)

        hold = SlotHold(
            id=uuid4(),
            organization_id=organization_id,
            therapist_profile_id=data.therapist_profile_id,
            service_id=data.service_id,
            slot_start=data.slot_start,
            slot_end=data.slot_end,
            client_timezone=data.client_timezone,
            idempotency_key=data.idempotency_key,
            expires_at=expires_at,
        )
        self._session.add(hold)
        try:
            await self._session.flush()
        except IntegrityError:
            await self._session.rollback()
            # Idempotent: return existing hold if same key
            result = await self._session.execute(
                select(SlotHold).where(SlotHold.idempotency_key == data.idempotency_key)
            )
            existing = result.scalar_one_or_none()
            if existing:
                return SlotHoldOut.model_validate(existing)
            raise BookingConflictError("Slot already held by another client") from None
        return SlotHoldOut.model_validate(hold)

    async def release_slot_hold(self, hold_id: UUID, organization_id: UUID) -> None:
        """Release a slot hold after successful submission or expiry."""
        await self._session.execute(
            delete(SlotHold).where(
                SlotHold.id == hold_id,
                SlotHold.organization_id == organization_id,
            )
        )
        await self._session.flush()

    # ── Appointment Requests ────────────────────────────────────────────

    async def create_appointment_request(
        self, organization_id: UUID, data: AppointmentRequestIn
    ) -> AppointmentRequestOut:
        """Submit a booking or reschedule request."""
        request = AppointmentRequest(
            id=uuid4(),
            organization_id=organization_id,
            therapist_profile_id=data.therapist_profile_id,
            service_id=data.service_id,
            request_type=AppointmentRequestType(data.request_type),
            preferred_start=data.preferred_start,
            preferred_end=data.preferred_end,
            existing_appointment_id=data.existing_appointment_id,
            format=data.format,
            location_id=data.location_id,
            client_name=data.client_name,
            client_email=data.client_email,
            client_phone=data.client_phone,
            client_timezone=data.client_timezone,
            client_note=data.client_note,
            idempotency_key=data.idempotency_key,
            consent_booking_rules=data.consent_booking_rules,
        )
        self._session.add(request)
        try:
            await self._session.flush()
        except IntegrityError:
            await self._session.rollback()
            result = await self._session.execute(
                select(AppointmentRequest).where(
                    AppointmentRequest.idempotency_key == data.idempotency_key
                )
            )
            existing = result.scalar_one_or_none()
            if existing:
                return AppointmentRequestOut.model_validate(existing)
            raise BookingConflictError("Duplicate idempotency key conflict") from None
        return AppointmentRequestOut.model_validate(request)

    async def list_appointment_requests(
        self,
        organization_id: UUID,
        therapist_profile_id: UUID | None = None,
        status: str | None = None,
    ) -> list[AppointmentRequestOut]:
        """List appointment requests for a therapist or organization."""
        query = select(AppointmentRequest).where(
            AppointmentRequest.organization_id == organization_id
        )
        if therapist_profile_id:
            query = query.where(AppointmentRequest.therapist_profile_id == therapist_profile_id)
        if status:
            query = query.where(AppointmentRequest.status == AppointmentRequestStatus(status))
        query = query.order_by(AppointmentRequest.created_at.desc())
        result = await self._session.execute(query)
        return [AppointmentRequestOut.model_validate(r) for r in result.scalars().all()]

    async def list_client_appointment_requests(
        self, organization_id: UUID, client_email: str
    ) -> list[AppointmentRequestOut]:
        """List requests for a specific client (public access by email)."""
        result = await self._session.execute(
            select(AppointmentRequest)
            .where(
                AppointmentRequest.organization_id == organization_id,
                AppointmentRequest.client_email == client_email,
            )
            .order_by(AppointmentRequest.created_at.desc())
        )
        return [AppointmentRequestOut.model_validate(r) for r in result.scalars().all()]

    # ── Review & Confirmation ───────────────────────────────────────────

    async def review_request(
        self,
        organization_id: UUID,
        request_id: UUID,
        action: ReviewAction,
        reviewer_user_id: UUID,
    ) -> dict[str, str]:
        """Therapist reviews a pending appointment request.

        Actions: confirm → creates Appointment, decline → closes request,
        propose_alternative → creates alternative proposals.

        `confirm` locks the request row (SELECT ... FOR UPDATE) so two
        concurrent reviews of the SAME request can't both succeed, then
        re-checks availability at the application level to fail fast on an
        obvious conflict — but `appointments_no_therapist_overlap` (0009
        migration) is what actually decides who gets the slot under real
        concurrency; see `_confirm_request`.
        """
        req = await self._get_request_for_update(organization_id, request_id)
        require_appointment_request_transition(req.status, AppointmentRequestStatus.UNDER_REVIEW)
        req.status = AppointmentRequestStatus.UNDER_REVIEW
        req.reviewed_by_user_id = reviewer_user_id
        req.reviewed_at = datetime.now(UTC)

        if action.action == "confirm":
            return await self._confirm_request(req)

        if action.action == "decline":
            req.status = AppointmentRequestStatus.DECLINED
            await self._session.flush()
            return {"action": "declined"}

        if action.action == "propose_alternative":
            require_appointment_request_transition(
                AppointmentRequestStatus.UNDER_REVIEW,
                AppointmentRequestStatus.ALTERNATIVE_PROPOSED,
            )
            if not action.alternatives:
                raise BookingValidationError("At least one alternative required")
            for alt in action.alternatives:
                proposal = AlternativeProposal(
                    id=uuid4(),
                    organization_id=organization_id,
                    appointment_request_id=req.id,
                    proposed_start=alt.proposed_start,
                    proposed_end=alt.proposed_end,
                    format=alt.format,
                    location_id=alt.location_id,
                    therapist_note=alt.therapist_note,
                    expires_at=alt.expires_at,
                )
                self._session.add(proposal)
            req.status = AppointmentRequestStatus.AWAITING_CLIENT
            await self._session.flush()
            return {"action": "alternatives_proposed"}

        raise BookingValidationError(f"Unknown action: {action.action}")

    async def _confirm_request(self, req: AppointmentRequest) -> dict[str, str]:
        require_appointment_request_transition(req.status, AppointmentRequestStatus.CONVERTED)
        start = req.preferred_start or datetime.now(UTC)
        end = req.preferred_end or datetime.now(UTC) + timedelta(hours=1)
        await self._assert_slot_still_available(
            req.organization_id, req.therapist_profile_id, start, end
        )
        appointment = Appointment(
            id=uuid4(),
            organization_id=req.organization_id,
            therapist_profile_id=req.therapist_profile_id,
            service_id=req.service_id,
            appointment_request_id=req.id,
            start_time=start,
            end_time=end,
            format=req.format,
            location_id=req.location_id,
            status=AppointmentStatus.CONFIRMED,
            client_name=req.client_name,
            client_email=req.client_email,
            client_phone=req.client_phone,
            client_timezone=req.client_timezone,
            client_note=req.client_note,
        )
        self._session.add(appointment)
        try:
            await self._session.flush()
        except IntegrityError as error:
            # No rollback here: this leaves the whole use-case's transaction
            # unresolved on purpose, so the request's under_review mutation
            # above never commits either — it reverts to whatever was last
            # committed once the caller's session closes without commit
            # (rule §17: the use case doesn't own partial rollback, the
            # request/session boundary does).
            if _is_exclusion_violation(error):
                raise BookingSlotConflictError(
                    "This time slot was just taken by another booking."
                ) from error
            raise
        req.status = AppointmentRequestStatus.CONVERTED
        await self._session.flush()
        return {"action": "confirmed", "appointment_id": str(appointment.id)}

    async def _assert_slot_still_available(
        self,
        organization_id: UUID,
        therapist_profile_id: UUID,
        start: datetime,
        end: datetime,
    ) -> None:
        """Fail fast on an obvious conflict before attempting the INSERT.

        Reduces wasted round trips under contention, but is not itself the
        guarantee — `appointments_no_therapist_overlap` is (see 0009
        migration and `_confirm_request`'s exclusion-violation handling).
        """
        result = await self._session.execute(
            select(Appointment.id).where(
                Appointment.organization_id == organization_id,
                Appointment.therapist_profile_id == therapist_profile_id,
                Appointment.status.in_(
                    (
                        AppointmentStatus.CONFIRMED,
                        AppointmentStatus.COMPLETED,
                        AppointmentStatus.NO_SHOW,
                    )
                ),
                Appointment.start_time < end,
                Appointment.end_time > start,
            )
        )
        if result.first() is not None:
            raise BookingSlotConflictError("This time slot is no longer available.")

    async def accept_alternative(
        self, organization_id: UUID, request_id: UUID, data: AcceptAlternativeRequest
    ) -> dict[str, str]:
        """Client atomically accepts one alternative.

        Locks the request row (SELECT ... FOR UPDATE) so a concurrent
        acceptance of the same request can't also succeed; the appointment
        insert is protected exactly like `_confirm_request` — see there for
        why the DB exclusion constraint is the real guarantee.
        """
        req = await self._get_request_for_update(organization_id, request_id)
        if req.status != AppointmentRequestStatus.AWAITING_CLIENT:
            raise BookingValidationError(
                f"Request is not awaiting client choice (current: {req.status.value})"
            )

        result = await self._session.execute(
            select(AlternativeProposal).where(
                AlternativeProposal.id == data.proposal_id,
                AlternativeProposal.appointment_request_id == request_id,
                AlternativeProposal.status == AlternativeProposalStatus.PROPOSED,
            )
        )
        chosen = result.scalar_one_or_none()
        if chosen is None:
            raise BookingValidationError("Alternative proposal not found or already taken")

        chosen.status = AlternativeProposalStatus.ACCEPTED
        other_result = await self._session.execute(
            select(AlternativeProposal).where(
                AlternativeProposal.appointment_request_id == request_id,
                AlternativeProposal.id != data.proposal_id,
            )
        )
        for other in other_result.scalars().all():
            other.status = AlternativeProposalStatus.CLOSED

        require_appointment_request_transition(req.status, AppointmentRequestStatus.CONVERTED)
        await self._assert_slot_still_available(
            organization_id, req.therapist_profile_id, chosen.proposed_start, chosen.proposed_end
        )
        appointment = Appointment(
            id=uuid4(),
            organization_id=organization_id,
            therapist_profile_id=req.therapist_profile_id,
            service_id=req.service_id,
            appointment_request_id=req.id,
            start_time=chosen.proposed_start,
            end_time=chosen.proposed_end,
            format=chosen.format,
            location_id=chosen.location_id,
            status=AppointmentStatus.CONFIRMED,
            client_name=req.client_name,
            client_email=req.client_email,
            client_phone=req.client_phone,
            client_timezone=req.client_timezone,
            client_note=req.client_note,
        )
        self._session.add(appointment)
        try:
            await self._session.flush()
        except IntegrityError as error:
            # See _confirm_request: no rollback here on purpose.
            if _is_exclusion_violation(error):
                raise BookingSlotConflictError(
                    "This time slot was just taken by another booking."
                ) from error
            raise
        req.status = AppointmentRequestStatus.CONVERTED
        await self._session.flush()
        return {"action": "alternative_accepted", "appointment_id": str(appointment.id)}

    # ── Appointment Management ──────────────────────────────────────────

    async def list_appointments(
        self,
        organization_id: UUID,
        therapist_profile_id: UUID | None = None,
        status: str | None = None,
        date_from: datetime | None = None,
        date_until: datetime | None = None,
    ) -> list[AppointmentOut]:
        query = select(Appointment).where(Appointment.organization_id == organization_id)
        if therapist_profile_id:
            query = query.where(Appointment.therapist_profile_id == therapist_profile_id)
        if status:
            query = query.where(Appointment.status == AppointmentStatus(status))
        if date_from:
            query = query.where(Appointment.start_time >= date_from)
        if date_until:
            query = query.where(Appointment.start_time <= date_until)
        query = query.order_by(Appointment.start_time)
        result = await self._session.execute(query)
        return [AppointmentOut.model_validate(a) for a in result.scalars().all()]

    async def cancel_appointment(
        self,
        organization_id: UUID,
        appointment_id: UUID,
        data: CancelAppointmentRequest,
        actor: CancellationActor = CancellationActor.CLIENT,
    ) -> AppointmentOut:
        appt = await self._get_appointment(organization_id, appointment_id)
        require_appointment_transition(appt.status, AppointmentStatus.CANCELLED)

        if actor == CancellationActor.CLIENT and not can_client_cancel(appt.start_time):
            raise BookingValidationError("Cancellation notice period has elapsed")

        appt.status = AppointmentStatus.CANCELLED
        appt.cancelled_by = actor
        appt.cancellation_reason = data.reason
        appt.cancelled_at = datetime.now(UTC)
        await self._session.flush()
        await self._session.refresh(appt)
        return AppointmentOut.model_validate(appt)

    async def complete_appointment(
        self, organization_id: UUID, appointment_id: UUID
    ) -> AppointmentOut:
        appt = await self._get_appointment(organization_id, appointment_id)
        require_appointment_transition(appt.status, AppointmentStatus.COMPLETED)
        appt.status = AppointmentStatus.COMPLETED
        await self._session.flush()
        await self._session.refresh(appt)
        return AppointmentOut.model_validate(appt)

    async def mark_no_show(self, organization_id: UUID, appointment_id: UUID) -> AppointmentOut:
        appt = await self._get_appointment(organization_id, appointment_id)
        require_appointment_transition(appt.status, AppointmentStatus.NO_SHOW)
        appt.status = AppointmentStatus.NO_SHOW
        await self._session.flush()
        await self._session.refresh(appt)
        return AppointmentOut.model_validate(appt)

    async def _get_request(self, organization_id: UUID, request_id: UUID) -> AppointmentRequest:
        result = await self._session.execute(
            select(AppointmentRequest).where(
                AppointmentRequest.id == request_id,
                AppointmentRequest.organization_id == organization_id,
            )
        )
        req = result.scalar_one_or_none()
        if req is None:
            raise BookingValidationError("Appointment request not found")
        return req

    async def _get_request_for_update(
        self, organization_id: UUID, request_id: UUID
    ) -> AppointmentRequest:
        """Like `_get_request`, but locks the row so a concurrent review/accept
        of the SAME request has to wait instead of also succeeding."""
        result = await self._session.execute(
            select(AppointmentRequest)
            .where(
                AppointmentRequest.id == request_id,
                AppointmentRequest.organization_id == organization_id,
            )
            .with_for_update()
        )
        req = result.scalar_one_or_none()
        if req is None:
            raise BookingValidationError("Appointment request not found")
        return req

    async def _get_appointment(self, organization_id: UUID, appointment_id: UUID) -> Appointment:
        result = await self._session.execute(
            select(Appointment).where(
                Appointment.id == appointment_id,
                Appointment.organization_id == organization_id,
            )
        )
        appt = result.scalar_one_or_none()
        if appt is None:
            raise BookingValidationError("Appointment not found")
        return appt
