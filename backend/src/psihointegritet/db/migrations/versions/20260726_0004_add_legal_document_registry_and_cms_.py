"""Add legal document registry and CMS core content tables.

Covers LD-5 (`legal_documents`, `legal_document_revisions`,
`legal_document_events`) and CG-B5 (`content_entries`, `content_revisions`,
`content_review_decisions`, `content_publication_events`).

**Additive only.** Autogenerate also reported pre-existing drift between
migrations 0001-0003 and the current Intake/identity models — VARCHAR columns
the models now declare as `Enum`, unique constraints the models now express as
unique indexes, and a `intake_cases.age_group` column the model no longer has.
None of that is shipped here: this migration must not drop a column carrying
Intake data as a side effect of adding CMS tables. That drift is recorded as a
separate defect and needs its own reviewed migration.

Revision ID: 20260726_0004
Revises: 20260722_0003
Create Date: 2026-07-26

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20260726_0004"
down_revision: str | None = "20260722_0003"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

REVISION_STATUS = sa.Enum(
    "draft",
    "in_review",
    "approved",
    "published",
    "archived",
    name="revisionstatus",
    native_enum=False,
    length=32,
)


def upgrade() -> None:
    """Create the legal-document registry and the CMS core tables."""
    op.create_table(
        "legal_documents",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("organization_id", sa.Uuid(), nullable=False),
        sa.Column(
            "kind",
            sa.Enum(
                "intake_data_processing_notice",
                "intake_request_acknowledgement",
                "privacy_policy",
                "terms_of_use",
                "cookie_policy",
                "booking_rules",
                name="legaldocumentkind",
                native_enum=False,
                length=64,
            ),
            nullable=False,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["organization_id"],
            ["organizations.id"],
            name=op.f("fk_legal_documents_organization_id_organizations"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_legal_documents")),
        sa.UniqueConstraint("organization_id", "kind", name="uq_legal_document_kind"),
    )
    op.create_index(
        op.f("ix_legal_documents_organization_id"),
        "legal_documents",
        ["organization_id"],
        unique=False,
    )

    op.create_table(
        "legal_document_revisions",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("document_id", sa.Uuid(), nullable=False),
        sa.Column("version_label", sa.String(length=80), nullable=False),
        sa.Column("locale", sa.String(length=16), server_default="sr-Latn", nullable=False),
        sa.Column("title", sa.String(length=200), nullable=False),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column("status", REVISION_STATUS, server_default="draft", nullable=False),
        sa.Column("approvals", sa.JSON(), server_default="[]", nullable=False),
        sa.Column("created_by_user_id", sa.Uuid(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("published_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("archived_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(
            ["created_by_user_id"],
            ["internal_users.id"],
            name=op.f("fk_legal_document_revisions_created_by_user_id_internal_users"),
            ondelete="SET NULL",
        ),
        sa.ForeignKeyConstraint(
            ["document_id"],
            ["legal_documents.id"],
            name=op.f("fk_legal_document_revisions_document_id_legal_documents"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_legal_document_revisions")),
        sa.UniqueConstraint("document_id", "version_label", name="uq_legal_revision_version"),
    )
    op.create_index(
        op.f("ix_legal_document_revisions_document_id"),
        "legal_document_revisions",
        ["document_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_legal_document_revisions_status"),
        "legal_document_revisions",
        ["status"],
        unique=False,
    )
    # D-045: at most one published revision per document, enforced by the
    # database rather than by an application check that could race.
    op.create_index(
        "uq_legal_revision_published",
        "legal_document_revisions",
        ["document_id"],
        unique=True,
        postgresql_where=sa.text("status = 'published'"),
    )

    op.create_table(
        "legal_document_events",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("revision_id", sa.Uuid(), nullable=False),
        sa.Column("from_status", REVISION_STATUS, nullable=True),
        sa.Column("to_status", REVISION_STATUS, nullable=False),
        sa.Column("actor_user_id", sa.Uuid(), nullable=True),
        sa.Column("reason", sa.String(length=500), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["actor_user_id"],
            ["internal_users.id"],
            name=op.f("fk_legal_document_events_actor_user_id_internal_users"),
            ondelete="SET NULL",
        ),
        sa.ForeignKeyConstraint(
            ["revision_id"],
            ["legal_document_revisions.id"],
            name=op.f("fk_legal_document_events_revision_id_legal_document_revisions"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_legal_document_events")),
    )
    op.create_index(
        op.f("ix_legal_document_events_revision_id"),
        "legal_document_events",
        ["revision_id"],
        unique=False,
    )

    op.create_table(
        "content_entries",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("organization_id", sa.Uuid(), nullable=False),
        sa.Column(
            "content_type",
            sa.Enum(
                "static_page",
                "service",
                "therapist",
                "program",
                "company_plan",
                "package_offer",
                name="contenttype",
                native_enum=False,
                length=32,
            ),
            nullable=False,
        ),
        sa.Column("slug", sa.String(length=160), nullable=False),
        sa.Column("locale", sa.String(length=16), server_default="sr-Latn", nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["organization_id"],
            ["organizations.id"],
            name=op.f("fk_content_entries_organization_id_organizations"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_content_entries")),
        sa.UniqueConstraint(
            "organization_id", "content_type", "locale", "slug", name="uq_content_entry_slug"
        ),
    )
    op.create_index(
        op.f("ix_content_entries_organization_id"),
        "content_entries",
        ["organization_id"],
        unique=False,
    )

    op.create_table(
        "content_revisions",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("entry_id", sa.Uuid(), nullable=False),
        sa.Column("version_label", sa.String(length=80), nullable=False),
        sa.Column(
            "template",
            sa.Enum(
                "service_detail",
                "therapist_profile",
                "support_area",
                "audience_page",
                "program_detail",
                "company_page",
                "pricing_page",
                "static_information",
                "legal_page",
                name="contenttemplate",
                native_enum=False,
                length=48,
            ),
            nullable=False,
        ),
        sa.Column("slot_data", sa.JSON(), server_default="{}", nullable=False),
        sa.Column("status", REVISION_STATUS, server_default="draft", nullable=False),
        sa.Column("validation_snapshot", sa.JSON(), server_default="{}", nullable=False),
        sa.Column("lock_version", sa.Integer(), server_default="1", nullable=False),
        sa.Column("created_by_user_id", sa.Uuid(), nullable=True),
        sa.Column("updated_by_user_id", sa.Uuid(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("published_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("archived_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(
            ["created_by_user_id"],
            ["internal_users.id"],
            name=op.f("fk_content_revisions_created_by_user_id_internal_users"),
            ondelete="SET NULL",
        ),
        sa.ForeignKeyConstraint(
            ["entry_id"],
            ["content_entries.id"],
            name=op.f("fk_content_revisions_entry_id_content_entries"),
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["updated_by_user_id"],
            ["internal_users.id"],
            name=op.f("fk_content_revisions_updated_by_user_id_internal_users"),
            ondelete="SET NULL",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_content_revisions")),
        sa.UniqueConstraint("entry_id", "version_label", name="uq_content_revision_version"),
    )
    op.create_index(
        op.f("ix_content_revisions_entry_id"), "content_revisions", ["entry_id"], unique=False
    )
    op.create_index(
        op.f("ix_content_revisions_status"), "content_revisions", ["status"], unique=False
    )
    op.create_index(
        "uq_content_revision_published",
        "content_revisions",
        ["entry_id"],
        unique=True,
        postgresql_where=sa.text("status = 'published'"),
    )

    op.create_table(
        "content_review_decisions",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("revision_id", sa.Uuid(), nullable=False),
        sa.Column(
            "capability",
            sa.Enum(
                "clinical",
                "legal",
                "business",
                name="approvalcapability",
                native_enum=False,
                length=32,
            ),
            nullable=False,
        ),
        sa.Column(
            "outcome",
            sa.Enum(
                "approved",
                "rejected",
                name="reviewoutcome",
                native_enum=False,
                length=32,
            ),
            nullable=False,
        ),
        sa.Column("decided_by_user_id", sa.Uuid(), nullable=True),
        sa.Column(
            "decided_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("note", sa.String(length=500), nullable=True),
        sa.ForeignKeyConstraint(
            ["decided_by_user_id"],
            ["internal_users.id"],
            name=op.f("fk_content_review_decisions_decided_by_user_id_internal_users"),
            ondelete="SET NULL",
        ),
        sa.ForeignKeyConstraint(
            ["revision_id"],
            ["content_revisions.id"],
            name=op.f("fk_content_review_decisions_revision_id_content_revisions"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_content_review_decisions")),
        sa.UniqueConstraint("revision_id", "capability", name="uq_content_review_capability"),
    )
    op.create_index(
        op.f("ix_content_review_decisions_revision_id"),
        "content_review_decisions",
        ["revision_id"],
        unique=False,
    )

    op.create_table(
        "content_publication_events",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("revision_id", sa.Uuid(), nullable=False),
        sa.Column("from_status", REVISION_STATUS, nullable=True),
        sa.Column("to_status", REVISION_STATUS, nullable=False),
        sa.Column("actor_user_id", sa.Uuid(), nullable=True),
        sa.Column("reason", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["actor_user_id"],
            ["internal_users.id"],
            name=op.f("fk_content_publication_events_actor_user_id_internal_users"),
            ondelete="SET NULL",
        ),
        sa.ForeignKeyConstraint(
            ["revision_id"],
            ["content_revisions.id"],
            name=op.f("fk_content_publication_events_revision_id_content_revisions"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_content_publication_events")),
    )
    op.create_index(
        op.f("ix_content_publication_events_revision_id"),
        "content_publication_events",
        ["revision_id"],
        unique=False,
    )


def downgrade() -> None:
    """Drop both registries, children before parents."""
    op.drop_index(
        op.f("ix_content_publication_events_revision_id"),
        table_name="content_publication_events",
    )
    op.drop_table("content_publication_events")

    op.drop_index(
        op.f("ix_content_review_decisions_revision_id"), table_name="content_review_decisions"
    )
    op.drop_table("content_review_decisions")

    op.drop_index("uq_content_revision_published", table_name="content_revisions")
    op.drop_index(op.f("ix_content_revisions_status"), table_name="content_revisions")
    op.drop_index(op.f("ix_content_revisions_entry_id"), table_name="content_revisions")
    op.drop_table("content_revisions")

    op.drop_index(op.f("ix_content_entries_organization_id"), table_name="content_entries")
    op.drop_table("content_entries")

    op.drop_index(op.f("ix_legal_document_events_revision_id"), table_name="legal_document_events")
    op.drop_table("legal_document_events")

    op.drop_index("uq_legal_revision_published", table_name="legal_document_revisions")
    op.drop_index(op.f("ix_legal_document_revisions_status"), table_name="legal_document_revisions")
    op.drop_index(
        op.f("ix_legal_document_revisions_document_id"), table_name="legal_document_revisions"
    )
    op.drop_table("legal_document_revisions")

    op.drop_index(op.f("ix_legal_documents_organization_id"), table_name="legal_documents")
    op.drop_table("legal_documents")
