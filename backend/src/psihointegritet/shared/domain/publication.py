"""Publication lifecycle shared by every governed-content module.

D-029 fixes one lifecycle for legal documents, CMS content and anything R3
adds later; D-033 fixes the approval capabilities; D-045 fixes what may be
deleted. Keeping them here means there is exactly one transition map in the
backend instead of one per module — the risk the CMS plan names explicitly
(plan §4, risk 4).

The frontend mirrors these rules for instant feedback; the shared fixture file
`contracts/fixtures/legal-publication.v1.json` proves the two stay identical.
This module owns the lifecycle only: which approvals a given document or
content type requires is the owning module's business rule.
"""

from collections.abc import Mapping
from enum import StrEnum


class RevisionStatus(StrEnum):
    """Publication lifecycle fixed by D-029."""

    DRAFT = "draft"
    IN_REVIEW = "in_review"
    APPROVED = "approved"
    PUBLISHED = "published"
    ARCHIVED = "archived"


class ApprovalCapability(StrEnum):
    """Approval capabilities from D-033. These are not auth roles."""

    CLINICAL = "clinical"
    LEGAL = "legal"
    BUSINESS = "business"


class InvalidRevisionTransitionError(ValueError):
    """Raised before an invalid lifecycle mutation reaches persistence."""


class CannotDeleteRevisionError(ValueError):
    """Raised when a hard delete targets anything but a draft revision (D-045)."""


# D-029 lifecycle, including the documented returns to draft.
#
# Contract A.2 fixes what those returns mean for revision identity:
# `in_review -> draft` keeps the same working revision, while
# `approved -> draft` and `archived -> draft` issue a NEW draft revision and
# drop its approvals. Neither ever reopens an immutable revision for editing.
ALLOWED_TRANSITIONS: Mapping[RevisionStatus, frozenset[RevisionStatus]] = {
    RevisionStatus.DRAFT: frozenset({RevisionStatus.IN_REVIEW}),
    RevisionStatus.IN_REVIEW: frozenset({RevisionStatus.APPROVED, RevisionStatus.DRAFT}),
    RevisionStatus.APPROVED: frozenset({RevisionStatus.PUBLISHED, RevisionStatus.DRAFT}),
    RevisionStatus.PUBLISHED: frozenset({RevisionStatus.ARCHIVED}),
    RevisionStatus.ARCHIVED: frozenset({RevisionStatus.DRAFT}),
}

# Statuses whose `-> draft` transition issues a new revision instead of
# reopening the current one (contract A.2).
REISSUING_SOURCES: frozenset[RevisionStatus] = frozenset(
    {RevisionStatus.APPROVED, RevisionStatus.ARCHIVED}
)


def can_transition(current: RevisionStatus, target: RevisionStatus) -> bool:
    return target in ALLOWED_TRANSITIONS[current]


def require_transition(current: RevisionStatus, target: RevisionStatus) -> None:
    if not can_transition(current, target):
        raise InvalidRevisionTransitionError(
            f"Cannot transition revision from {current} to {target}"
        )


def reissues_revision(current: RevisionStatus, target: RevisionStatus) -> bool:
    """Whether this transition must create a new revision rather than mutate."""
    return target is RevisionStatus.DRAFT and current in REISSUING_SOURCES


def can_delete(status: RevisionStatus) -> bool:
    """Hard delete is allowed only for drafts (D-045 / contract A.1)."""
    return status is RevisionStatus.DRAFT


def require_deletable(status: RevisionStatus) -> None:
    if not can_delete(status):
        raise CannotDeleteRevisionError(
            f"Cannot hard-delete a {status} revision; only drafts may be deleted. "
            "Published and archived revisions can only be archived or withdrawn."
        )
