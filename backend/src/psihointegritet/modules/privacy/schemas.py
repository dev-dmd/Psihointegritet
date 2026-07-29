"""Request/response schemas for the legal document registry API (LD-7).

**RichDoc stays a raw JSON object at the API boundary** (`dict[str, object]`),
the same shape `LegalDocumentRevision.body` and `ContentRevision.slot_data`
already store it as — not a typed Pydantic model of the `RichDoc` union. Two
reasons: (1) it keeps this contract identical to the DB column, so there is
no second shape to keep in sync; (2) `RichBlock` is a frozen-dataclass tagged
union (`heading | paragraph | list | quote`), and generating an exactly
correct OpenAPI discriminated-union schema for it needs verification this
pass explicitly defers (D-047 — no testing until the CMS + Booking passes).
The service layer parses/validates the raw object via
`shared.domain.rich_doc.parse_rich_doc` before doing anything with it.
"""

from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field
from pydantic.alias_generators import to_camel

from psihointegritet.modules.privacy.models import LegalDocumentKind
from psihointegritet.shared.domain.publication import ApprovalCapability, RevisionStatus


class ApiSchema(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True, extra="forbid")


class ApprovalEvidenceOut(ApiSchema):
    """Field names match the stored shape verbatim (`modules/privacy/models.py`'s
    `LegalDocumentRevision.approvals` comment: `capability`/`approver`/
    `approved_at`/`note`) — this is a read model over that JSON, not a
    redesign of it."""

    capability: ApprovalCapability
    approver: str | None = None
    approved_at: str | None = None
    note: str | None = None


class LegalDocumentRevisionOut(ApiSchema):
    document_id: UUID
    revision_id: UUID
    kind: LegalDocumentKind
    title: str
    slug: str
    body: dict[str, object]
    status: RevisionStatus
    version_label: str
    approvals: list[ApprovalEvidenceOut]
    updated_at: datetime


class CreateLegalDocumentRequest(ApiSchema):
    kind: LegalDocumentKind
    title: str = Field(min_length=1, max_length=200)
    slug: str = Field(min_length=1, max_length=80)


class UpdateLegalDocumentRevisionRequest(ApiSchema):
    """Every field optional: the panel only sends what changed."""

    title: str | None = Field(default=None, min_length=1, max_length=200)
    slug: str | None = Field(default=None, min_length=1, max_length=80)
    body: dict[str, object] | None = None


class TransitionRequest(ApiSchema):
    target: RevisionStatus


class RecordApprovalRequest(ApiSchema):
    capability: ApprovalCapability
    approver_label: str
    note: str | None = None


class ImportDocxFinding(ApiSchema):
    """Mirrors `shared.domain.rich_doc.RichDocFinding` for the wire."""

    rule_id: str
    rule_version: str
    severity: str
    message: str
    remediation: str
    field_path: str | None = None


class ImportDocxResponse(ApiSchema):
    """`ContentPatch`-shaped preview (ADR-017 Amendment 1 §A1.2): the import
    is never applied directly — the panel shows this report and the author
    explicitly saves it via `PATCH .../revisions/{revisionId}`."""

    body: dict[str, object]
    findings: list[ImportDocxFinding]
    requires_approval: bool


class PublishBlockOut(ApiSchema):
    stage: str
    content_problems: list[str]
    missing: list[ApprovalCapability]


class PublicLegalDocumentOut(ApiSchema):
    """Deliberately narrower than `LegalDocumentRevisionOut`: no approvals,
    no internal `documentId`/`revisionId` — this is what an anonymous
    visitor may read. `versionLabel` is kept because it is what
    `ConsentRecord.document_version` records (`modules/privacy/models.py`)."""

    kind: LegalDocumentKind
    title: str
    slug: str
    body: dict[str, object]
    version_label: str
    published_at: datetime | None = None
