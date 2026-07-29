"""Convert `legal_document_revisions.body` from plain text to RichDoc JSON.

CG-B9 (ADR-017 Amendment 1 §A1.3, D-046/D-047). A **new** revision, never an
edit to `20260726_0004`: `railway.json`'s `preDeployCommand: "alembic upgrade
head"` means 0004 is already applied on every deployed Railway environment,
so editing it in place would leave those environments permanently
inconsistent with the migration history.

Data conversion runs in Python, not a raw SQL `USING` expression: the table
is empty in every environment this has been checked against (D-045 means a
row only exists once someone actually publishes a document, which has not
happened yet — see TODO.md §5D), so a per-row loop is simplest to get right
and cheapest to verify without a live database, at no performance cost for a
table this size. Every existing row becomes a single-paragraph document
carrying its original text verbatim (ADR-017 Consequences) — this is a
storage re-encoding, not a content edit, so it does not conflict with D-045
immutability, which governs user-facing edits.

Revision ID: 20260729_0005
Revises: 20260726_0004
Create Date: 2026-07-29

"""

import json
from collections.abc import Sequence
from uuid import uuid4

import sqlalchemy as sa
from alembic import op

revision: str = "20260729_0005"
down_revision: str | None = "20260726_0004"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

_EMPTY_DOC = {"schemaVersion": 1, "blocks": []}


def _text_to_rich_doc(body: str) -> dict[str, object]:
    text = body.strip()
    if not text:
        return dict(_EMPTY_DOC)
    return {
        "schemaVersion": 1,
        "blocks": [
            {
                "id": str(uuid4()),
                "type": "paragraph",
                "spans": [{"text": text}],
            }
        ],
    }


def upgrade() -> None:
    op.add_column(
        "legal_document_revisions",
        sa.Column("body_richdoc", sa.JSON(), nullable=True),
    )

    connection = op.get_bind()
    rows = connection.execute(
        sa.text("SELECT id, body FROM legal_document_revisions")
    ).fetchall()
    for row in rows:
        connection.execute(
            sa.text(
                "UPDATE legal_document_revisions "
                "SET body_richdoc = CAST(:body AS JSON) WHERE id = :id"
            ),
            {"body": json.dumps(_text_to_rich_doc(row.body)), "id": row.id},
        )

    op.drop_column("legal_document_revisions", "body")
    op.alter_column(
        "legal_document_revisions",
        "body_richdoc",
        new_column_name="body",
        nullable=False,
        server_default=json.dumps(_EMPTY_DOC),
    )


def downgrade() -> None:
    """Best-effort text reconstruction: concatenates every span's text,
    blocks joined by a blank line. Not guaranteed to round-trip content an
    admin has since restructured with headings/lists — a downgrade is a
    rollback safety net, not a lossless inverse.
    """
    op.add_column(
        "legal_document_revisions",
        sa.Column("body_text", sa.Text(), nullable=True),
    )

    connection = op.get_bind()
    rows = connection.execute(
        sa.text("SELECT id, body FROM legal_document_revisions")
    ).fetchall()
    for row in rows:
        # `psycopg` may hand back a JSON column either pre-decoded (dict) or
        # as its raw text depending on driver registration — accept both
        # rather than assume one.
        raw = row.body
        doc = raw if isinstance(raw, dict) else (json.loads(raw) if raw else _EMPTY_DOC)
        paragraphs: list[str] = []
        for block in doc.get("blocks", []):
            spans = block.get("spans") or []
            items = block.get("items") or []
            if items:
                spans = [span for item in items for span in item.get("spans", [])]
            text = "".join(span.get("text", "") for span in spans)
            if text:
                paragraphs.append(text)
        connection.execute(
            sa.text("UPDATE legal_document_revisions SET body_text = :body WHERE id = :id"),
            {"body": "\n\n".join(paragraphs), "id": row.id},
        )

    op.drop_column("legal_document_revisions", "body")
    op.alter_column(
        "legal_document_revisions",
        "body_text",
        new_column_name="body",
        nullable=False,
        server_default="",
    )
