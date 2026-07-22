"""Create the production Intake & Matching foundation.

Revision ID: 20260722_0001
Revises:
Create Date: 2026-07-22
"""

import json
from uuid import UUID

import sqlalchemy as sa
from alembic import op

revision = "20260722_0001"
down_revision = None
branch_labels = None
depends_on = None


ORGANIZATION_ID = UUID("a6fe5a0b-f661-44f6-92f1-1a51867fa537")
ANJA_PROFILE_ID = UUID("e75861d7-d975-4413-b19d-0b50d329f49c")
MARIJA_PROFILE_ID = UUID("a43cab8f-b51b-4f22-8594-a107bfdf44c3")
MARJAN_PROFILE_ID = UUID("677a794b-c870-4a51-afd5-960e711b86b3")


def upgrade() -> None:
    membership_role = sa.Enum("org_admin", "therapist", name="membershiprole", native_enum=False)
    membership_status = sa.Enum("active", "disabled", name="membershipstatus", native_enum=False)
    guidance_session_state = sa.Enum(
        "started",
        "completed",
        "recommendation_ready",
        "submitted",
        "expired",
        name="guidancesessionstate",
        native_enum=False,
    )
    intake_submission_kind = sa.Enum(
        "request", "team_review", name="intakesubmissionkind", native_enum=False
    )
    intake_case_status = sa.Enum(
        "unassigned",
        "claimed",
        "booking_started",
        "converted",
        "closed",
        "withdrawn",
        "expired",
        name="intakecasestatus",
        native_enum=False,
    )
    capacity_status = sa.Enum(
        "available", "limited", "paused", name="capacitystatus", native_enum=False
    )
    consent_kind = sa.Enum(
        "intake_data_processing_notice",
        "intake_request_acknowledgement",
        "marketing",
        "ai_free_text_processing",
        name="consentkind",
        native_enum=False,
    )
    assignment_event_type = sa.Enum(
        "claimed", "reassigned", "released", name="assignmenteventtype", native_enum=False
    )

    op.create_table(
        "organizations",
        sa.Column("id", sa.Uuid(), primary_key=True, nullable=False),
        sa.Column("slug", sa.String(length=80), nullable=False),
        sa.Column("display_name", sa.String(length=160), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
        sa.UniqueConstraint("slug"),
    )
    op.create_index("ix_organizations_slug", "organizations", ["slug"], unique=False)

    op.create_table(
        "internal_users",
        sa.Column("id", sa.Uuid(), primary_key=True, nullable=False),
        sa.Column("external_auth_id", sa.String(length=191), nullable=False),
        sa.Column("email", sa.String(length=320), nullable=True),
        sa.Column("is_active", sa.Boolean(), server_default=sa.text("true"), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
        sa.UniqueConstraint("external_auth_id"),
    )
    op.create_index(
        "ix_internal_users_external_auth_id", "internal_users", ["external_auth_id"], unique=False
    )

    op.create_table(
        "organization_memberships",
        sa.Column("id", sa.Uuid(), primary_key=True, nullable=False),
        sa.Column("organization_id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("role", membership_role, nullable=False),
        sa.Column("status", membership_status, server_default="active", nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["internal_users.id"], ondelete="CASCADE"),
        sa.UniqueConstraint("organization_id", "user_id", "role", name="uq_membership_role"),
    )
    op.create_index(
        "ix_organization_memberships_organization_id",
        "organization_memberships",
        ["organization_id"],
        unique=False,
    )
    op.create_index(
        "ix_organization_memberships_user_id", "organization_memberships", ["user_id"], unique=False
    )

    op.create_table(
        "guidance_sessions",
        sa.Column("id", sa.Uuid(), primary_key=True, nullable=False),
        sa.Column("organization_id", sa.Uuid(), nullable=False),
        sa.Column("state", guidance_session_state, server_default="started", nullable=False),
        sa.Column("rule_version", sa.String(length=64), nullable=False),
        sa.Column("answers", sa.JSON(), nullable=True),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"], ondelete="CASCADE"),
    )
    op.create_index(
        "ix_guidance_sessions_organization_id",
        "guidance_sessions",
        ["organization_id"],
        unique=False,
    )
    op.create_index(
        "ix_guidance_sessions_expires_at", "guidance_sessions", ["expires_at"], unique=False
    )

    op.create_table(
        "therapist_matching_profiles",
        sa.Column("id", sa.Uuid(), primary_key=True, nullable=False),
        sa.Column("organization_id", sa.Uuid(), nullable=False),
        sa.Column("assigned_user_id", sa.Uuid(), nullable=True),
        sa.Column("slug", sa.String(length=120), nullable=False),
        sa.Column("display_name", sa.String(length=160), nullable=False),
        sa.Column(
            "accepting_new_clients", sa.Boolean(), server_default=sa.text("true"), nullable=False
        ),
        sa.Column("capacity_status", capacity_status, server_default="available", nullable=False),
        sa.Column("services", sa.JSON(), nullable=False),
        sa.Column("areas", sa.JSON(), nullable=False),
        sa.Column("formats", sa.JSON(), nullable=False),
        sa.Column("locations", sa.JSON(), nullable=False),
        sa.Column("min_child_age", sa.Integer(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["assigned_user_id"], ["internal_users.id"], ondelete="SET NULL"),
        sa.UniqueConstraint("organization_id", "slug", name="uq_matching_profile_slug"),
    )
    op.create_index(
        "ix_therapist_matching_profiles_organization_id",
        "therapist_matching_profiles",
        ["organization_id"],
        unique=False,
    )
    op.create_index(
        "ix_therapist_matching_profiles_slug", "therapist_matching_profiles", ["slug"], unique=False
    )

    op.create_table(
        "intake_cases",
        sa.Column("id", sa.Uuid(), primary_key=True, nullable=False),
        sa.Column("organization_id", sa.Uuid(), nullable=False),
        sa.Column("guidance_session_id", sa.Uuid(), nullable=True),
        sa.Column("submission_kind", intake_submission_kind, nullable=False),
        sa.Column("status", intake_case_status, server_default="unassigned", nullable=False),
        sa.Column("source", sa.String(length=60), nullable=False),
        sa.Column("service_slug", sa.String(length=120), nullable=True),
        sa.Column("format", sa.String(length=32), nullable=True),
        sa.Column("location", sa.String(length=120), nullable=True),
        sa.Column("age_group", sa.String(length=80), nullable=True),
        sa.Column("preferred_therapist_slug", sa.String(length=120), nullable=True),
        sa.Column("recommended_therapist_slugs", sa.JSON(), nullable=False),
        sa.Column("explanation_codes", sa.JSON(), nullable=False),
        sa.Column("matching_rule_version", sa.String(length=64), nullable=False),
        sa.Column(
            "requires_team_review", sa.Boolean(), server_default=sa.text("false"), nullable=False
        ),
        sa.Column("assigned_therapist_profile_id", sa.Uuid(), nullable=True),
        sa.Column("idempotency_key", sa.String(length=120), nullable=False),
        sa.Column("request_fingerprint", sa.String(length=64), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("closed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(
            ["guidance_session_id"], ["guidance_sessions.id"], ondelete="SET NULL"
        ),
        sa.ForeignKeyConstraint(
            ["assigned_therapist_profile_id"],
            ["therapist_matching_profiles.id"],
            ondelete="SET NULL",
        ),
        sa.UniqueConstraint(
            "organization_id", "idempotency_key", name="uq_intake_case_idempotency"
        ),
    )
    op.create_index(
        "ix_intake_cases_organization_id", "intake_cases", ["organization_id"], unique=False
    )
    op.create_index("ix_intake_cases_status", "intake_cases", ["status"], unique=False)
    op.create_index(
        "ix_intake_cases_assigned_therapist_profile_id",
        "intake_cases",
        ["assigned_therapist_profile_id"],
        unique=False,
    )
    op.create_index("ix_intake_cases_expires_at", "intake_cases", ["expires_at"], unique=False)

    op.create_table(
        "intake_contacts",
        sa.Column("id", sa.Uuid(), primary_key=True, nullable=False),
        sa.Column("intake_case_id", sa.Uuid(), nullable=False),
        sa.Column("full_name", sa.String(length=160), nullable=False),
        sa.Column("email", sa.String(length=320), nullable=False),
        sa.Column("phone", sa.String(length=80), nullable=True),
        sa.Column("reply_preference", sa.String(length=16), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["intake_case_id"], ["intake_cases.id"], ondelete="CASCADE"),
        sa.UniqueConstraint("intake_case_id"),
    )
    op.create_index(
        "ix_intake_contacts_intake_case_id", "intake_contacts", ["intake_case_id"], unique=False
    )

    op.create_table(
        "intake_answers",
        sa.Column("id", sa.Uuid(), primary_key=True, nullable=False),
        sa.Column("intake_case_id", sa.Uuid(), nullable=False),
        sa.Column("key", sa.String(length=80), nullable=False),
        sa.Column("value", sa.String(length=240), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["intake_case_id"], ["intake_cases.id"], ondelete="CASCADE"),
        sa.UniqueConstraint("intake_case_id", "key", name="uq_intake_answer_key"),
    )
    op.create_index(
        "ix_intake_answers_intake_case_id", "intake_answers", ["intake_case_id"], unique=False
    )

    op.create_table(
        "intake_free_texts",
        sa.Column("id", sa.Uuid(), primary_key=True, nullable=False),
        sa.Column("intake_case_id", sa.Uuid(), nullable=False),
        sa.Column("text", sa.Text(), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["intake_case_id"], ["intake_cases.id"], ondelete="CASCADE"),
        sa.UniqueConstraint("intake_case_id"),
    )
    op.create_index(
        "ix_intake_free_texts_intake_case_id", "intake_free_texts", ["intake_case_id"], unique=False
    )
    op.create_index(
        "ix_intake_free_texts_expires_at", "intake_free_texts", ["expires_at"], unique=False
    )

    op.create_table(
        "consent_records",
        sa.Column("id", sa.Uuid(), primary_key=True, nullable=False),
        sa.Column("intake_case_id", sa.Uuid(), nullable=False),
        sa.Column("kind", consent_kind, nullable=False),
        sa.Column("document_version", sa.String(length=80), nullable=False),
        sa.Column("locale", sa.String(length=16), server_default="sr-Latn", nullable=False),
        sa.Column("source", sa.String(length=48), server_default="public_web", nullable=False),
        sa.Column("granted_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["intake_case_id"], ["intake_cases.id"], ondelete="CASCADE"),
        sa.UniqueConstraint(
            "intake_case_id", "kind", "document_version", name="uq_intake_consent_version"
        ),
    )
    op.create_index(
        "ix_consent_records_intake_case_id", "consent_records", ["intake_case_id"], unique=False
    )

    op.create_table(
        "intake_assignments",
        sa.Column("id", sa.Uuid(), primary_key=True, nullable=False),
        sa.Column("intake_case_id", sa.Uuid(), nullable=False),
        sa.Column("therapist_profile_id", sa.Uuid(), nullable=False),
        sa.Column("claimed_by_user_id", sa.Uuid(), nullable=False),
        sa.Column("claimed_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["intake_case_id"], ["intake_cases.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(
            ["therapist_profile_id"], ["therapist_matching_profiles.id"], ondelete="RESTRICT"
        ),
        sa.ForeignKeyConstraint(["claimed_by_user_id"], ["internal_users.id"], ondelete="RESTRICT"),
        sa.UniqueConstraint("intake_case_id"),
    )
    op.create_index(
        "ix_intake_assignments_intake_case_id",
        "intake_assignments",
        ["intake_case_id"],
        unique=False,
    )
    op.create_index(
        "ix_intake_assignments_therapist_profile_id",
        "intake_assignments",
        ["therapist_profile_id"],
        unique=False,
    )
    op.create_index(
        "ix_intake_assignments_claimed_by_user_id",
        "intake_assignments",
        ["claimed_by_user_id"],
        unique=False,
    )

    op.create_table(
        "intake_assignment_events",
        sa.Column("id", sa.Uuid(), primary_key=True, nullable=False),
        sa.Column("intake_case_id", sa.Uuid(), nullable=False),
        sa.Column("event_type", assignment_event_type, nullable=False),
        sa.Column("previous_therapist_profile_id", sa.Uuid(), nullable=True),
        sa.Column("next_therapist_profile_id", sa.Uuid(), nullable=True),
        sa.Column("actor_user_id", sa.Uuid(), nullable=True),
        sa.Column("reason_code", sa.String(length=80), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["intake_case_id"], ["intake_cases.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(
            ["previous_therapist_profile_id"],
            ["therapist_matching_profiles.id"],
            ondelete="SET NULL",
        ),
        sa.ForeignKeyConstraint(
            ["next_therapist_profile_id"], ["therapist_matching_profiles.id"], ondelete="SET NULL"
        ),
        sa.ForeignKeyConstraint(["actor_user_id"], ["internal_users.id"], ondelete="SET NULL"),
    )
    op.create_index(
        "ix_intake_assignment_events_intake_case_id",
        "intake_assignment_events",
        ["intake_case_id"],
        unique=False,
    )

    op.create_table(
        "intake_audit_events",
        sa.Column("id", sa.Uuid(), primary_key=True, nullable=False),
        sa.Column("organization_id", sa.Uuid(), nullable=False),
        sa.Column("intake_case_id", sa.Uuid(), nullable=True),
        sa.Column("actor_user_id", sa.Uuid(), nullable=True),
        sa.Column("event_type", sa.String(length=80), nullable=False),
        sa.Column("metadata", sa.JSON(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["intake_case_id"], ["intake_cases.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["actor_user_id"], ["internal_users.id"], ondelete="SET NULL"),
    )
    op.create_index(
        "ix_intake_audit_events_organization_id",
        "intake_audit_events",
        ["organization_id"],
        unique=False,
    )
    op.create_index(
        "ix_intake_audit_events_intake_case_id",
        "intake_audit_events",
        ["intake_case_id"],
        unique=False,
    )

    profile_table = sa.table(
        "therapist_matching_profiles",
        sa.column("id", sa.Uuid()),
        sa.column("organization_id", sa.Uuid()),
        sa.column("slug", sa.String()),
        sa.column("display_name", sa.String()),
        sa.column("services", sa.JSON()),
        sa.column("areas", sa.JSON()),
        sa.column("formats", sa.JSON()),
        sa.column("locations", sa.JSON()),
        sa.column("min_child_age", sa.Integer()),
    )
    op.bulk_insert(
        sa.table(
            "organizations",
            sa.column("id", sa.Uuid()),
            sa.column("slug", sa.String()),
            sa.column("display_name", sa.String()),
        ),
        [{"id": ORGANIZATION_ID, "slug": "psihointegritet", "display_name": "Psihointegritet"}],
    )
    profile_rows: list[dict[str, object]] = [
        {
            "id": ANJA_PROFILE_ID,
            "organization_id": ORGANIZATION_ID,
            "slug": "anja-stamenkovic",
            "display_name": "Anja Stamenković",
            "services": [
                "individualna-psihoterapija",
                "bracno-savetovanje",
                "roditeljsko-savetovanje",
            ],
            "areas": [
                "individualna psihoterapija",
                "bračno savetovanje",
                "burnout",
                "emocionalni razvoj",
                "lični razvoj",
                "zavisnost",
                "trauma",
                "gubitak i žalovanje",
                "anksioznost",
                "roditeljsko savetovanje",
                "samopouzdanje",
            ],
            "formats": ["online", "in_person"],
            "locations": ["Niš"],
            "min_child_age": 16,
        },
        {
            "id": MARIJA_PROFILE_ID,
            "organization_id": ORGANIZATION_ID,
            "slug": "marija-stamenkovic",
            "display_name": "Marija Stamenković",
            "services": ["individualna-psihoterapija", "roditeljsko-savetovanje"],
            "areas": [
                "individualna psihoterapija",
                "razvoj dece",
                "vaspitni izazovi",
                "adolescenti",
                "porodični odnosi",
                "lični razvoj",
                "emocionalni razvoj",
                "anksioznost",
                "depresivno raspoloženje",
                "roditeljstvo",
            ],
            "formats": ["online", "in_person"],
            "locations": ["Leskovac"],
            "min_child_age": 0,
        },
        {
            "id": MARJAN_PROFILE_ID,
            "organization_id": ORGANIZATION_ID,
            "slug": "marjan-jankovic",
            "display_name": "Marjan Janković",
            "services": ["individualna-psihoterapija", "bracno-savetovanje"],
            "areas": [
                "individualna psihoterapija",
                "bračno savetovanje",
                "podrška zaposlenima",
                "trauma",
                "anksioznost",
                "depresivno raspoloženje",
                "lični razvoj",
                "gubitak i žalovanje",
                "konkretne životne situacije",
            ],
            "formats": ["online", "in_person"],
            "locations": ["Leskovac"],
            "min_child_age": 16,
        },
    ]
    for profile in profile_rows:
        for field in ("services", "areas", "formats", "locations"):
            profile[field] = op.inline_literal(json.dumps(profile[field], ensure_ascii=False))
    op.bulk_insert(profile_table, profile_rows, multiinsert=False)


def downgrade() -> None:
    op.drop_table("intake_audit_events")
    op.drop_table("intake_assignment_events")
    op.drop_table("intake_assignments")
    op.drop_table("consent_records")
    op.drop_table("intake_free_texts")
    op.drop_table("intake_answers")
    op.drop_table("intake_contacts")
    op.drop_table("intake_cases")
    op.drop_table("therapist_matching_profiles")
    op.drop_table("guidance_sessions")
    op.drop_table("organization_memberships")
    op.drop_table("internal_users")
    op.drop_table("organizations")
