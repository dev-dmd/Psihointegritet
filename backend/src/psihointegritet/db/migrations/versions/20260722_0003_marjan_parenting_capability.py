"""Align Marjan's persisted service list with the confirmed matching profile.

Revision ID: 20260722_0003
Revises: 20260722_0002
Create Date: 2026-07-22
"""

from collections.abc import Sequence

from alembic import op

revision: str = "20260722_0003"
down_revision: str | None = "20260722_0002"
branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None


def upgrade() -> None:
    op.execute(
        """
        UPDATE therapist_matching_profiles
        SET services = (
            CASE
                WHEN services::jsonb ? 'roditeljsko-savetovanje' THEN services::jsonb
                ELSE services::jsonb || '["roditeljsko-savetovanje"]'::jsonb
            END
        )::json
        WHERE slug = 'marjan-jankovic'
        """
    )


def downgrade() -> None:
    op.execute(
        """
        UPDATE therapist_matching_profiles
        SET services = (services::jsonb - 'roditeljsko-savetovanje')::json
        WHERE slug = 'marjan-jankovic'
        """
    )
