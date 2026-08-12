"""CG-B1 model guards.

These run without a database: they assert the governed vocabulary and the
table invariants that must survive concurrency, both of which are cheap to
break silently during later slices.
"""

from typing import cast

import pytest
from sqlalchemy import Enum as SaEnum
from sqlalchemy import Index, Table, UniqueConstraint

from psihointegritet.db.base import Base
from psihointegritet.modules.content.models import (
    ContentEntry,
    ContentPublicationEvent,
    ContentReviewDecision,
    ContentRevision,
    ContentTemplate,
    ContentType,
    ReviewOutcome,
)
from psihointegritet.modules.content.system_catalog import SYSTEM_CONTENT_TEMPLATES
from psihointegritet.modules.privacy import models as privacy_models
from psihointegritet.modules.privacy.models import (
    LegalDocument,
    LegalDocumentEvent,
    LegalDocumentRevision,
)
from psihointegritet.shared.domain.publication import (
    ApprovalCapability,
    RevisionStatus,
    can_delete,
    can_transition,
    reissues_revision,
)

# Mirrors frontend/src/lib/content-governance/types.ts. A change on either
# side must be a deliberate product decision, not a silent drift.
GOVERNED_CONTENT_TYPES = {
    "static_page",
    "service",
    "therapist",
    "program",
    "company_plan",
    "package_offer",
    "article",
}

GOVERNED_TEMPLATES = {
    "service_detail",
    "therapist_profile",
    "support_area",
    "audience_page",
    "program_detail",
    "company_page",
    "pricing_page",
    "static_information",
    "legal_page",
    "article_detail",
}


def table_of(model: type[Base]) -> Table:
    """Declarative `__table__` is a `Table` at runtime; the stub widens it."""
    return cast(Table, model.__table__)


def unique_constraint(model: type[Base], name: str) -> UniqueConstraint:
    for constraint in table_of(model).constraints:
        if isinstance(constraint, UniqueConstraint) and constraint.name == name:
            return constraint
    raise AssertionError(f"{model.__name__} has no unique constraint named {name}")


def column_names(model: type[Base]) -> set[str]:
    return {column.name for column in table_of(model).columns}


def index_of(model: type[Base], name: str) -> Index:
    for index in table_of(model).indexes:
        if index.name == name:
            return index
    raise AssertionError(f"{model.__name__} has no index named {name}")


def test_content_types_match_the_governed_registry() -> None:
    assert {content_type.value for content_type in ContentType} == GOVERNED_CONTENT_TYPES


def test_article_is_a_governed_content_type_since_adr_019() -> None:
    # Inverted, not deleted: this test guarded the ADR-019 precondition while the
    # knowledge library was still closed (ADR-016). It now guards the boundary
    # that replaced it — an article is governed content, but it never becomes a
    # *system* identity, because that allowlist is a closed set of known pages.
    assert "article" in {content_type.value for content_type in ContentType}
    assert not any(key[0] is ContentType.ARTICLE for key in SYSTEM_CONTENT_TEMPLATES)


def test_templates_match_the_frontend_registry() -> None:
    assert {template.value for template in ContentTemplate} == GOVERNED_TEMPLATES


def test_review_outcome_has_no_pending_value() -> None:
    # Pending is the absence of a decision row, never a stored outcome.
    assert {outcome.value for outcome in ReviewOutcome} == {"approved", "rejected"}


def test_lifecycle_is_shared_with_the_legal_registry() -> None:
    # One definition, not a copy: the same enum objects back both modules.
    assert privacy_models.RevisionStatus is RevisionStatus
    assert privacy_models.ApprovalCapability is ApprovalCapability


def test_only_one_revision_per_entry_may_be_published() -> None:
    published = index_of(ContentRevision, "uq_content_revision_published")

    assert published.unique is True
    assert [column.name for column in published.columns] == ["entry_id"]
    where = published.dialect_options["postgresql"]["where"]
    assert "published" in str(where)


def test_entry_slug_is_unique_per_tenant_type_and_locale() -> None:
    slug_constraint = unique_constraint(ContentEntry, "uq_content_entry_slug")

    assert [column.name for column in slug_constraint.columns] == [
        "organization_id",
        "content_type",
        "locale",
        "slug",
    ]


def test_one_decision_per_capability_per_revision() -> None:
    capability_constraint = unique_constraint(ContentReviewDecision, "uq_content_review_capability")

    assert [column.name for column in capability_constraint.columns] == [
        "revision_id",
        "capability",
    ]


def test_review_decisions_bind_to_a_revision_not_an_entry() -> None:
    # Contract A.2: a reissued revision starts with no approvals.
    columns = column_names(ContentReviewDecision)
    assert "revision_id" in columns
    assert "entry_id" not in columns


def test_revision_carries_optimistic_locking_and_audit_columns() -> None:
    assert {
        "lock_version",
        "created_by_user_id",
        "updated_by_user_id",
        "published_at",
        "archived_at",
        "validation_snapshot",
    } <= column_names(ContentRevision)


def test_publication_events_record_both_sides_of_a_status_change() -> None:
    assert {"from_status", "to_status", "actor_user_id", "reason"} <= column_names(
        ContentPublicationEvent
    )


def test_shared_lifecycle_rules_apply_to_content_revisions() -> None:
    assert can_transition(RevisionStatus.APPROVED, RevisionStatus.PUBLISHED) is True
    assert can_transition(RevisionStatus.PUBLISHED, RevisionStatus.DRAFT) is False
    assert can_delete(RevisionStatus.PUBLISHED) is False
    assert can_delete(RevisionStatus.DRAFT) is True


def test_only_approved_and_archived_returns_reissue_a_revision() -> None:
    assert reissues_revision(RevisionStatus.APPROVED, RevisionStatus.DRAFT) is True
    assert reissues_revision(RevisionStatus.ARCHIVED, RevisionStatus.DRAFT) is True
    assert reissues_revision(RevisionStatus.IN_REVIEW, RevisionStatus.DRAFT) is False
    assert reissues_revision(RevisionStatus.APPROVED, RevisionStatus.PUBLISHED) is False


def enum_column_values(model: type[Base], column: str) -> list[str]:
    column_type = table_of(model).columns[column].type
    assert isinstance(column_type, SaEnum)
    return list(column_type.enums)


@pytest.mark.parametrize(
    ("model", "column"),
    [
        (ContentEntry, "content_type"),
        (ContentRevision, "template"),
        (ContentRevision, "status"),
        (ContentReviewDecision, "capability"),
        (ContentReviewDecision, "outcome"),
        (ContentPublicationEvent, "to_status"),
        (LegalDocument, "kind"),
        (LegalDocumentRevision, "status"),
        (LegalDocumentEvent, "to_status"),
    ],
)
def test_enum_columns_persist_values_not_member_names(model: type[Base], column: str) -> None:
    """Guards the defect that made a partial unique index inert.

    SQLAlchemy stores `.name` unless told otherwise, so a status landed as
    `PUBLISHED` while `WHERE status = 'published'` never matched a row — the
    "one published revision" guarantee existed on paper only. Every enum column
    must persist lowercase values, matching the index predicates, the server
    defaults and the JSON contract.
    """
    values = enum_column_values(model, column)
    assert values == [value.lower() for value in values], (
        f"{model.__name__}.{column} would persist member names, not values"
    )


def test_published_index_predicate_matches_the_stored_status_value() -> None:
    predicate = str(
        index_of(ContentRevision, "uq_content_revision_published").dialect_options["postgresql"][
            "where"
        ]
    )
    assert RevisionStatus.PUBLISHED.value in predicate
    assert enum_column_values(ContentRevision, "status") == [
        status.value for status in RevisionStatus
    ]
