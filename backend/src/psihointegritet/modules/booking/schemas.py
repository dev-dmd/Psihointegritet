"""Booking Engine — Pydantic schemas.

Public DTOs for the booking API. Never return ORM objects directly.
"""

from datetime import date, datetime, time
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_serializer, field_validator


def _serialize_time(t: time | str | None) -> str | None:
    """Serialize a time object to HH:MM:SS string, or pass through strings."""
    if t is None:
        return None
    if isinstance(t, str):
        return t
    return t.strftime("%H:%M:%S")


# ── Booking Config ───────────────────────────────────────────────────────────


class ServiceBookingConfigIn(BaseModel):
    """Create or update a booking config for a concrete offer."""

    service_id: UUID
    therapist_profile_id: UUID | None = None
    format: str = Field(min_length=2, max_length=32)
    location_id: UUID | None = None
    booking_mode: str = Field(pattern=r"^(slot_request|request|disabled)$")
    duration_minutes: int | None = Field(default=None, ge=15, le=480)
    buffer_before_minutes: int = Field(default=0, ge=0, le=120)
    buffer_after_minutes: int = Field(default=0, ge=0, le=120)
    availability_profile_id: UUID | None = None
    is_active: bool = True


class ServiceBookingConfigOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    organization_id: UUID
    service_id: UUID
    therapist_profile_id: UUID | None
    format: str
    location_id: UUID | None
    booking_mode: str
    duration_minutes: int | None
    buffer_before_minutes: int
    buffer_after_minutes: int
    availability_profile_id: UUID | None
    is_active: bool
    created_at: datetime
    updated_at: datetime


# ── Availability Profile (ADR-015 v2 §2.7.2) ────────────────────────────────


class MyTherapistProfileOut(BaseModel):
    """Which therapist the signed-in staff member *is*.

    The availability screens edit one therapist's schedule, and the browser only
    knows a Clerk user. Resolving the link server-side keeps the mapping (and
    the possibility of not being a therapist at all) out of the client.
    """

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    slug: str
    display_name: str


class AvailabilityProfileIn(BaseModel):
    therapist_profile_id: UUID
    mode: str = Field(pattern=r"^(hourly_grid|flexible_grid|manual_slots)$")
    timezone: str = Field(default="Europe/Belgrade", max_length=64)
    start_step_minutes: int | None = Field(default=None, ge=5, le=120)
    #: 0 disables the rule; the cap keeps a typo from hiding a whole month.
    min_lead_time_hours: int = Field(default=24, ge=0, le=720)
    cancellation_notice_hours: int = Field(default=24, ge=0, le=720)
    enabled: bool = True


class AvailabilityProfileOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    organization_id: UUID
    therapist_profile_id: UUID
    mode: str
    timezone: str
    start_step_minutes: int | None
    min_lead_time_hours: int
    cancellation_notice_hours: int
    enabled: bool
    created_at: datetime
    updated_at: datetime


# ── Availability ─────────────────────────────────────────────────────────────


class AvailabilityRuleIn(BaseModel):
    availability_profile_id: UUID
    day_of_week: int = Field(ge=0, le=6)
    start_local_time: str = Field(pattern=r"^\d{2}:\d{2}(:\d{2})?$")
    end_local_time: str = Field(pattern=r"^\d{2}:\d{2}(:\d{2})?$")
    valid_from: date
    valid_until: date | None = None
    format: str = Field(min_length=2, max_length=32)
    location_id: UUID | None = None


class AvailabilityRuleOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    organization_id: UUID
    availability_profile_id: UUID
    day_of_week: int
    start_local_time: str
    end_local_time: str
    valid_from: date
    valid_until: date | None
    format: str
    location_id: UUID | None
    is_active: bool
    created_at: datetime
    updated_at: datetime

    @field_serializer("start_local_time", "end_local_time")
    def _ser_time(self, t: time | str | None) -> str | None:
        return _serialize_time(t)

    @field_validator("start_local_time", "end_local_time", mode="before")
    @classmethod
    def _coerce_time_to_str(cls, v: object) -> str | None:
        return _serialize_time(v)  # type: ignore[arg-type]


class AvailabilityExceptionIn(BaseModel):
    therapist_profile_id: UUID
    availability_profile_id: UUID | None = None
    kind: str = Field(pattern=r"^(unavailable|extra_available)$")
    starts_at: datetime
    ends_at: datetime
    format: str | None = Field(default=None, min_length=2, max_length=32)
    location_id: UUID | None = None
    reason_code: str | None = Field(default=None, max_length=64)


class AvailabilityExceptionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    organization_id: UUID
    therapist_profile_id: UUID
    availability_profile_id: UUID | None
    kind: str
    starts_at: datetime
    ends_at: datetime
    format: str | None
    location_id: UUID | None
    reason_code: str | None
    created_at: datetime


# ── Manual Availability Slot (ADR-015 v2 §2.7.5) ────────────────────────────


class ManualAvailabilitySlotIn(BaseModel):
    availability_profile_id: UUID
    starts_at: datetime
    format: str = Field(min_length=2, max_length=32)
    location_id: UUID | None = None
    source: str = Field(default="manual", pattern=r"^(manual|weekly_generator|copied_week)$")


class ManualAvailabilitySlotOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    organization_id: UUID
    availability_profile_id: UUID
    starts_at: datetime
    format: str
    location_id: UUID | None
    source: str
    created_at: datetime


class DerivedSlotOut(BaseModel):
    """A computed availability slot for client display."""

    start: datetime
    end: datetime
    therapist_profile_id: UUID
    service_id: UUID
    format: str
    duration_minutes: int


# ── Slot Hold ────────────────────────────────────────────────────────────────


class SlotHoldRequest(BaseModel):
    therapist_profile_id: UUID
    service_id: UUID
    slot_start: datetime
    slot_end: datetime
    client_timezone: str = Field(min_length=1, max_length=64)
    idempotency_key: str = Field(min_length=1, max_length=128)


class SlotHoldOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    slot_start: datetime
    slot_end: datetime
    expires_at: datetime


# ── Appointment Request ──────────────────────────────────────────────────────


class AppointmentRequestIn(BaseModel):
    therapist_profile_id: UUID | None = None
    service_id: UUID
    request_type: str = Field(pattern=r"^(initial|reschedule)$")
    preferred_start: datetime | None = None
    preferred_end: datetime | None = None
    existing_appointment_id: UUID | None = None
    format: str = Field(min_length=2, max_length=32)
    location_id: UUID | None = None
    client_name: str = Field(min_length=1, max_length=200)
    client_email: str = Field(min_length=3, max_length=320)
    client_phone: str | None = Field(default=None, max_length=50)
    client_timezone: str = Field(min_length=1, max_length=64)
    client_note: str | None = Field(default=None, max_length=1000)
    idempotency_key: str = Field(min_length=1, max_length=128)
    consent_booking_rules: bool = Field(default=False)


class AppointmentRequestOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    organization_id: UUID
    therapist_profile_id: UUID | None
    service_id: UUID
    request_type: str
    status: str
    preferred_start: datetime | None
    preferred_end: datetime | None
    existing_appointment_id: UUID | None
    format: str
    location_id: UUID | None
    client_name: str
    client_email: str
    client_timezone: str
    client_note: str | None
    expires_at: datetime | None
    created_at: datetime
    updated_at: datetime


# ── Alternative Proposal ─────────────────────────────────────────────────────


class AlternativeProposalIn(BaseModel):
    proposed_start: datetime
    proposed_end: datetime
    format: str = Field(min_length=2, max_length=32)
    location_id: UUID | None = None
    therapist_note: str | None = Field(default=None, max_length=1000)
    expires_at: datetime | None = None


class AlternativeProposalOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    appointment_request_id: UUID
    proposed_start: datetime
    proposed_end: datetime
    format: str
    location_id: UUID | None
    therapist_note: str | None
    status: str
    expires_at: datetime | None
    created_at: datetime


# ── Appointment ──────────────────────────────────────────────────────────────


class AppointmentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    organization_id: UUID
    therapist_profile_id: UUID
    service_id: UUID
    appointment_request_id: UUID | None
    start_time: datetime
    end_time: datetime
    format: str
    location_id: UUID | None
    status: str
    client_name: str
    client_email: str
    client_timezone: str
    client_note: str | None
    cancelled_by: str | None
    cancellation_reason: str | None
    cancelled_at: datetime | None
    created_at: datetime
    updated_at: datetime


# ── Review Actions ───────────────────────────────────────────────────────────


class ReviewAction(BaseModel):
    """Therapist action on a pending appointment request."""

    action: str = Field(pattern=r"^(confirm|decline|propose_alternative)$")
    reason: str | None = Field(default=None, max_length=1000)
    # For propose_alternative: list of alternative slots
    alternatives: list[AlternativeProposalIn] | None = Field(default=None, max_length=5)


class AcceptAlternativeRequest(BaseModel):
    """Client accepts one of the proposed alternatives."""

    proposal_id: UUID
    idempotency_key: str = Field(min_length=1, max_length=128)


class CancelAppointmentRequest(BaseModel):
    reason: str | None = Field(default=None, max_length=1000)


# ── Query Params ─────────────────────────────────────────────────────────────


class SlotQueryParams(BaseModel):
    service_id: UUID
    therapist_profile_id: UUID
    format: str = Field(min_length=2, max_length=32)
    location_id: UUID | None = None
    date_from: date
    date_until: date
    client_timezone: str = Field(default="Europe/Belgrade", max_length=64)
