"""One address, one identity — enforced by PostgreSQL (AUTH-6, D-083).

`platform_credentials.normalized_email` was the only thing stopping two accounts
from sharing an address, and it does not cover the state **every provisioned
person passes through**: an operator creates the `internal_users` row with an
address and no credential, and until the activation link is spent that address
is unclaimed. Open registration on a live platform domain then hands it to
whoever asks first — a second `internal_users` row with the same address and a
credential attached to it. The real owner's activation afterwards fails on the
credential constraint, and there is no self-service way out of that.

Reproduced on the local database before this migration existed: registering
`elsa.browers@psihointegritet.com`, an address already provisioned and awaiting
activation, returned **201**.

The verification gate does not close this. It stops the squatter from *signing
in*; it does not stop them from *holding the address*, which is the part that
locks out the person the address belongs to.

Functional on ``lower(email)``: two rows differing only in case are one mailbox,
and unlike ``platform_credentials`` this column carries whatever provisioning
was given rather than a value the application normalized.

Partial on ``email IS NOT NULL``: `NULL` means "no address yet". Clerk left
several such rows behind and they are not each other's duplicates — a plain
unique index would collapse them into one and fail.

Revision ID: b7d92e40a115
Revises: a3c85f01d247
Create Date: 2026-09-09 00:00:00
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "b7d92e40a115"
down_revision: str | Sequence[str] | None = "a3c85f01d247"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # Creating the index would fail on its own if duplicates existed, but with
    # a message that names the index rather than the problem. Whoever runs this
    # against a database that has already been squatted needs the addresses, so
    # ask first and say what was found.
    duplicates = (
        op.get_bind()
        .execute(
            sa.text(
                """
                SELECT lower(email) AS address, count(*) AS rows
                  FROM internal_users
                 WHERE email IS NOT NULL
                 GROUP BY lower(email)
                HAVING count(*) > 1
                 ORDER BY address
                """
            )
        )
        .fetchall()
    )
    if duplicates:
        listing = ", ".join(f"{row.address} ({row.rows} rows)" for row in duplicates)
        raise RuntimeError(
            "internal_users already holds one address on more than one identity: "
            f"{listing}. Decide which row survives before this index can exist — "
            "the one carrying memberships is normally the provisioned identity, "
            "and the extra one is normally a self-registration that claimed it."
        )

    op.create_index(
        "uq_internal_users_email",
        "internal_users",
        [sa.text("lower(email)")],
        unique=True,
        postgresql_where=sa.text("email IS NOT NULL"),
    )


def downgrade() -> None:
    op.drop_index("uq_internal_users_email", table_name="internal_users")
