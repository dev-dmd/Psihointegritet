from datetime import datetime
from enum import StrEnum
from uuid import UUID, uuid4

from sqlalchemy import (
    JSON,
    DateTime,
    ForeignKey,
    Index,
    String,
    UniqueConstraint,
    Uuid,
    func,
    text,
)
from sqlalchemy.orm import Mapped, mapped_column

from psihointegritet.db.base import Base
from psihointegritet.shared.domain.publication import ApprovalCapability, RevisionStatus
from psihointegritet.shared.types.sa_enum import value_enum

# Re-exported so callers keep importing the lifecycle from the module they
# already use; the single definition lives in shared/domain (D-029, D-033).
__all__ = [
    "ApprovalCapability",
    "LegalDocument",
    "LegalDocumentEvent",
    "LegalDocumentKind",
    "LegalDocumentRevision",
    "RevisionStatus",
]


def _default_empty_body() -> dict[str, object]:
    return {"schemaVersion": 1, "blocks": []}


class LegalDocumentKind(StrEnum):
    """Document identities the registry can hold.

    The first two values intentionally mirror `ConsentKind` so a published
    revision maps straight onto the consent evidence written at submission.
    """

    INTAKE_DATA_PROCESSING_NOTICE = "intake_data_processing_notice"
    INTAKE_REQUEST_ACKNOWLEDGEMENT = "intake_request_acknowledgement"
    PRIVACY_POLICY = "privacy_policy"
    TERMS_OF_USE = "terms_of_use"
    COOKIE_POLICY = "cookie_policy"
    BOOKING_RULES = "booking_rules"


class LegalDocument(Base):
    """Stable identity for one document kind inside one organization."""

    __tablename__ = "legal_documents"
    __table_args__ = (UniqueConstraint("organization_id", "kind", name="uq_legal_document_kind"),)

    id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid4)
    organization_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), index=True
    )
    kind: Mapped[LegalDocumentKind] = mapped_column(
        value_enum(LegalDocumentKind, length=64), nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )


class LegalDocumentRevision(Base):
    """Immutable once published: consent evidence points at a version label.

    Editing a published revision is not allowed. A change creates a new
    revision, so `ConsentRecord.document_version` keeps resolving to the text
    the person was actually shown.
    """

    __tablename__ = "legal_document_revisions"
    __table_args__ = (
        UniqueConstraint("document_id", "version_label", name="uq_legal_revision_version"),
        # At most one published revision per document. PostgreSQL is the
        # authority here; application checks alone would race.
        Index(
            "uq_legal_revision_published",
            "document_id",
            unique=True,
            postgresql_where=text("status = 'published'"),
        ),
    )

    id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid4)
    document_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("legal_documents.id", ondelete="CASCADE"), index=True
    )
    version_label: Mapped[str] = mapped_column(String(80))
    locale: Mapped[str] = mapped_column(String(16), default="sr-Latn", server_default="sr-Latn")
    title: Mapped[str] = mapped_column(String(200))
    # Added in CG-B9/LD-7 (migration 20260729_0005): the column never
    # existed even though `publication.py::content_problems`/
    # `check_publishable` and the frontend `LegalDocument.slug` both already
    # treated it as part of the document's identity — nothing had actually
    # persisted it until the LD-7 service/router needed a real column to
    # read and write. No uniqueness constraint yet — the panel's client-side
    # check (`existingSlugs.includes`) is advisory only, same gap CG-B9
    # already flagged for `create_document`.
    slug: Mapped[str] = mapped_column(String(80), default="", server_default="")
    # RichDoc v1 JSON (ADR-017 Amendment 1 §A1.3, CG-B9). Was a plain `Text`
    # column under `20260726_0004`; a dedicated migration converts existing
    # rows to a single-paragraph document rather than editing that applied
    # revision in place.
    body: Mapped[dict[str, object]] = mapped_column(
        JSON,
        default=_default_empty_body,
        server_default='{"schemaVersion": 1, "blocks": []}',
        nullable=False,
    )
    status: Mapped[RevisionStatus] = mapped_column(
        value_enum(RevisionStatus, length=32),
        default=RevisionStatus.DRAFT,
        server_default=RevisionStatus.DRAFT.value,
        index=True,
    )
    # [{"capability": ..., "approver": ..., "approved_at": ..., "note": ...}]
    approvals: Mapped[list[dict[str, str]]] = mapped_column(
        JSON, default=list, server_default="[]", nullable=False
    )
    created_by_user_id: Mapped[UUID | None] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("internal_users.id", ondelete="SET NULL"), nullable=True
    )
    updated_by_user_id: Mapped[UUID | None] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("internal_users.id", ondelete="SET NULL"), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )
    published_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    archived_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class LegalDocumentEvent(Base):
    """Append-only audit for status changes.

    Publication opens the Intake consent gate, so it needs durable evidence
    from day one rather than the in-memory activity feed used by the D-026
    Feature Gates preview.
    """

    __tablename__ = "legal_document_events"

    id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid4)
    revision_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("legal_document_revisions.id", ondelete="CASCADE"),
        index=True,
    )
    from_status: Mapped[RevisionStatus | None] = mapped_column(
        value_enum(RevisionStatus, length=32), nullable=True
    )
    to_status: Mapped[RevisionStatus] = mapped_column(
        value_enum(RevisionStatus, length=32), nullable=False
    )
    actor_user_id: Mapped[UUID | None] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("internal_users.id", ondelete="SET NULL"), nullable=True
    )
    reason: Mapped[str | None] = mapped_column(String(500), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
