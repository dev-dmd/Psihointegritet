"""Booking R2 Foundation — initial schema.

ADR-013: Request-First Booking Aggregates
ADR-015: Availability Service Contract
PRE-R2 Booking Engine Decision Specification v0.2

Creates seven tables:
  - service_booking_configs
  - availability_rules
  - availability_exceptions
  - slot_holds
  - appointment_requests
  - alternative_proposals
  - appointments

All tables are tenant-scoped (organization_id) and RLS-ready.
No payment-related columns (R5).
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "0007"
down_revision: str | None = "3bb47763bb91"  # 20260806_0021 notification outbox
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # ── availability_profiles (ADR-015 v2 §2.7.2) — created BEFORE
    # service_booking_configs because that table has an FK to it. ─────────
    op.create_table(
        "availability_profiles",
        sa.Column("id", sa.Uuid(as_uuid=True), primary_key=True),
        sa.Column(
            "organization_id",
            sa.Uuid(as_uuid=True),
            sa.ForeignKey("organizations.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column(
            "therapist_profile_id",
            sa.Uuid(as_uuid=True),
            sa.ForeignKey("therapist_matching_profiles.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column("mode", sa.String(32), nullable=False, server_default="hourly_grid"),
        sa.Column(
            "timezone",
            sa.String(64),
            nullable=False,
            server_default="Europe/Belgrade",
        ),
        sa.Column("start_step_minutes", sa.Integer, nullable=True),
        sa.Column("enabled", sa.Boolean, nullable=False, server_default="true"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.UniqueConstraint(
            "organization_id",
            "therapist_profile_id",
            "mode",
            name="uq_avail_profile_therapist_mode",
            postgresql_nulls_not_distinct=True,
        ),
    )
    op.create_index(
        "ix_avail_profile_org_therapist",
        "availability_profiles",
        ["organization_id", "therapist_profile_id"],
    )

    # ── service_booking_configs ──────────────────────────────────────────

    # ── service_booking_configs ──────────────────────────────────────────
    op.create_table(
        "service_booking_configs",
        sa.Column("id", sa.Uuid(as_uuid=True), primary_key=True),
        sa.Column(
            "organization_id",
            sa.Uuid(as_uuid=True),
            sa.ForeignKey("organizations.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column(
            "service_id",
            sa.Uuid(as_uuid=True),
            sa.ForeignKey("content_entries.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column(
            "therapist_profile_id",
            sa.Uuid(as_uuid=True),
            sa.ForeignKey("therapist_matching_profiles.id", ondelete="SET NULL"),
            nullable=True,
            index=True,
        ),
        sa.Column("format", sa.String(32), nullable=False),
        sa.Column("location_id", sa.Uuid(as_uuid=True), nullable=True),
        sa.Column(
            "booking_mode",
            sa.String(32),
            nullable=False,
            server_default="disabled",
        ),
        sa.Column("duration_minutes", sa.Integer, nullable=True),
        sa.Column(
            "buffer_before_minutes",
            sa.Integer,
            nullable=False,
            server_default="0",
        ),
        sa.Column(
            "buffer_after_minutes",
            sa.Integer,
            nullable=False,
            server_default="0",
        ),
        sa.Column(
            "availability_profile_id",
            sa.Uuid(as_uuid=True),
            sa.ForeignKey("availability_profiles.id", ondelete="SET NULL"),
            nullable=True,
            index=True,
        ),
        sa.Column("is_active", sa.Boolean, nullable=False, server_default="true"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.UniqueConstraint(
            "organization_id",
            "service_id",
            "therapist_profile_id",
            "format",
            "location_id",
            name="uq_booking_config_offer",
        ),
    )
    op.create_index(
        "ix_booking_config_org_service",
        "service_booking_configs",
        ["organization_id", "service_id"],
    )

    # ── availability_rules (v2: only "when", no duration/buffer/step) ─────
    op.create_table(
        "availability_rules",
        sa.Column("id", sa.Uuid(as_uuid=True), primary_key=True),
        sa.Column(
            "organization_id",
            sa.Uuid(as_uuid=True),
            sa.ForeignKey("organizations.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column(
            "availability_profile_id",
            sa.Uuid(as_uuid=True),
            sa.ForeignKey("availability_profiles.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column("day_of_week", sa.Integer, nullable=False),
        sa.Column("start_local_time", sa.Time(), nullable=False),
        sa.Column("end_local_time", sa.Time(), nullable=False),
        sa.Column("valid_from", sa.Date, nullable=False),
        sa.Column("valid_until", sa.Date, nullable=True),
        sa.Column("format", sa.String(32), nullable=False),
        sa.Column("location_id", sa.Uuid(as_uuid=True), nullable=True),
        sa.Column("is_active", sa.Boolean, nullable=False, server_default="true"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.UniqueConstraint(
            "organization_id",
            "availability_profile_id",
            "day_of_week",
            "start_local_time",
            "end_local_time",
            "format",
            name="uq_avail_rule_window",
            postgresql_nulls_not_distinct=True,
        ),
        sa.CheckConstraint(
            "end_local_time > start_local_time",
            name="ck_avail_rule_time_range",
        ),
    )
    op.create_index(
        "ix_avail_rule_org_profile",
        "availability_rules",
        ["organization_id", "availability_profile_id"],
    )

    # ── availability_exceptions (v2: unavailable | extra_available) ───────
    op.create_table(
        "availability_exceptions",
        sa.Column("id", sa.Uuid(as_uuid=True), primary_key=True),
        sa.Column(
            "organization_id",
            sa.Uuid(as_uuid=True),
            sa.ForeignKey("organizations.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column(
            "therapist_profile_id",
            sa.Uuid(as_uuid=True),
            sa.ForeignKey("therapist_matching_profiles.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column(
            "availability_profile_id",
            sa.Uuid(as_uuid=True),
            sa.ForeignKey("availability_profiles.id", ondelete="CASCADE"),
            nullable=True,
            index=True,
        ),
        sa.Column("kind", sa.String(32), nullable=False),
        sa.Column("starts_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("ends_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("format", sa.String(32), nullable=True),
        sa.Column("location_id", sa.Uuid(as_uuid=True), nullable=True),
        sa.Column("reason_code", sa.String(64), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.CheckConstraint(
            "ends_at > starts_at",
            name="ck_avail_exception_time_range",
        ),
    )
    op.create_index(
        "ix_avail_exception_org_therapist",
        "availability_exceptions",
        ["organization_id", "therapist_profile_id"],
    )

    # ── manual_availability_slots (v2 §2.7.5) ─────────────────────────────
    op.create_table(
        "manual_availability_slots",
        sa.Column("id", sa.Uuid(as_uuid=True), primary_key=True),
        sa.Column(
            "organization_id",
            sa.Uuid(as_uuid=True),
            sa.ForeignKey("organizations.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column(
            "availability_profile_id",
            sa.Uuid(as_uuid=True),
            sa.ForeignKey("availability_profiles.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column("starts_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("format", sa.String(32), nullable=False),
        sa.Column("location_id", sa.Uuid(as_uuid=True), nullable=True),
        sa.Column(
            "source",
            sa.String(32),
            nullable=False,
            server_default="manual",
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )
    op.create_index(
        "ix_manual_slot_org_profile_start",
        "manual_availability_slots",
        ["organization_id", "availability_profile_id", "starts_at"],
    )

    # ── slot_holds ───────────────────────────────────────────────────────
    op.create_table(
        "slot_holds",
        sa.Column("id", sa.Uuid(as_uuid=True), primary_key=True),
        sa.Column(
            "organization_id",
            sa.Uuid(as_uuid=True),
            sa.ForeignKey("organizations.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column(
            "therapist_profile_id",
            sa.Uuid(as_uuid=True),
            sa.ForeignKey("therapist_matching_profiles.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column(
            "service_id",
            sa.Uuid(as_uuid=True),
            sa.ForeignKey("content_entries.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("slot_start", sa.DateTime(timezone=True), nullable=False),
        sa.Column("slot_end", sa.DateTime(timezone=True), nullable=False),
        sa.Column("client_timezone", sa.String(64), nullable=False),
        sa.Column("idempotency_key", sa.String(128), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False, index=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.UniqueConstraint("idempotency_key", name="uq_slot_hold_idempotency"),
    )
    op.create_index("ix_slot_hold_expires", "slot_holds", ["expires_at"])

    # ── appointments ─────────────────────────────────────────────────────
    op.create_table(
        "appointments",
        sa.Column("id", sa.Uuid(as_uuid=True), primary_key=True),
        sa.Column(
            "organization_id",
            sa.Uuid(as_uuid=True),
            sa.ForeignKey("organizations.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column(
            "therapist_profile_id",
            sa.Uuid(as_uuid=True),
            sa.ForeignKey("therapist_matching_profiles.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column(
            "service_id",
            sa.Uuid(as_uuid=True),
            sa.ForeignKey("content_entries.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "appointment_request_id",
            sa.Uuid(as_uuid=True),
            nullable=True,
        ),
        sa.Column("start_time", sa.DateTime(timezone=True), nullable=False),
        sa.Column("end_time", sa.DateTime(timezone=True), nullable=False),
        sa.Column("format", sa.String(32), nullable=False),
        sa.Column("location_id", sa.Uuid(as_uuid=True), nullable=True),
        sa.Column(
            "status",
            sa.String(32),
            nullable=False,
            server_default="confirmed",
        ),
        sa.Column("client_name", sa.String(200), nullable=False),
        sa.Column("client_email", sa.String(320), nullable=False),
        sa.Column("client_phone", sa.String(50), nullable=True),
        sa.Column("client_timezone", sa.String(64), nullable=False),
        sa.Column("client_note", sa.Text, nullable=True),
        sa.Column("cancelled_by", sa.String(32), nullable=True),
        sa.Column("cancellation_reason", sa.Text, nullable=True),
        sa.Column("cancelled_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("cancellation_policy_version", sa.String(64), nullable=True),
        sa.Column("reschedule_successor_id", sa.Uuid(as_uuid=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )
    op.create_index(
        "ix_appointment_org_therapist_start",
        "appointments",
        ["organization_id", "therapist_profile_id", "start_time"],
    )

    # ── appointment_requests ─────────────────────────────────────────────
    op.create_table(
        "appointment_requests",
        sa.Column("id", sa.Uuid(as_uuid=True), primary_key=True),
        sa.Column(
            "organization_id",
            sa.Uuid(as_uuid=True),
            sa.ForeignKey("organizations.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column(
            "therapist_profile_id",
            sa.Uuid(as_uuid=True),
            sa.ForeignKey("therapist_matching_profiles.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column(
            "service_id",
            sa.Uuid(as_uuid=True),
            sa.ForeignKey("content_entries.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("request_type", sa.String(32), nullable=False),
        sa.Column(
            "status",
            sa.String(32),
            nullable=False,
            server_default="submitted",
        ),
        sa.Column("preferred_start", sa.DateTime(timezone=True), nullable=True),
        sa.Column("preferred_end", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "existing_appointment_id",
            sa.Uuid(as_uuid=True),
            sa.ForeignKey("appointments.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("format", sa.String(32), nullable=False),
        sa.Column("location_id", sa.Uuid(as_uuid=True), nullable=True),
        sa.Column("client_name", sa.String(200), nullable=False),
        sa.Column("client_email", sa.String(320), nullable=False),
        sa.Column("client_phone", sa.String(50), nullable=True),
        sa.Column("client_timezone", sa.String(64), nullable=False),
        sa.Column("client_note", sa.Text, nullable=True),
        sa.Column("idempotency_key", sa.String(128), nullable=False),
        sa.Column(
            "consent_booking_rules",
            sa.Boolean,
            nullable=False,
            server_default="false",
        ),
        sa.Column(
            "reviewed_by_user_id",
            sa.Uuid(as_uuid=True),
            sa.ForeignKey("internal_users.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("reviewed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("cancellation_policy_version", sa.String(64), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.UniqueConstraint("idempotency_key", name="uq_appointment_request_idempotency"),
    )
    op.create_index(
        "ix_appt_request_org_status",
        "appointment_requests",
        ["organization_id", "status"],
    )
    op.create_index(
        "ix_appt_request_therapist_status",
        "appointment_requests",
        ["therapist_profile_id", "status"],
    )

    # ── alternative_proposals ────────────────────────────────────────────
    op.create_table(
        "alternative_proposals",
        sa.Column("id", sa.Uuid(as_uuid=True), primary_key=True),
        sa.Column(
            "organization_id",
            sa.Uuid(as_uuid=True),
            sa.ForeignKey("organizations.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column(
            "appointment_request_id",
            sa.Uuid(as_uuid=True),
            sa.ForeignKey("appointment_requests.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column("proposed_start", sa.DateTime(timezone=True), nullable=False),
        sa.Column("proposed_end", sa.DateTime(timezone=True), nullable=False),
        sa.Column("format", sa.String(32), nullable=False),
        sa.Column("location_id", sa.Uuid(as_uuid=True), nullable=True),
        sa.Column("therapist_note", sa.Text, nullable=True),
        sa.Column(
            "status",
            sa.String(32),
            nullable=False,
            server_default="proposed",
        ),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )


def downgrade() -> None:
    # Reverse of creation order: appointment_requests.existing_appointment_id
    # FKs to appointments, and alternative_proposals FKs to
    # appointment_requests, so both must go before appointments itself.
    # service_booking_configs.availability_profile_id FKs to
    # availability_profiles, so it must go before availability_profiles too —
    # availability_profiles is created first in upgrade(), so it is dropped last.
    op.drop_table("alternative_proposals")
    op.drop_table("appointment_requests")
    op.drop_table("appointments")
    op.drop_table("slot_holds")
    op.drop_table("manual_availability_slots")
    op.drop_table("availability_exceptions")
    op.drop_table("availability_rules")
    op.drop_table("service_booking_configs")
    op.drop_table("availability_profiles")
