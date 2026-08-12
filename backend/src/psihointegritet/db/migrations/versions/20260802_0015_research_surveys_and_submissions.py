"""Research surveys and submissions.

Two generic tables serve every survey; adding one is a data operation.

⚠️ **Written by hand, deliberately.** `alembic revision --autogenerate` also
emitted the pre-existing **D19** drift — VARCHAR↔Enum type changes on
`consent_records`, `guidance_sessions`, `intake_cases`,
`organization_memberships` and `therapist_matching_profiles`, unique
constraint↔index churn, and `op.drop_column('intake_cases', 'age_group')`.
That last one would destroy Intake data on staging. D19 needs its own reviewed
migration with an explicit decision about `age_group`; it must not ride along
with an unrelated feature.

Revision ID: 20260802_0015
Revises: 20260801_0014
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20260802_0015"
down_revision: str | Sequence[str] | None = "20260801_0014"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "research_surveys",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("organization_id", sa.Uuid(), nullable=False),
        sa.Column("stable_id", sa.String(length=80), nullable=False),
        sa.Column("version", sa.Integer(), nullable=False),
        sa.Column("title", sa.String(length=200), nullable=False),
        sa.Column("question_schema", sa.JSON(), nullable=False),
        sa.Column(
            "status",
            sa.Enum(
                "draft",
                "published",
                "archived",
                name="researchsurveystatus",
                native_enum=False,
                length=20,
            ),
            nullable=False,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("published_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(
            ["organization_id"],
            ["organizations.id"],
            name=op.f("fk_research_surveys_organization_id_organizations"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_research_surveys")),
        sa.UniqueConstraint(
            "organization_id",
            "stable_id",
            "version",
            name="uq_research_surveys_identity",
        ),
    )
    op.create_index(
        "ix_research_surveys_lookup",
        "research_surveys",
        ["organization_id", "stable_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_research_surveys_organization_id"),
        "research_surveys",
        ["organization_id"],
        unique=False,
    )

    op.create_table(
        "research_submissions",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("organization_id", sa.Uuid(), nullable=False),
        sa.Column("survey_id", sa.Uuid(), nullable=False),
        sa.Column("answers", sa.JSON(), nullable=False),
        sa.Column(
            "surface",
            sa.Enum(
                "research-drawer",
                "compass-feedback",
                name="researchsubmissionsurface",
                native_enum=False,
                length=32,
            ),
            nullable=False,
        ),
        sa.Column(
            "trigger",
            sa.Enum(
                "manual",
                "after-results",
                "finish",
                name="researchsubmissiontrigger",
                native_enum=False,
                length=20,
            ),
            nullable=False,
        ),
        sa.Column("locale", sa.String(length=16), nullable=False),
        sa.Column(
            "submitted_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["organization_id"],
            ["organizations.id"],
            name=op.f("fk_research_submissions_organization_id_organizations"),
            ondelete="CASCADE",
        ),
        # RESTRICT, not CASCADE: deleting a survey version must not silently
        # erase the answers collected against it.
        sa.ForeignKeyConstraint(
            ["survey_id"],
            ["research_surveys.id"],
            name=op.f("fk_research_submissions_survey_id_research_surveys"),
            ondelete="RESTRICT",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_research_submissions")),
    )
    op.create_index(
        op.f("ix_research_submissions_organization_id"),
        "research_submissions",
        ["organization_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_research_submissions_survey_id"),
        "research_submissions",
        ["survey_id"],
        unique=False,
    )
    op.create_index(
        "ix_research_submissions_survey_time",
        "research_submissions",
        ["organization_id", "survey_id", "submitted_at"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_research_submissions_survey_time", table_name="research_submissions")
    op.drop_index(op.f("ix_research_submissions_survey_id"), table_name="research_submissions")
    op.drop_index(
        op.f("ix_research_submissions_organization_id"),
        table_name="research_submissions",
    )
    op.drop_table("research_submissions")
    op.drop_index(op.f("ix_research_surveys_organization_id"), table_name="research_surveys")
    op.drop_index("ix_research_surveys_lookup", table_name="research_surveys")
    op.drop_table("research_surveys")
