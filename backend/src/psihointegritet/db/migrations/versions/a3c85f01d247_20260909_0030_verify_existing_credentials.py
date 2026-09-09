"""Treat a password that already exists as proof of address (AUTH-6, D-083).

Sign-in now refuses a credential whose ``email_verified_at`` is ``NULL``. Every
account that set its password *before* that check existed has ``NULL`` there,
because nothing stamped the column yet — so without this migration the gate
locks out precisely the people it was never aimed at, the moment the backend
deploys.

The gate's own reasoning is what makes the backfill sound rather than a shortcut
around it. It assumes an unverified password can only come from
self-registration, since every operator-issued link stamps the column when it is
spent. That assumption is true from the commit that introduced the stamping
onwards and false for everything before it: those passwords were also set by
spending a link sent to the address, which is the same proof, only unrecorded.
This migration writes down what already happened.

``password_changed_at`` is preferred over ``now()`` for the same reason: the
address was proved when the link was spent, not when this migration ran, and a
verification timestamp that lies about *when* is worse than useless in an audit.
``created_at`` is the fallback for a row predating that column's use.

Scoped to ``password_hash IS NOT NULL`` deliberately. A credential with no
password has proved nothing — those are the migrated Clerk accounts still
holding an unspent link, and spending it stamps the column on its own.

``tenant_client_credentials`` is untouched: AUTH-7 does not exist, the table has
no gate reading this column, and stamping rows nothing checks would only make a
future decision harder to see.

Revision ID: a3c85f01d247
Revises: 9fad3f7e8e54
Create Date: 2026-09-09 00:00:00
"""

from collections.abc import Sequence

from alembic import op

revision: str = "a3c85f01d247"
down_revision: str | Sequence[str] | None = "9fad3f7e8e54"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute(
        """
        UPDATE platform_credentials
           SET email_verified_at = COALESCE(password_changed_at, created_at)
         WHERE password_hash IS NOT NULL
           AND email_verified_at IS NULL
        """
    )


def downgrade() -> None:
    """Deliberately empty.

    The forward direction cannot be undone without erasing verifications this
    migration did not create: by the time anybody downgrades, accounts will have
    verified through the ordinary flow and their stamps are indistinguishable
    from these. Clearing the column wholesale would lock out real people to undo
    a data fix, which is a worse outcome than the drift.
    """
