"""Add stable slugs and repeatable custom legal documents.

Revision ID: 20260730_0009
Revises: 20260730_0008
Create Date: 2026-07-30
"""

import sqlalchemy as sa
from alembic import op

revision: str = "20260730_0009"
down_revision: str | None = "20260730_0008"
branch_labels: str | None = None
depends_on: str | None = None


def upgrade() -> None:
    op.add_column("legal_documents", sa.Column("slug", sa.String(length=80), nullable=True))
    # Some long-lived Railway databases applied the original 0005 before
    # ``legal_document_revisions.slug`` was added to that historical file.
    # Alembic correctly considers 0005 complete there, so 0009 must support
    # both physical schemas. Repair the missing physical column as part of
    # this unapplied migration so the current ORM remains valid afterwards;
    # existing drifted rows receive an empty snapshot and use the stable-kind
    # fallback below.
    revision_columns = {
        column["name"]
        for column in sa.inspect(op.get_bind()).get_columns("legal_document_revisions")
    }
    if "slug" not in revision_columns:
        op.add_column(
            "legal_document_revisions",
            sa.Column("slug", sa.String(80), nullable=False, server_default=""),
        )
    op.execute(
        """
        UPDATE legal_documents AS document
        SET slug = COALESCE(
            NULLIF(
                (
                    SELECT revision.slug
                    FROM legal_document_revisions AS revision
                    WHERE revision.document_id = document.id
                    ORDER BY revision.created_at DESC, revision.id DESC
                    LIMIT 1
                ),
                ''
            ),
            replace(document.kind, '_', '-')
        )
        """
    )
    # The old schema allowed two different protected kinds to reuse a slug.
    # Keep the oldest identity unchanged and deterministically disambiguate
    # later collisions before adding the tenant-wide unique constraint.
    op.execute(
        """
        WITH ranked AS (
            SELECT
                id,
                row_number() OVER (
                    PARTITION BY organization_id, slug
                    ORDER BY created_at, id
                ) AS position
            FROM legal_documents
        )
        UPDATE legal_documents AS document
        SET slug = concat(
            left(document.slug, 20),
            '-',
            left(replace(document.kind, '_', '-'), 15),
            '-',
            document.id::text
        )
        FROM ranked
        WHERE ranked.id = document.id
          AND ranked.position > 1
        """
    )
    op.alter_column("legal_documents", "slug", nullable=False)
    op.drop_constraint("uq_legal_document_kind", "legal_documents", type_="unique")
    op.create_unique_constraint(
        "uq_legal_document_slug",
        "legal_documents",
        ["organization_id", "slug"],
    )
    op.create_index(
        "uq_legal_document_protected_kind",
        "legal_documents",
        ["organization_id", "kind"],
        unique=True,
        postgresql_where=sa.text("kind <> 'custom_document'"),
    )


def downgrade() -> None:
    op.drop_index("uq_legal_document_protected_kind", table_name="legal_documents")
    op.drop_constraint("uq_legal_document_slug", "legal_documents", type_="unique")
    op.drop_column("legal_documents", "slug")
    op.create_unique_constraint(
        "uq_legal_document_kind",
        "legal_documents",
        ["organization_id", "kind"],
    )
