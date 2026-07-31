"""Add the governed Kompas taxonomy registry and migrate D-052 areas.

Revision ID: 20260731_0011
Revises: 20260730_0010
Create Date: 2026-07-31
"""

from __future__ import annotations

from collections.abc import Sequence
from datetime import UTC, datetime
from uuid import UUID, uuid5

import sqlalchemy as sa
from alembic import op

revision: str = "20260731_0011"
down_revision: str | None = "20260730_0010"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

_NAMESPACE = UUID("2f7452bf-a102-4c9c-9a3e-5824c6e12540")

TAXONOMY_AXIS = sa.Enum(
    "topic_group",
    "topic",
    "audience",
    "content_goal",
    "support_area",
    "journey_intent",
    "content_format",
    "access_level",
    name="taxonomyaxis",
    native_enum=False,
    length=32,
)
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
RELATION_KIND = sa.Enum(
    "related_topic",
    "replacement",
    name="taxonomyrelationkind",
    native_enum=False,
    length=32,
)
APPROVAL_CAPABILITY = sa.Enum(
    "clinical",
    "legal",
    "business",
    name="approvalcapability",
    native_enum=False,
    length=32,
)
REVIEW_OUTCOME = sa.Enum(
    "approved",
    "rejected",
    name="reviewoutcome",
    native_enum=False,
    length=32,
)

SYSTEM_TERMS = (
    ("support_area", "anxiety_stress", "Stres i anksioznost", 1, False, False),
    ("support_area", "relationships", "Odnosi i partnerske teme", 2, False, False),
    ("support_area", "parenting", "Roditeljstvo", 3, False, False),
    ("support_area", "trauma_crisis", "Trauma i krizna iskustva", 4, False, False),
    ("support_area", "personal_growth", "Lični rast i razvoj", 5, False, False),
    ("journey_intent", "explore", "Želim da istražujem", 1, True, True),
    (
        "journey_intent",
        "professional_support",
        "Želim stručnu podršku",
        2,
        True,
        True,
    ),
    ("journey_intent", "both", "Oba puta", 3, True, True),
    ("content_format", "article", "Članak", 1, False, False),
    ("content_format", "pdf", "PDF", 2, False, False),
    ("content_format", "video", "Video", 3, False, False),
    ("content_format", "audio", "Audio", 4, False, False),
    ("content_format", "worksheet", "Radni list", 5, False, False),
    ("content_format", "program", "Program", 6, False, False),
    ("access_level", "public", "Javno", 1, False, False),
    ("access_level", "registered", "Registrovani korisnik", 2, False, False),
    ("access_level", "staff_only", "Samo osoblje", 3, False, False),
)


def _term_id(axis: str, stable_id: str) -> UUID:
    return uuid5(_NAMESPACE, f"term:{axis}:{stable_id}")


def _revision_id(axis: str, stable_id: str) -> UUID:
    return uuid5(_NAMESPACE, f"revision:{axis}:{stable_id}:sr-Latn:v1")


def upgrade() -> None:
    op.create_table(
        "taxonomy_terms",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("organization_id", sa.Uuid(), nullable=True),
        sa.Column("axis", TAXONOMY_AXIS, nullable=False),
        sa.Column("stable_id", sa.String(length=80), nullable=False),
        sa.Column("system_defined", sa.Boolean(), server_default=sa.text("false"), nullable=False),
        sa.Column("created_by_user_id", sa.Uuid(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.CheckConstraint(
            "(system_defined AND organization_id IS NULL AND axis IN "
            "('support_area', 'journey_intent', 'content_format', 'access_level')) OR "
            "(NOT system_defined AND organization_id IS NOT NULL AND axis IN "
            "('topic_group', 'topic', 'audience', 'content_goal'))",
            name="ck_taxonomy_terms_taxonomy_term_scope",
        ),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["created_by_user_id"], ["internal_users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_taxonomy_terms_organization_id", "taxonomy_terms", ["organization_id"])
    op.create_index("ix_taxonomy_terms_axis", "taxonomy_terms", ["axis"])
    op.create_index(
        "uq_tax_term_system_identity",
        "taxonomy_terms",
        ["axis", "stable_id"],
        unique=True,
        postgresql_where=sa.text("organization_id IS NULL"),
    )
    op.create_index(
        "uq_tax_term_managed_identity",
        "taxonomy_terms",
        ["organization_id", "axis", "stable_id"],
        unique=True,
        postgresql_where=sa.text("organization_id IS NOT NULL"),
    )

    op.create_table(
        "taxonomy_term_revisions",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("term_id", sa.Uuid(), nullable=False),
        sa.Column("organization_id", sa.Uuid(), nullable=True),
        sa.Column("version_label", sa.String(length=80), nullable=False),
        sa.Column("locale", sa.String(length=16), server_default="sr-Latn", nullable=False),
        sa.Column("public_label", sa.String(length=160), nullable=False),
        sa.Column("short_description", sa.String(length=500), server_default="", nullable=False),
        sa.Column("internal_expert_note", sa.Text(), nullable=True),
        sa.Column("primary_parent_term_id", sa.Uuid(), nullable=True),
        sa.Column("journey_intent_term_id", sa.Uuid(), nullable=True),
        sa.Column("sort_order", sa.Integer(), server_default="0", nullable=False),
        sa.Column("icon_key", sa.String(length=120), nullable=True),
        sa.Column("asset_id", sa.String(length=191), nullable=True),
        sa.Column("public_visible", sa.Boolean(), server_default=sa.text("true"), nullable=False),
        sa.Column("compass_enabled", sa.Boolean(), server_default=sa.text("true"), nullable=False),
        sa.Column("status", REVISION_STATUS, server_default="draft", nullable=False),
        sa.Column("lock_version", sa.Integer(), server_default="1", nullable=False),
        sa.Column("created_by_user_id", sa.Uuid(), nullable=True),
        sa.Column("updated_by_user_id", sa.Uuid(), nullable=True),
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
        sa.Column("published_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("archived_at", sa.DateTime(timezone=True), nullable=True),
        sa.CheckConstraint(
            "sort_order >= 0", name="ck_taxonomy_term_revisions_taxonomy_revision_sort_order"
        ),
        sa.CheckConstraint(
            "NOT (icon_key IS NOT NULL AND asset_id IS NOT NULL)",
            name="ck_taxonomy_term_revisions_taxonomy_revision_icon_or_asset",
        ),
        sa.ForeignKeyConstraint(["term_id"], ["taxonomy_terms.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(
            ["primary_parent_term_id"], ["taxonomy_terms.id"], ondelete="RESTRICT"
        ),
        sa.ForeignKeyConstraint(
            ["journey_intent_term_id"], ["taxonomy_terms.id"], ondelete="RESTRICT"
        ),
        sa.ForeignKeyConstraint(["created_by_user_id"], ["internal_users.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["updated_by_user_id"], ["internal_users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_taxonomy_term_revisions_term_id", "taxonomy_term_revisions", ["term_id"])
    op.create_index(
        "ix_taxonomy_term_revisions_organization_id",
        "taxonomy_term_revisions",
        ["organization_id"],
    )
    op.create_index("ix_taxonomy_term_revisions_status", "taxonomy_term_revisions", ["status"])
    op.create_index(
        "uq_tax_rev_global_version",
        "taxonomy_term_revisions",
        ["term_id", "locale", "version_label"],
        unique=True,
        postgresql_where=sa.text("organization_id IS NULL"),
    )
    op.create_index(
        "uq_tax_rev_tenant_version",
        "taxonomy_term_revisions",
        ["term_id", "organization_id", "locale", "version_label"],
        unique=True,
        postgresql_where=sa.text("organization_id IS NOT NULL"),
    )
    op.create_index(
        "uq_tax_rev_global_published",
        "taxonomy_term_revisions",
        ["term_id", "locale"],
        unique=True,
        postgresql_where=sa.text("status = 'published' AND organization_id IS NULL"),
    )
    op.create_index(
        "uq_tax_rev_tenant_published",
        "taxonomy_term_revisions",
        ["term_id", "organization_id", "locale"],
        unique=True,
        postgresql_where=sa.text("status = 'published' AND organization_id IS NOT NULL"),
    )

    op.create_table(
        "taxonomy_term_search_terms",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("revision_id", sa.Uuid(), nullable=False),
        sa.Column("original_value", sa.String(length=160), nullable=False),
        sa.Column("normalized_value", sa.String(length=160), nullable=False),
        sa.ForeignKeyConstraint(
            ["revision_id"], ["taxonomy_term_revisions.id"], ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_taxonomy_term_search_terms_revision_id",
        "taxonomy_term_search_terms",
        ["revision_id"],
    )
    op.create_index(
        "uq_tax_search_normalized",
        "taxonomy_term_search_terms",
        ["revision_id", "normalized_value"],
        unique=True,
    )

    op.create_table(
        "taxonomy_term_relations",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("source_revision_id", sa.Uuid(), nullable=False),
        sa.Column("source_term_id", sa.Uuid(), nullable=False),
        sa.Column("target_term_id", sa.Uuid(), nullable=False),
        sa.Column("relation_kind", RELATION_KIND, nullable=False),
        sa.CheckConstraint(
            "source_term_id <> target_term_id",
            name="ck_taxonomy_term_relations_taxonomy_relation_not_self",
        ),
        sa.ForeignKeyConstraint(
            ["source_revision_id"], ["taxonomy_term_revisions.id"], ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(["source_term_id"], ["taxonomy_terms.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["target_term_id"], ["taxonomy_terms.id"], ondelete="RESTRICT"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_taxonomy_term_relations_source_revision_id",
        "taxonomy_term_relations",
        ["source_revision_id"],
    )
    op.create_index(
        "ix_taxonomy_term_relations_target_term_id",
        "taxonomy_term_relations",
        ["target_term_id"],
    )
    op.create_index(
        "uq_tax_term_relation",
        "taxonomy_term_relations",
        ["source_revision_id", "target_term_id", "relation_kind"],
        unique=True,
    )

    op.create_table(
        "taxonomy_review_decisions",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("revision_id", sa.Uuid(), nullable=False),
        sa.Column("capability", APPROVAL_CAPABILITY, nullable=False),
        sa.Column("outcome", REVIEW_OUTCOME, nullable=False),
        sa.Column("decided_by_user_id", sa.Uuid(), nullable=True),
        sa.Column(
            "decided_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column("note", sa.String(length=500), nullable=True),
        sa.ForeignKeyConstraint(
            ["revision_id"], ["taxonomy_term_revisions.id"], ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(["decided_by_user_id"], ["internal_users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_taxonomy_review_decisions_revision_id",
        "taxonomy_review_decisions",
        ["revision_id"],
    )
    op.create_index(
        "uq_tax_review_capability",
        "taxonomy_review_decisions",
        ["revision_id", "capability"],
        unique=True,
    )

    op.create_table(
        "taxonomy_intake_links",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("organization_id", sa.Uuid(), nullable=False),
        sa.Column("topic_term_id", sa.Uuid(), nullable=False),
        sa.Column("support_area_term_id", sa.Uuid(), nullable=False),
        sa.Column("status", REVISION_STATUS, server_default="draft", nullable=False),
        sa.Column("lock_version", sa.Integer(), server_default="1", nullable=False),
        sa.Column("created_by_user_id", sa.Uuid(), nullable=True),
        sa.Column("updated_by_user_id", sa.Uuid(), nullable=True),
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
        sa.Column("published_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("archived_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["topic_term_id"], ["taxonomy_terms.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(
            ["support_area_term_id"], ["taxonomy_terms.id"], ondelete="RESTRICT"
        ),
        sa.ForeignKeyConstraint(["created_by_user_id"], ["internal_users.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["updated_by_user_id"], ["internal_users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_taxonomy_intake_links_organization_id",
        "taxonomy_intake_links",
        ["organization_id"],
    )
    op.create_index(
        "ix_taxonomy_intake_links_topic_term_id",
        "taxonomy_intake_links",
        ["topic_term_id"],
    )
    op.create_index(
        "ix_taxonomy_intake_links_support_area_term_id",
        "taxonomy_intake_links",
        ["support_area_term_id"],
    )
    op.create_index("ix_taxonomy_intake_links_status", "taxonomy_intake_links", ["status"])
    op.create_index(
        "uq_tax_intake_link",
        "taxonomy_intake_links",
        ["organization_id", "topic_term_id", "support_area_term_id"],
        unique=True,
    )

    op.create_table(
        "taxonomy_intake_link_review_decisions",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("link_id", sa.Uuid(), nullable=False),
        sa.Column("capability", APPROVAL_CAPABILITY, nullable=False),
        sa.Column("outcome", REVIEW_OUTCOME, nullable=False),
        sa.Column("decided_by_user_id", sa.Uuid(), nullable=True),
        sa.Column(
            "decided_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column("note", sa.String(length=500), nullable=True),
        sa.ForeignKeyConstraint(["link_id"], ["taxonomy_intake_links.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["decided_by_user_id"], ["internal_users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_taxonomy_intake_link_review_decisions_link_id",
        "taxonomy_intake_link_review_decisions",
        ["link_id"],
    )
    op.create_index(
        "uq_tax_link_review_capability",
        "taxonomy_intake_link_review_decisions",
        ["link_id", "capability"],
        unique=True,
    )

    op.create_table(
        "taxonomy_publication_events",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("term_revision_id", sa.Uuid(), nullable=True),
        sa.Column("intake_link_id", sa.Uuid(), nullable=True),
        sa.Column("from_status", REVISION_STATUS, nullable=True),
        sa.Column("to_status", REVISION_STATUS, nullable=False),
        sa.Column("actor_user_id", sa.Uuid(), nullable=True),
        sa.Column("reason", sa.String(length=500), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.CheckConstraint(
            "(term_revision_id IS NOT NULL AND intake_link_id IS NULL) OR "
            "(term_revision_id IS NULL AND intake_link_id IS NOT NULL)",
            name="ck_taxonomy_publication_events_taxonomy_event_one_subject",
        ),
        sa.ForeignKeyConstraint(
            ["term_revision_id"], ["taxonomy_term_revisions.id"], ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(
            ["intake_link_id"], ["taxonomy_intake_links.id"], ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(["actor_user_id"], ["internal_users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_taxonomy_publication_events_term_revision_id",
        "taxonomy_publication_events",
        ["term_revision_id"],
    )
    op.create_index(
        "ix_taxonomy_publication_events_intake_link_id",
        "taxonomy_publication_events",
        ["intake_link_id"],
    )

    op.create_table(
        "therapist_matching_profile_support_areas",
        sa.Column("therapist_profile_id", sa.Uuid(), nullable=False),
        sa.Column("support_area_term_id", sa.Uuid(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["therapist_profile_id"],
            ["therapist_matching_profiles.id"],
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["support_area_term_id"], ["taxonomy_terms.id"], ondelete="RESTRICT"
        ),
        sa.PrimaryKeyConstraint("therapist_profile_id", "support_area_term_id"),
    )

    now = datetime.now(UTC)
    term_table = sa.table(
        "taxonomy_terms",
        sa.column("id", sa.Uuid()),
        sa.column("organization_id", sa.Uuid()),
        sa.column("axis", TAXONOMY_AXIS),
        sa.column("stable_id", sa.String()),
        sa.column("system_defined", sa.Boolean()),
        sa.column("created_by_user_id", sa.Uuid()),
        sa.column("created_at", sa.DateTime(timezone=True)),
    )
    revision_table = sa.table(
        "taxonomy_term_revisions",
        sa.column("id", sa.Uuid()),
        sa.column("term_id", sa.Uuid()),
        sa.column("organization_id", sa.Uuid()),
        sa.column("version_label", sa.String()),
        sa.column("locale", sa.String()),
        sa.column("public_label", sa.String()),
        sa.column("short_description", sa.String()),
        sa.column("internal_expert_note", sa.Text()),
        sa.column("primary_parent_term_id", sa.Uuid()),
        sa.column("journey_intent_term_id", sa.Uuid()),
        sa.column("sort_order", sa.Integer()),
        sa.column("icon_key", sa.String()),
        sa.column("asset_id", sa.String()),
        sa.column("public_visible", sa.Boolean()),
        sa.column("compass_enabled", sa.Boolean()),
        sa.column("status", REVISION_STATUS),
        sa.column("lock_version", sa.Integer()),
        sa.column("created_by_user_id", sa.Uuid()),
        sa.column("updated_by_user_id", sa.Uuid()),
        sa.column("created_at", sa.DateTime(timezone=True)),
        sa.column("updated_at", sa.DateTime(timezone=True)),
        sa.column("published_at", sa.DateTime(timezone=True)),
        sa.column("archived_at", sa.DateTime(timezone=True)),
    )
    op.bulk_insert(
        term_table,
        [
            {
                "id": _term_id(axis, stable_id),
                "organization_id": None,
                "axis": axis,
                "stable_id": stable_id,
                "system_defined": True,
                "created_by_user_id": None,
                "created_at": now,
            }
            for axis, stable_id, _label, _order, _visible, _enabled in SYSTEM_TERMS
        ],
    )
    op.bulk_insert(
        revision_table,
        [
            {
                "id": _revision_id(axis, stable_id),
                "term_id": _term_id(axis, stable_id),
                "organization_id": None,
                "version_label": "v1",
                "locale": "sr-Latn",
                "public_label": label,
                "short_description": "",
                "internal_expert_note": None,
                "primary_parent_term_id": None,
                "journey_intent_term_id": None,
                "sort_order": order,
                "icon_key": None,
                "asset_id": None,
                "public_visible": visible,
                "compass_enabled": enabled,
                "status": "published",
                "lock_version": 1,
                "created_by_user_id": None,
                "updated_by_user_id": None,
                "created_at": now,
                "updated_at": now,
                "published_at": now,
                "archived_at": None,
            }
            for axis, stable_id, label, order, visible, enabled in SYSTEM_TERMS
        ],
    )

    # Dual-read migration: the new FK-backed table becomes primary after
    # deployment, while the legacy JSON remains as a temporary fallback.
    op.execute(
        sa.text(
            """
            INSERT INTO therapist_matching_profile_support_areas
                (therapist_profile_id, support_area_term_id)
            SELECT profile.id, term.id
            FROM therapist_matching_profiles AS profile
            CROSS JOIN LATERAL json_array_elements_text(
                COALESCE(profile.areas, '[]'::json)
            ) AS area(stable_id)
            JOIN taxonomy_terms AS term
              ON term.axis = 'support_area'
             AND term.stable_id = area.stable_id
             AND term.system_defined = true
            ON CONFLICT DO NOTHING
            """
        )
    )


def downgrade() -> None:
    op.drop_table("therapist_matching_profile_support_areas")
    op.drop_index(
        "ix_taxonomy_publication_events_intake_link_id",
        table_name="taxonomy_publication_events",
    )
    op.drop_index(
        "ix_taxonomy_publication_events_term_revision_id",
        table_name="taxonomy_publication_events",
    )
    op.drop_table("taxonomy_publication_events")
    op.drop_index(
        "uq_tax_link_review_capability",
        table_name="taxonomy_intake_link_review_decisions",
    )
    op.drop_index(
        "ix_taxonomy_intake_link_review_decisions_link_id",
        table_name="taxonomy_intake_link_review_decisions",
    )
    op.drop_table("taxonomy_intake_link_review_decisions")
    op.drop_index("uq_tax_intake_link", table_name="taxonomy_intake_links")
    op.drop_index("ix_taxonomy_intake_links_status", table_name="taxonomy_intake_links")
    op.drop_index(
        "ix_taxonomy_intake_links_support_area_term_id",
        table_name="taxonomy_intake_links",
    )
    op.drop_index("ix_taxonomy_intake_links_topic_term_id", table_name="taxonomy_intake_links")
    op.drop_index("ix_taxonomy_intake_links_organization_id", table_name="taxonomy_intake_links")
    op.drop_table("taxonomy_intake_links")
    op.drop_index("uq_tax_review_capability", table_name="taxonomy_review_decisions")
    op.drop_index(
        "ix_taxonomy_review_decisions_revision_id", table_name="taxonomy_review_decisions"
    )
    op.drop_table("taxonomy_review_decisions")
    op.drop_index("uq_tax_term_relation", table_name="taxonomy_term_relations")
    op.drop_index("ix_taxonomy_term_relations_target_term_id", table_name="taxonomy_term_relations")
    op.drop_index(
        "ix_taxonomy_term_relations_source_revision_id",
        table_name="taxonomy_term_relations",
    )
    op.drop_table("taxonomy_term_relations")
    op.drop_index("uq_tax_search_normalized", table_name="taxonomy_term_search_terms")
    op.drop_index(
        "ix_taxonomy_term_search_terms_revision_id",
        table_name="taxonomy_term_search_terms",
    )
    op.drop_table("taxonomy_term_search_terms")
    op.drop_index("uq_tax_rev_tenant_published", table_name="taxonomy_term_revisions")
    op.drop_index("uq_tax_rev_global_published", table_name="taxonomy_term_revisions")
    op.drop_index("uq_tax_rev_tenant_version", table_name="taxonomy_term_revisions")
    op.drop_index("uq_tax_rev_global_version", table_name="taxonomy_term_revisions")
    op.drop_index("ix_taxonomy_term_revisions_status", table_name="taxonomy_term_revisions")
    op.drop_index(
        "ix_taxonomy_term_revisions_organization_id", table_name="taxonomy_term_revisions"
    )
    op.drop_index("ix_taxonomy_term_revisions_term_id", table_name="taxonomy_term_revisions")
    op.drop_table("taxonomy_term_revisions")
    op.drop_index("uq_tax_term_managed_identity", table_name="taxonomy_terms")
    op.drop_index("uq_tax_term_system_identity", table_name="taxonomy_terms")
    op.drop_index("ix_taxonomy_terms_axis", table_name="taxonomy_terms")
    op.drop_index("ix_taxonomy_terms_organization_id", table_name="taxonomy_terms")
    op.drop_table("taxonomy_terms")
