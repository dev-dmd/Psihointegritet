"""Booking Engine — domain enums and ORM models.

ADR-013: Request-First Booking Aggregates
ADR-015: Availability Service Contract
PRE-R2 Booking Engine Decision Specification v0.2
"""

from datetime import date, datetime, time
from enum import StrEnum
from uuid import UUID, uuid4

from sqlalchemy import (
    CheckConstraint,
    Date,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    Time,
    UniqueConstraint,
    Uuid,
    func,
)
from sqlalchemy import text as sa_text
from sqlalchemy.dialects.postgresql import ExcludeConstraint
from sqlalchemy.orm import Mapped, mapped_column

from psihointegritet.db.base import Base
from psihointegritet.shared.types.sa_enum import value_enum

# ── Domain enums ────────────────────────────────────────────────────────────


class BookingMode(StrEnum):
    """Effective booking mode for a concrete service+therapist+format+location."""

    SLOT_REQUEST = "slot_request"
    REQUEST = "request"
    DISABLED = "disabled"


class AppointmentRequestType(StrEnum):
    INITIAL = "initial"
    RESCHEDULE = "reschedule"


class AppointmentRequestStatus(StrEnum):
    SUBMITTED = "submitted"
    UNDER_REVIEW = "under_review"
    ALTERNATIVE_PROPOSED = "alternative_proposed"
    AWAITING_CLIENT = "awaiting_client"
    CONVERTED = "converted"
    DECLINED = "declined"
    WITHDRAWN = "withdrawn"
    EXPIRED = "expired"


class AppointmentStatus(StrEnum):
    CONFIRMED = "confirmed"
    COMPLETED = "completed"
    NO_SHOW = "no_show"
    CANCELLED = "cancelled"


class CancellationActor(StrEnum):
    CLIENT = "client"
    THERAPIST = "therapist"
    ORG_ADMIN = "org_admin"
    SYSTEM = "system"


class AvailabilityExceptionKind(StrEnum):
    UNAVAILABLE = "unavailable"
    EXTRA_AVAILABLE = "extra_available"


class AvailabilityMode(StrEnum):
    """How a therapist offers time (ADR-015 v2 §2.7.1)."""

    HOURLY_GRID = "hourly_grid"
    FLEXIBLE_GRID = "flexible_grid"
    MANUAL_SLOTS = "manual_slots"


class ManualAvailabilitySlotSource(StrEnum):
    MANUAL = "manual"
    WEEKLY_GENERATOR = "weekly_generator"
    COPIED_WEEK = "copied_week"


class AlternativeProposalStatus(StrEnum):
    PROPOSED = "proposed"
    ACCEPTED = "accepted"
    DECLINED = "declined"
    EXPIRED = "expired"
    CLOSED = "closed"


# ── ORM Models ───────────────────────────────────────────────────────────────


class ServiceBookingConfig(Base):
    """Booking mode and slot configuration for a concrete service offer.

    Effective booking mode resolves from the most restrictive rule across
    service → therapist → format → location. This table holds the per-offer
    override that can only narrow the mode inherited from the service.
    """

    __tablename__ = "service_booking_configs"
    __table_args__ = (
        UniqueConstraint(
            "organization_id",
            "service_id",
            "therapist_profile_id",
            "format",
            "location_id",
            name="uq_booking_config_offer",
            postgresql_nulls_not_distinct=True,
        ),
        Index("ix_booking_config_org_service", "organization_id", "service_id"),
    )

    id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid4)
    organization_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), index=True
    )
    service_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("content_entries.id", ondelete="CASCADE"), index=True
    )
    therapist_profile_id: Mapped[UUID | None] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("therapist_matching_profiles.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    format: Mapped[str] = mapped_column(String(32))  # online | in_person
    location_id: Mapped[UUID | None] = mapped_column(Uuid(as_uuid=True), nullable=True)
    booking_mode: Mapped[BookingMode] = mapped_column(
        value_enum(BookingMode, length=32),
        default=BookingMode.DISABLED,
        server_default=BookingMode.DISABLED.value,
    )
    duration_minutes: Mapped[int | None] = mapped_column(Integer, nullable=True)
    buffer_before_minutes: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    buffer_after_minutes: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    availability_profile_id: Mapped[UUID | None] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("availability_profiles.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    is_active: Mapped[bool] = mapped_column(default=True, server_default="true")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )


class AvailabilityRule(Base):
    """Recurring weekly availability block for a therapist (ADR-015 v2).

    One rule = one day-of-week window. Multiple rules for the same therapist
    and day that touch or overlap are merged into a single continuous window
    during slot derivation.

    Per ADR-015 v2 §2.7.2 the rule answers only *when* the therapist works:
    it carries no duration, buffer or step — those live on the owning
    ``AvailabilityProfile`` and on ``ServiceBookingConfig``.
    """

    __tablename__ = "availability_rules"
    __table_args__ = (
        Index("ix_avail_rule_org_profile", "organization_id", "availability_profile_id"),
        UniqueConstraint(
            "organization_id",
            "availability_profile_id",
            "day_of_week",
            "start_local_time",
            "end_local_time",
            "format",
            name="uq_avail_rule_window",
            postgresql_nulls_not_distinct=True,
        ),
        CheckConstraint("end_local_time > start_local_time", name="ck_avail_rule_time_range"),
    )

    id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid4)
    organization_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), index=True
    )
    availability_profile_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("availability_profiles.id", ondelete="CASCADE"),
        index=True,
    )
    day_of_week: Mapped[int] = mapped_column(Integer)  # 0=Mon..6=Sun (ISO 8601)
    start_local_time: Mapped[time] = mapped_column(Time())
    end_local_time: Mapped[time] = mapped_column(Time())
    valid_from: Mapped[date] = mapped_column(Date)
    valid_until: Mapped[date | None] = mapped_column(Date, nullable=True)
    format: Mapped[str] = mapped_column(String(32))  # online | in_person
    location_id: Mapped[UUID | None] = mapped_column(Uuid(as_uuid=True), nullable=True)
    is_active: Mapped[bool] = mapped_column(default=True, server_default="true")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )


class AvailabilityProfile(Base):
    """How a therapist offers time (ADR-015 v2 §2.7.2).

    ``mode`` + ``timezone`` + ``start_step_minutes`` (grid step; not needed for
    ``manual_slots``). Availability rules belong to a profile; the profile is
    referenced by ``ServiceBookingConfig`` (per-offer).
    """

    __tablename__ = "availability_profiles"
    __table_args__ = (
        Index("ix_avail_profile_org_therapist", "organization_id", "therapist_profile_id"),
        UniqueConstraint(
            "organization_id",
            "therapist_profile_id",
            "mode",
            name="uq_avail_profile_therapist_mode",
            postgresql_nulls_not_distinct=True,
        ),
    )

    id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid4)
    organization_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), index=True
    )
    therapist_profile_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("therapist_matching_profiles.id", ondelete="CASCADE"),
        index=True,
    )
    mode: Mapped[AvailabilityMode] = mapped_column(
        value_enum(AvailabilityMode, length=32),
        default=AvailabilityMode.HOURLY_GRID,
        server_default=AvailabilityMode.HOURLY_GRID.value,
    )
    timezone: Mapped[str] = mapped_column(
        String(64), default="Europe/Belgrade", server_default="Europe/Belgrade"
    )
    start_step_minutes: Mapped[int | None] = mapped_column(Integer, nullable=True)
    enabled: Mapped[bool] = mapped_column(default=True, server_default="true")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )


class AvailabilityException(Base):
    """One-off override of recurring availability (ADR-015 v2 §2.7.4).

    ``kind = unavailable | extra_available`` with a concrete ``starts_at`` /
    ``ends_at`` interval. ``availability_profile_id = NULL`` + ``unavailable``
    means the therapist is completely unavailable for that window (blocks every
    profile); with a profile id the exception applies only to that schedule.
    """

    __tablename__ = "availability_exceptions"
    __table_args__ = (
        Index(
            "ix_avail_exception_org_therapist",
            "organization_id",
            "therapist_profile_id",
        ),
        CheckConstraint("ends_at > starts_at", name="ck_avail_exception_time_range"),
    )

    id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid4)
    organization_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), index=True
    )
    therapist_profile_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("therapist_matching_profiles.id", ondelete="CASCADE"),
        index=True,
    )
    availability_profile_id: Mapped[UUID | None] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("availability_profiles.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )
    kind: Mapped[AvailabilityExceptionKind] = mapped_column(
        value_enum(AvailabilityExceptionKind, length=32)
    )
    starts_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    ends_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    format: Mapped[str | None] = mapped_column(String(32), nullable=True)
    location_id: Mapped[UUID | None] = mapped_column(Uuid(as_uuid=True), nullable=True)
    reason_code: Mapped[str | None] = mapped_column(String(64), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )


class ManualAvailabilitySlot(Base):
    """A concrete manual slot offered by a therapist (ADR-015 v2 §2.7.5).

    Used only by ``MANUAL_SLOTS`` mode — the therapist explicitly picks the
    start. The duration comes from ``ServiceBookingConfig.duration_minutes``
    (the per-offer KOLIKO), so this table only stores the *start*.
    ``source`` is audit/UX metadata and does not change booking semantics.
    """

    __tablename__ = "manual_availability_slots"
    __table_args__ = (
        Index(
            "ix_manual_slot_org_profile_start",
            "organization_id",
            "availability_profile_id",
            "starts_at",
        ),
    )

    id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid4)
    organization_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), index=True
    )
    availability_profile_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("availability_profiles.id", ondelete="CASCADE"),
        index=True,
    )
    starts_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    format: Mapped[str] = mapped_column(String(32))  # online | in_person
    location_id: Mapped[UUID | None] = mapped_column(Uuid(as_uuid=True), nullable=True)
    source: Mapped[ManualAvailabilitySlotSource] = mapped_column(
        value_enum(ManualAvailabilitySlotSource, length=32),
        default=ManualAvailabilitySlotSource.MANUAL,
        server_default=ManualAvailabilitySlotSource.MANUAL.value,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )


class SlotHold(Base):
    """Short technical hold during booking form submission.

    Not a reservation, not visible to the user as a confirmed term.
    Protected by PostgreSQL unique constraint + optional Redis SET NX.
    """

    __tablename__ = "slot_holds"
    __table_args__ = (
        UniqueConstraint("idempotency_key", name="uq_slot_hold_idempotency"),
        Index("ix_slot_hold_expires", "expires_at"),
    )

    id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid4)
    organization_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), index=True
    )
    therapist_profile_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("therapist_matching_profiles.id", ondelete="CASCADE"),
        index=True,
    )
    service_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("content_entries.id", ondelete="CASCADE")
    )
    slot_start: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    slot_end: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    client_timezone: Mapped[str] = mapped_column(String(64))
    idempotency_key: Mapped[str] = mapped_column(String(128))
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )


class AppointmentRequest(Base):
    """A submitted initial or reschedule request.

    Separate aggregate from Appointment. The current confirmed Appointment
    remains valid until a reschedule request is atomically converted.
    """

    __tablename__ = "appointment_requests"
    __table_args__ = (
        UniqueConstraint("idempotency_key", name="uq_appointment_request_idempotency"),
        Index("ix_appt_request_org_status", "organization_id", "status"),
        Index("ix_appt_request_therapist_status", "therapist_profile_id", "status"),
    )

    id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid4)
    organization_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), index=True
    )
    therapist_profile_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("therapist_matching_profiles.id", ondelete="CASCADE"),
        index=True,
    )
    service_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("content_entries.id", ondelete="CASCADE")
    )
    request_type: Mapped[AppointmentRequestType] = mapped_column(
        value_enum(AppointmentRequestType, length=32)
    )
    status: Mapped[AppointmentRequestStatus] = mapped_column(
        value_enum(AppointmentRequestStatus, length=32),
        default=AppointmentRequestStatus.SUBMITTED,
        server_default=AppointmentRequestStatus.SUBMITTED.value,
    )
    # For initial request: the selected slot or preferred period
    preferred_start: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    preferred_end: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    # For reschedule: the existing appointment being rescheduled
    existing_appointment_id: Mapped[UUID | None] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("appointments.id", ondelete="SET NULL"),
        nullable=True,
    )
    format: Mapped[str] = mapped_column(String(32))  # online | in_person
    location_id: Mapped[UUID | None] = mapped_column(Uuid(as_uuid=True), nullable=True)
    client_name: Mapped[str] = mapped_column(String(200))
    client_email: Mapped[str] = mapped_column(String(320))
    client_phone: Mapped[str | None] = mapped_column(String(50), nullable=True)
    client_timezone: Mapped[str] = mapped_column(String(64))
    client_note: Mapped[str | None] = mapped_column(Text, nullable=True)
    idempotency_key: Mapped[str] = mapped_column(String(128))
    consent_booking_rules: Mapped[bool] = mapped_column(default=False, server_default="false")
    reviewed_by_user_id: Mapped[UUID | None] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("internal_users.id", ondelete="SET NULL"), nullable=True
    )
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    cancellation_policy_version: Mapped[str | None] = mapped_column(String(64), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )


class AlternativeProposal(Base):
    """A therapist-proposed alternative to the original request slot."""

    __tablename__ = "alternative_proposals"

    id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid4)
    organization_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), index=True
    )
    appointment_request_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("appointment_requests.id", ondelete="CASCADE"),
        index=True,
    )
    proposed_start: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    proposed_end: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    format: Mapped[str] = mapped_column(String(32))
    location_id: Mapped[UUID | None] = mapped_column(Uuid(as_uuid=True), nullable=True)
    therapist_note: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[AlternativeProposalStatus] = mapped_column(
        value_enum(AlternativeProposalStatus, length=32),
        default=AlternativeProposalStatus.PROPOSED,
        server_default=AlternativeProposalStatus.PROPOSED.value,
    )
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )


class Appointment(Base):
    """A confirmed appointment — created only after therapist confirmation.

    The only table that represents a real, confirmed term in the calendar.
    """

    __tablename__ = "appointments"
    __table_args__ = (
        Index(
            "ix_appointment_org_therapist_start",
            "organization_id",
            "therapist_profile_id",
            "start_time",
        ),
        CheckConstraint("end_time > start_time", name="ck_appointments_valid_time_range"),
        # DB-level double-booking guard (0009 migration). PostgreSQL is the final
        # authority: only one of two racing INSERTs for an overlapping interval on
        # the same organization+therapist can commit; the loser raises 23P01,
        # which the service layer maps to BookingSlotConflictError -> HTTP 409.
        ExcludeConstraint(
            ("organization_id", "="),
            ("therapist_profile_id", "="),
            (func.tstzrange(sa_text("start_time"), sa_text("end_time"), "[)"), "&&"),
            name="appointments_no_therapist_overlap",
            where=sa_text("status IN ('confirmed', 'completed', 'no_show')"),
            deferrable=True,
            initially="IMMEDIATE",
        ),
    )

    id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid4)
    organization_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), index=True
    )
    therapist_profile_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("therapist_matching_profiles.id", ondelete="CASCADE"),
        index=True,
    )
    service_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("content_entries.id", ondelete="CASCADE")
    )
    appointment_request_id: Mapped[UUID | None] = mapped_column(Uuid(as_uuid=True), nullable=True)
    start_time: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    end_time: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    format: Mapped[str] = mapped_column(String(32))
    location_id: Mapped[UUID | None] = mapped_column(Uuid(as_uuid=True), nullable=True)
    status: Mapped[AppointmentStatus] = mapped_column(
        value_enum(AppointmentStatus, length=32),
        default=AppointmentStatus.CONFIRMED,
        server_default=AppointmentStatus.CONFIRMED.value,
    )
    client_name: Mapped[str] = mapped_column(String(200))
    client_email: Mapped[str] = mapped_column(String(320))
    client_phone: Mapped[str | None] = mapped_column(String(50), nullable=True)
    client_timezone: Mapped[str] = mapped_column(String(64))
    client_note: Mapped[str | None] = mapped_column(Text, nullable=True)
    # Audit fields
    cancelled_by: Mapped[CancellationActor | None] = mapped_column(
        value_enum(CancellationActor, length=32), nullable=True
    )
    cancellation_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    cancelled_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    cancellation_policy_version: Mapped[str | None] = mapped_column(String(64), nullable=True)
    reschedule_successor_id: Mapped[UUID | None] = mapped_column(Uuid(as_uuid=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )
