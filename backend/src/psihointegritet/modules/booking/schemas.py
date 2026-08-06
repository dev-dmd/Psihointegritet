"""Booking Engine — Pydantic schemas.

Public DTOs for the booking API. Never return ORM objects directly.
"""

from datetime import date, datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

# ── Booking Config ───────────────────────────────────────────────────────────


class ServiceBookingConfigIn(BaseModel):
    """Create or update a booking config for a concrete offer."""

    service_id: UUID
    therapist_profile_id: UUID | None = None
    format: str = Field(min_length=2, max_length=32)
    location_id: UUID | None = None
    booking_mode: str = Field(pattern=r"^(slot_request|request|disabled)$")
    slot_duration_minutes: int | None = Field(default=None, ge=15, le=480)
    buffer_before_minutes: int = Field(default=0, ge=0, le=120)
    buffer_after_minutes: int = Field(default=0, ge=0, le=120)
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
    slot_duration_minutes: int | None
    buffer_before_minutes: int
    buffer_after_minutes: int
    is_active: bool
    created_at: datetime
    updated_at: datetime


# ── Availability ─────────────────────────────────────────────────────────────


class AvailabilityRuleIn(BaseModel):
    therapist_profile_id: UUID
    day_of_week: int = Field(ge=0, le=6)
    start_time: str = Field(pattern=r"^\d{2}:\d{2}(:\d{2})?$")
    end_time: str = Field(pattern=r"^\d{2}:\d{2}(:\d{2})?$")
    valid_from: date
    valid_until: date | None = None
    format: str = Field(min_length=2, max_length=32)
    location_id: UUID | None = None
    service_ids: list[UUID] | None = None
    slot_duration_minutes: int = Field(ge=15, le=480)
    buffer_before_minutes: int = Field(default=0, ge=0, le=120)
    buffer_after_minutes: int = Field(default=0, ge=0, le=120)


class AvailabilityRuleOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    organization_id: UUID
    therapist_profile_id: UUID
    day_of_week: int
    start_time: str
    end_time: str
    valid_from: date
    valid_until: date | None
    format: str
    location_id: UUID | None
    service_ids: list[UUID] | None
    slot_duration_minutes: int
    buffer_before_minutes: int
    buffer_after_minutes: int
    is_active: bool
    created_at: datetime
    updated_at: datetime


class AvailabilityExceptionIn(BaseModel):
    therapist_profile_id: UUID
    exception_date: date
    kind: str = Field(pattern=r"^(block|extra_slot|modified_hours)$")
    start_time: str | None = Field(default=None, pattern=r"^\d{2}:\d{2}(:\d{2})?$")
    end_time: str | None = Field(default=None, pattern=r"^\d{2}:\d{2}(:\d{2})?$")
    reason: str | None = Field(default=None, max_length=1000)


class AvailabilityExceptionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    organization_id: UUID
    therapist_profile_id: UUID
    exception_date: date
    kind: str
    start_time: str | None
    end_time: str | None
    reason: str | None
    created_at: datetime


class DerivedSlotOut(BaseModel):
    """A computed availability slot for client display."""

    start: datetime
    end: datetime
    therapist_profile_id: UUID
    service_id: UUID
    format: str
    slot_duration_minutes: int


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
    therapist_profile_id: UUID
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
    therapist_profile_id: UUID
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
