"""Publication rules specific to legal and consent documents.

The lifecycle itself (statuses, transitions, delete guard) lives in
`shared/domain/publication.py` so legal documents and CMS content share one
definition. What stays here is the legal-registry business rule: which
approvals each document kind needs, what counts as complete content, and when
the Intake consent gate is open.
"""

import re
from collections.abc import Iterable, Mapping
from dataclasses import dataclass
from typing import Literal

from psihointegritet.modules.privacy.models import LegalDocumentKind
from psihointegritet.shared.domain.publication import (
    ALLOWED_TRANSITIONS,
    ApprovalCapability,
    CannotDeleteRevisionError,
    InvalidRevisionTransitionError,
    RevisionStatus,
    can_delete,
    can_transition,
    require_deletable,
    require_transition,
)
from psihointegritet.shared.domain.rich_doc import RichDoc, rich_doc_text_length

__all__ = [
    "ALLOWED_TRANSITIONS",
    "CONSENT_GATE_KINDS",
    "MIN_BODY_LENGTH",
    "REQUIRED_APPROVALS",
    "CannotDeleteRevisionError",
    "InvalidRevisionTransitionError",
    "MissingApprovalError",
    "PublishCheck",
    "PublishStage",
    "can_delete",
    "can_transition",
    "check_publishable",
    "content_problems",
    "granted_capabilities",
    "intake_gate_open",
    "is_valid_slug",
    "missing_approvals",
    "require_deletable",
    "require_publishable",
    "require_transition",
]


class MissingApprovalError(ValueError):
    """Raised when a revision would publish without its required approvals."""


# The two Intake consent texts carry the gate described in the production
# Intake plan §1.3: Legal, Clinical and Business all sign off before activation.
REQUIRED_APPROVALS: Mapping[LegalDocumentKind, frozenset[ApprovalCapability]] = {
    LegalDocumentKind.INTAKE_DATA_PROCESSING_NOTICE: frozenset(
        {ApprovalCapability.LEGAL, ApprovalCapability.CLINICAL, ApprovalCapability.BUSINESS}
    ),
    LegalDocumentKind.INTAKE_REQUEST_ACKNOWLEDGEMENT: frozenset(
        {ApprovalCapability.LEGAL, ApprovalCapability.CLINICAL, ApprovalCapability.BUSINESS}
    ),
    LegalDocumentKind.PRIVACY_POLICY: frozenset({ApprovalCapability.LEGAL}),
    LegalDocumentKind.TERMS_OF_USE: frozenset({ApprovalCapability.LEGAL}),
    LegalDocumentKind.COOKIE_POLICY: frozenset({ApprovalCapability.LEGAL}),
    LegalDocumentKind.BOOKING_RULES: frozenset(
        {ApprovalCapability.LEGAL, ApprovalCapability.BUSINESS}
    ),
}

# Kinds whose published revision opens an Intake consent gate. Used by the
# settings resolver so a missing document keeps sensitive submission closed.
CONSENT_GATE_KINDS: frozenset[LegalDocumentKind] = frozenset(
    {
        LegalDocumentKind.INTAKE_DATA_PROCESSING_NOTICE,
        LegalDocumentKind.INTAKE_REQUEST_ACKNOWLEDGEMENT,
    }
)

# Content minimums mirrored 1:1 by the panel preview in
# `frontend/src/features/workspace/legal-documents.ts`; the shared fixture file
# `contracts/fixtures/legal-publication.v1.json` asserts the two stay equal.
# Measured in RichDoc plain-text length (CG-B9, ADR-017 Amendment 1 §A1.3) —
# was raw string length before the body column became RichDoc JSON.
MIN_BODY_LENGTH = 40
SLUG_PATTERN = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")

PublishStage = Literal["content", "transition", "approvals"]


@dataclass(frozen=True)
class PublishCheck:
    """Outcome of the staged publish evaluation (contract A.4).

    `stage` names the first blocking stage, or is None when publishing may
    proceed. Stages later than the blocking one are never evaluated, so their
    fields stay empty — the panel shows one problem class at a time.
    """

    ok: bool
    stage: PublishStage | None
    content_problems: tuple[str, ...]
    missing: frozenset[ApprovalCapability]


def is_valid_slug(slug: str) -> bool:
    return SLUG_PATTERN.fullmatch(slug) is not None


def content_problems(title: str, slug: str, body: RichDoc) -> tuple[str, ...]:
    """Machine-readable content findings, in the panel's display order.

    `body` is an already-parsed `RichDoc` — parsing (and any structural
    `RICH-0xx` findings that come with it) is the caller's job via
    `parse_rich_doc`, same separation `structural_findings` keeps in
    `modules/content/publication.py`.
    """
    problems: list[str] = []
    if not title.strip():
        problems.append("empty_title")
    if not is_valid_slug(slug):
        problems.append("invalid_slug")
    if rich_doc_text_length(body) < MIN_BODY_LENGTH:
        problems.append("body_too_short")
    return tuple(problems)


def granted_capabilities(approvals: list[dict[str, str]]) -> frozenset[ApprovalCapability]:
    """Read capabilities out of stored evidence, ignoring unknown values."""
    granted: set[ApprovalCapability] = set()
    for entry in approvals:
        try:
            granted.add(ApprovalCapability(entry.get("capability", "")))
        except ValueError:
            continue
    return frozenset(granted)


def missing_approvals(
    kind: LegalDocumentKind, approvals: list[dict[str, str]]
) -> frozenset[ApprovalCapability]:
    return REQUIRED_APPROVALS[kind] - granted_capabilities(approvals)


def check_publishable(
    kind: LegalDocumentKind,
    status: RevisionStatus,
    title: str,
    slug: str,
    body: RichDoc,
    approvals: list[dict[str, str]],
) -> PublishCheck:
    """Staged publish evaluation: content -> transition -> approvals (A.4).

    An earlier blocking stage stops the evaluation, so the admin first sees
    "the content is empty" rather than a list of missing signatures.
    """
    problems = content_problems(title, slug, body)
    if problems:
        return PublishCheck(
            ok=False, stage="content", content_problems=problems, missing=frozenset()
        )

    if not can_transition(status, RevisionStatus.PUBLISHED):
        return PublishCheck(ok=False, stage="transition", content_problems=(), missing=frozenset())

    missing = missing_approvals(kind, approvals)
    if missing:
        return PublishCheck(ok=False, stage="approvals", content_problems=(), missing=missing)

    return PublishCheck(ok=True, stage=None, content_problems=(), missing=frozenset())


def require_publishable(
    kind: LegalDocumentKind,
    current: RevisionStatus,
    approvals: list[dict[str, str]],
) -> None:
    """Guard the lifecycle half of publication: the transition and the evidence.

    Content minimums are the API layer's concern via `check_publishable`; this
    guard protects direct service-level status mutations.
    """
    require_transition(current, RevisionStatus.PUBLISHED)
    missing = missing_approvals(kind, approvals)
    if missing:
        names = ", ".join(sorted(capability.value for capability in missing))
        raise MissingApprovalError(f"Cannot publish {kind}: missing approval from {names}")


def intake_gate_open(published_kinds: Iterable[LegalDocumentKind]) -> bool:
    """Whether both Intake consent texts have a published revision.

    Archiving either text closes the gate the moment no published revision of
    that kind remains (contract A.1). This is the pure rule LD-6 wires to the
    database; until then settings env values remain the production path.
    """
    return CONSENT_GATE_KINDS.issubset(published_kinds)
