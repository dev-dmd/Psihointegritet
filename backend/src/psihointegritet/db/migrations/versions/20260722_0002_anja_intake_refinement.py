"""Refine Intake policy after Anja's clinical-operational validation.

Revision ID: 20260722_0002
Revises: 20260722_0001
Create Date: 2026-07-22
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20260722_0002"
down_revision: str | None = "20260722_0001"
branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None

acceptance_status = sa.Enum(
    "accepting", "limited", "paused", name="acceptance_status", native_enum=False, length=32
)
presence_status = sa.Enum(
    "active", "temporarily_absent", name="presence_status", native_enum=False, length=32
)
requester_role = sa.Enum(
    "self_adult",
    "guardian",
    "adolescent_16_17",
    "information_only",
    name="requester_role",
    native_enum=False,
    length=32,
)
subject_age_band = sa.Enum(
    "under_12",
    "12_15",
    "16_17",
    "adult",
    name="subject_age_band",
    native_enum=False,
    length=32,
)
guardian_consent_status = sa.Enum(
    "not_applicable",
    "confirmed",
    "needs_review",
    name="guardian_consent_status",
    native_enum=False,
    length=32,
)
submission_intent = sa.Enum(
    "direct_request",
    "team_review",
    name="submission_intent",
    native_enum=False,
    length=32,
)
review_priority = sa.Enum(
    "standard", "priority", name="review_priority", native_enum=False, length=32
)
safety_category = sa.Enum("immediate_danger", name="safety_category", native_enum=False, length=32)

def upgrade() -> None:
    op.add_column(
        "therapist_matching_profiles",
        sa.Column(
            "acceptance_status", acceptance_status, server_default="accepting", nullable=False
        ),
    )
    op.add_column(
        "therapist_matching_profiles",
        sa.Column("presence_status", presence_status, server_default="active", nullable=False),
    )
    op.add_column(
        "therapist_matching_profiles",
        sa.Column("absence_until", sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column(
        "therapist_matching_profiles",
        sa.Column("accepted_age_bands", sa.JSON(), nullable=True),
    )
    op.add_column(
        "therapist_matching_profiles",
        sa.Column("service_capabilities", sa.JSON(), nullable=True),
    )
    op.add_column(
        "therapist_matching_profiles",
        sa.Column("supported_formats", sa.JSON(), nullable=True),
    )
    op.execute(
        """
        UPDATE therapist_matching_profiles
        SET acceptance_status = CASE capacity_status
            WHEN 'limited' THEN 'limited'
            WHEN 'paused' THEN 'paused'
            ELSE 'accepting'
        END,
        supported_formats = '["online", "in_person"]'::json
        """
    )
    op.execute(
        """
        UPDATE therapist_matching_profiles
        SET accepted_age_bands = CASE slug
            WHEN 'anja-stamenkovic' THEN '["16_17", "adult"]'::json
            WHEN 'marija-stamenkovic' THEN '["under_12", "12_15", "16_17", "adult"]'::json
            WHEN 'marjan-jankovic' THEN '["16_17", "adult"]'::json
            ELSE '["adult"]'::json
        END,
        service_capabilities = CASE slug
            WHEN 'anja-stamenkovic' THEN to_json(ARRAY[
                'individual_therapy',
                'marital_counseling',
                'parenting_support',
                'adolescent_support_16_plus',
                'addiction_related_support'
            ])
            WHEN 'marija-stamenkovic' THEN to_json(ARRAY[
                'individual_therapy',
                'parenting_support',
                'children_and_adolescents_pending'
            ])
            WHEN 'marjan-jankovic' THEN to_json(ARRAY[
                'individual_therapy',
                'marital_counseling',
                'parenting_support',
                'adolescent_support_16_plus'
            ])
            ELSE '[]'::json
        END
        """
    )
    op.alter_column("therapist_matching_profiles", "accepted_age_bands", nullable=False)
    op.alter_column("therapist_matching_profiles", "service_capabilities", nullable=False)
    op.alter_column("therapist_matching_profiles", "supported_formats", nullable=False)

    op.add_column(
        "intake_cases",
        sa.Column("submission_intent", submission_intent, nullable=True),
    )
    op.add_column(
        "intake_cases",
        sa.Column(
            "requester_role",
            requester_role,
            server_default="self_adult",
            nullable=False,
        ),
    )
    op.add_column(
        "intake_cases",
        sa.Column(
            "subject_age_band",
            subject_age_band,
            server_default="adult",
            nullable=False,
        ),
    )
    op.add_column("intake_cases", sa.Column("subject_is_aware", sa.Boolean(), nullable=True))
    op.add_column(
        "intake_cases",
        sa.Column(
            "guardian_consent_status",
            guardian_consent_status,
            server_default="not_applicable",
            nullable=False,
        ),
    )
    op.alter_column("intake_cases", "requires_team_review", new_column_name="requires_human_review")
    op.add_column(
        "intake_cases",
        sa.Column(
            "review_priority",
            review_priority,
            server_default="standard",
            nullable=False,
        ),
    )
    op.add_column(
        "intake_cases", sa.Column("review_due_at", sa.DateTime(timezone=True), nullable=True)
    )
    op.add_column("intake_cases", sa.Column("safety_category", safety_category, nullable=True))
    op.add_column(
        "intake_cases",
        sa.Column("safety_notice_shown_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column(
        "intake_cases", sa.Column("safety_rule_version", sa.String(length=64), nullable=True)
    )
    op.execute(
        """
        UPDATE intake_cases
        SET submission_intent = CASE submission_kind
            WHEN 'request' THEN 'direct_request'
            ELSE 'team_review'
        END,
        requester_role = CASE
            WHEN age_group IS NULL THEN 'self_adult'
            ELSE 'guardian'
        END,
        subject_age_band = CASE age_group
            WHEN 'Do 7 godina' THEN 'under_12'
            WHEN '7\u201312 godina' THEN 'under_12'
            WHEN '13\u201315 godina' THEN '12_15'
            WHEN '16\u201317 godina' THEN '16_17'
            ELSE 'adult'
        END,
        guardian_consent_status = CASE
            WHEN age_group IS NULL THEN 'not_applicable'
            ELSE 'needs_review'
        END
        """
    )
    op.alter_column("intake_cases", "submission_intent", nullable=False)
    op.create_index("ix_intake_cases_review_priority", "intake_cases", ["review_priority"])


def downgrade() -> None:
    op.drop_index("ix_intake_cases_review_priority", table_name="intake_cases")
    op.drop_column("intake_cases", "safety_rule_version")
    op.drop_column("intake_cases", "safety_notice_shown_at")
    op.drop_column("intake_cases", "safety_category")
    op.drop_column("intake_cases", "review_due_at")
    op.drop_column("intake_cases", "review_priority")
    op.alter_column("intake_cases", "requires_human_review", new_column_name="requires_team_review")
    op.drop_column("intake_cases", "guardian_consent_status")
    op.drop_column("intake_cases", "subject_is_aware")
    op.drop_column("intake_cases", "subject_age_band")
    op.drop_column("intake_cases", "requester_role")
    op.drop_column("intake_cases", "submission_intent")

    op.drop_column("therapist_matching_profiles", "supported_formats")
    op.drop_column("therapist_matching_profiles", "service_capabilities")
    op.drop_column("therapist_matching_profiles", "accepted_age_bands")
    op.drop_column("therapist_matching_profiles", "absence_until")
    op.drop_column("therapist_matching_profiles", "presence_status")
    op.drop_column("therapist_matching_profiles", "acceptance_status")
