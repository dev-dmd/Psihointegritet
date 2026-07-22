from datetime import datetime
from enum import StrEnum
from uuid import UUID, uuid4

from sqlalchemy import (
    JSON,
    Boolean,
    DateTime,
    Enum,
    ForeignKey,
    String,
    Text,
    UniqueConstraint,
    Uuid,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column

from psihointegritet.db.base import Base


class GuidanceSessionState(StrEnum):
    STARTED = "started"
    COMPLETED = "completed"
    RECOMMENDATION_READY = "recommendation_ready"
    SUBMITTED = "submitted"
    EXPIRED = "expired"


class IntakeSubmissionKind(StrEnum):
    REQUEST = "request"
    TEAM_REVIEW = "team_review"


class IntakeCaseStatus(StrEnum):
    UNASSIGNED = "unassigned"
    CLAIMED = "claimed"
    BOOKING_STARTED = "booking_started"
    CONVERTED = "converted"
    CLOSED = "closed"
    WITHDRAWN = "withdrawn"
    EXPIRED = "expired"


class CapacityStatus(StrEnum):
    AVAILABLE = "available"
    LIMITED = "limited"
    PAUSED = "paused"


class AcceptanceStatus(StrEnum):
    ACCEPTING = "accepting"
    LIMITED = "limited"
    PAUSED = "paused"


class PresenceStatus(StrEnum):
    ACTIVE = "active"
    TEMPORARILY_ABSENT = "temporarily_absent"


class RequesterRole(StrEnum):
    SELF_ADULT = "self_adult"
    GUARDIAN = "guardian"
    ADOLESCENT_16_17 = "adolescent_16_17"
    INFORMATION_ONLY = "information_only"


class SubjectAgeBand(StrEnum):
    UNDER_12 = "under_12"
    TWELVE_TO_FIFTEEN = "12_15"
    SIXTEEN_TO_SEVENTEEN = "16_17"
    ADULT = "adult"


class GuardianConsentStatus(StrEnum):
    NOT_APPLICABLE = "not_applicable"
    CONFIRMED = "confirmed"
    NEEDS_REVIEW = "needs_review"


class SubmissionIntent(StrEnum):
    DIRECT_REQUEST = "direct_request"
    TEAM_REVIEW = "team_review"


class ReviewPriority(StrEnum):
    STANDARD = "standard"
    PRIORITY = "priority"


class SafetyCategory(StrEnum):
    IMMEDIATE_DANGER = "immediate_danger"


class ConsentKind(StrEnum):
    INTAKE_DATA_PROCESSING_NOTICE = "intake_data_processing_notice"
    INTAKE_REQUEST_ACKNOWLEDGEMENT = "intake_request_acknowledgement"
    MARKETING = "marketing"
    AI_FREE_TEXT_PROCESSING = "ai_free_text_processing"


class AssignmentEventType(StrEnum):
    CLAIMED = "claimed"
    REASSIGNED = "reassigned"
    RELEASED = "released"


class GuidanceSession(Base):
    """Optional anonymous server-side continuation record; never a client profile."""

    __tablename__ = "guidance_sessions"

    id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid4)
    organization_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), index=True
    )
    state: Mapped[GuidanceSessionState] = mapped_column(
        Enum(GuidanceSessionState, native_enum=False, length=32),
        default=GuidanceSessionState.STARTED,
        server_default=GuidanceSessionState.STARTED.value,
    )
    rule_version: Mapped[str] = mapped_column(String(64))
    answers: Mapped[dict[str, str | None] | None] = mapped_column(JSON, nullable=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )


class TherapistMatchingProfile(Base):
    """Operational matching settings, deliberately separate from public therapist copy."""

    __tablename__ = "therapist_matching_profiles"
    __table_args__ = (UniqueConstraint("organization_id", "slug", name="uq_matching_profile_slug"),)

    id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid4)
    organization_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), index=True
    )
    assigned_user_id: Mapped[UUID | None] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("internal_users.id", ondelete="SET NULL"), nullable=True
    )
    slug: Mapped[str] = mapped_column(String(120), index=True)
    display_name: Mapped[str] = mapped_column(String(160))
    accepting_new_clients: Mapped[bool] = mapped_column(
        Boolean, default=True, server_default="true"
    )
    capacity_status: Mapped[CapacityStatus] = mapped_column(
        Enum(CapacityStatus, native_enum=False, length=32),
        default=CapacityStatus.AVAILABLE,
        server_default=CapacityStatus.AVAILABLE.value,
    )
    acceptance_status: Mapped[AcceptanceStatus] = mapped_column(
        Enum(AcceptanceStatus, native_enum=False, length=32),
        default=AcceptanceStatus.ACCEPTING,
        server_default=AcceptanceStatus.ACCEPTING.value,
    )
    presence_status: Mapped[PresenceStatus] = mapped_column(
        Enum(PresenceStatus, native_enum=False, length=32),
        default=PresenceStatus.ACTIVE,
        server_default=PresenceStatus.ACTIVE.value,
    )
    absence_until: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    accepted_age_bands: Mapped[list[str]] = mapped_column(JSON, default=list)
    service_capabilities: Mapped[list[str]] = mapped_column(JSON, default=list)
    supported_formats: Mapped[list[str]] = mapped_column(JSON, default=list)
    services: Mapped[list[str]] = mapped_column(JSON)
    areas: Mapped[list[str]] = mapped_column(JSON)
    formats: Mapped[list[str]] = mapped_column(JSON)
    locations: Mapped[list[str]] = mapped_column(JSON)
    min_child_age: Mapped[int] = mapped_column()
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )


class IntakeCase(Base):
    """A submitted request for human review or a future booking request, never a client."""

    __tablename__ = "intake_cases"
    __table_args__ = (
        UniqueConstraint("organization_id", "idempotency_key", name="uq_intake_case_idempotency"),
    )

    id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid4)
    organization_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), index=True
    )
    guidance_session_id: Mapped[UUID | None] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("guidance_sessions.id", ondelete="SET NULL"), nullable=True
    )
    submission_kind: Mapped[IntakeSubmissionKind] = mapped_column(
        Enum(IntakeSubmissionKind, native_enum=False, length=32)
    )
    submission_intent: Mapped[SubmissionIntent] = mapped_column(
        Enum(SubmissionIntent, native_enum=False, length=32)
    )
    status: Mapped[IntakeCaseStatus] = mapped_column(
        Enum(IntakeCaseStatus, native_enum=False, length=32),
        default=IntakeCaseStatus.UNASSIGNED,
        server_default=IntakeCaseStatus.UNASSIGNED.value,
        index=True,
    )
    source: Mapped[str] = mapped_column(String(60))
    service_slug: Mapped[str | None] = mapped_column(String(120), nullable=True)
    format: Mapped[str | None] = mapped_column(String(32), nullable=True)
    location: Mapped[str | None] = mapped_column(String(120), nullable=True)
    requester_role: Mapped[RequesterRole] = mapped_column(
        Enum(RequesterRole, native_enum=False, length=32),
        default=RequesterRole.SELF_ADULT,
        server_default=RequesterRole.SELF_ADULT.value,
    )
    subject_age_band: Mapped[SubjectAgeBand] = mapped_column(
        Enum(SubjectAgeBand, native_enum=False, length=32),
        default=SubjectAgeBand.ADULT,
        server_default=SubjectAgeBand.ADULT.value,
    )
    subject_is_aware: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    guardian_consent_status: Mapped[GuardianConsentStatus] = mapped_column(
        Enum(GuardianConsentStatus, native_enum=False, length=32),
        default=GuardianConsentStatus.NOT_APPLICABLE,
        server_default=GuardianConsentStatus.NOT_APPLICABLE.value,
    )
    preferred_therapist_slug: Mapped[str | None] = mapped_column(String(120), nullable=True)
    recommended_therapist_slugs: Mapped[list[str]] = mapped_column(JSON)
    explanation_codes: Mapped[list[str]] = mapped_column(JSON)
    matching_rule_version: Mapped[str] = mapped_column(String(64))
    requires_human_review: Mapped[bool] = mapped_column(
        Boolean, default=False, server_default="false"
    )
    review_priority: Mapped[ReviewPriority] = mapped_column(
        Enum(ReviewPriority, native_enum=False, length=32),
        default=ReviewPriority.STANDARD,
        server_default=ReviewPriority.STANDARD.value,
        index=True,
    )
    review_due_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    safety_category: Mapped[SafetyCategory | None] = mapped_column(
        Enum(SafetyCategory, native_enum=False, length=32), nullable=True
    )
    safety_notice_shown_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    safety_rule_version: Mapped[str | None] = mapped_column(String(64), nullable=True)
    assigned_therapist_profile_id: Mapped[UUID | None] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("therapist_matching_profiles.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    idempotency_key: Mapped[str] = mapped_column(String(120))
    request_fingerprint: Mapped[str] = mapped_column(String(64))
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    closed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )


class IntakeContact(Base):
    """Contact data is stored separately from answers and matching data."""

    __tablename__ = "intake_contacts"

    id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid4)
    intake_case_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("intake_cases.id", ondelete="CASCADE"),
        unique=True,
        index=True,
    )
    full_name: Mapped[str] = mapped_column(String(160))
    email: Mapped[str] = mapped_column(String(320))
    phone: Mapped[str | None] = mapped_column(String(80), nullable=True)
    reply_preference: Mapped[str] = mapped_column(String(16))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )


class IntakeAnswer(Base):
    """Structured answers only. Free text has its own shorter-retention table."""

    __tablename__ = "intake_answers"
    __table_args__ = (UniqueConstraint("intake_case_id", "key", name="uq_intake_answer_key"),)

    id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid4)
    intake_case_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("intake_cases.id", ondelete="CASCADE"), index=True
    )
    key: Mapped[str] = mapped_column(String(80))
    value: Mapped[str] = mapped_column(String(240))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )


class IntakeFreeText(Base):
    """Optional text with a shorter retention period and a narrower access policy."""

    __tablename__ = "intake_free_texts"

    id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid4)
    intake_case_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("intake_cases.id", ondelete="CASCADE"),
        unique=True,
        index=True,
    )
    text: Mapped[str] = mapped_column(Text)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )


class ConsentRecord(Base):
    """Versioned acknowledgement/consent evidence without copying legal text."""

    __tablename__ = "consent_records"
    __table_args__ = (
        UniqueConstraint(
            "intake_case_id", "kind", "document_version", name="uq_intake_consent_version"
        ),
    )

    id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid4)
    intake_case_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("intake_cases.id", ondelete="CASCADE"), index=True
    )
    kind: Mapped[ConsentKind] = mapped_column(
        Enum(ConsentKind, native_enum=False, length=64), nullable=False
    )
    document_version: Mapped[str] = mapped_column(String(80))
    locale: Mapped[str] = mapped_column(String(16), default="sr-Latn", server_default="sr-Latn")
    source: Mapped[str] = mapped_column(
        String(48), default="public_web", server_default="public_web"
    )
    granted_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class IntakeAssignment(Base):
    """Current owner pointer for atomic queue claims."""

    __tablename__ = "intake_assignments"

    id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid4)
    intake_case_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("intake_cases.id", ondelete="CASCADE"),
        unique=True,
        index=True,
    )
    therapist_profile_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("therapist_matching_profiles.id", ondelete="RESTRICT"),
        index=True,
    )
    claimed_by_user_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("internal_users.id", ondelete="RESTRICT"), index=True
    )
    claimed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )


class IntakeAssignmentEvent(Base):
    """Immutable ownership history. Reason is a bounded code, never case text."""

    __tablename__ = "intake_assignment_events"

    id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid4)
    intake_case_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("intake_cases.id", ondelete="CASCADE"), index=True
    )
    event_type: Mapped[AssignmentEventType] = mapped_column(
        Enum(AssignmentEventType, native_enum=False, length=32)
    )
    previous_therapist_profile_id: Mapped[UUID | None] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("therapist_matching_profiles.id", ondelete="SET NULL"),
        nullable=True,
    )
    next_therapist_profile_id: Mapped[UUID | None] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("therapist_matching_profiles.id", ondelete="SET NULL"),
        nullable=True,
    )
    actor_user_id: Mapped[UUID | None] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("internal_users.id", ondelete="SET NULL"), nullable=True
    )
    reason_code: Mapped[str | None] = mapped_column(String(80), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )


class IntakeAuditEvent(Base):
    """Minimal audit evidence. Payload must never contain answers or free text."""

    __tablename__ = "intake_audit_events"

    id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid4)
    organization_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), index=True
    )
    intake_case_id: Mapped[UUID | None] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("intake_cases.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    actor_user_id: Mapped[UUID | None] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("internal_users.id", ondelete="SET NULL"), nullable=True
    )
    event_type: Mapped[str] = mapped_column(String(80))
    details: Mapped[dict[str, str | bool | int | None]] = mapped_column("metadata", JSON)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
