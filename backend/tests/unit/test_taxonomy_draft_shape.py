from typing import cast
from uuid import uuid4

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from psihointegritet.modules.content.taxonomy_models import (
    TaxonomyAxis,
    TaxonomyTerm,
    TaxonomyTermRevision,
)
from psihointegritet.modules.content.taxonomy_service import (
    TaxonomyService,
    TaxonomyValidationError,
)
from psihointegritet.modules.guidance.authorization import StaffActor
from psihointegritet.modules.identity.models import MembershipRole
from psihointegritet.shared.domain.publication import RevisionStatus


def actor() -> StaffActor:
    return StaffActor(
        user_id=uuid4(),
        organization_id=uuid4(),
        roles=frozenset({MembershipRole.ORG_ADMIN}),
    )


def incomplete_topic(staff: StaffActor) -> tuple[TaxonomyTerm, TaxonomyTermRevision]:
    term_id = uuid4()
    term = TaxonomyTerm(
        id=term_id,
        organization_id=staff.organization_id,
        axis=TaxonomyAxis.TOPIC,
        stable_id="nova-tema",
        system_defined=False,
        created_by_user_id=staff.user_id,
    )
    revision = TaxonomyTermRevision(
        id=uuid4(),
        term_id=term_id,
        organization_id=staff.organization_id,
        version_label="v1",
        locale="sr-Latn",
        public_label="Nova tema",
        primary_parent_term_id=None,
        journey_intent_term_id=None,
        status=RevisionStatus.DRAFT,
    )
    return term, revision


async def test_incomplete_topic_context_is_allowed_only_for_working_draft_validation() -> None:
    staff = actor()
    term, revision = incomplete_topic(staff)
    service = TaxonomyService(cast(AsyncSession, object()))

    await service._validate_shape(  # pyright: ignore[reportPrivateUsage]
        staff,
        term,
        revision,
        [],
        None,
        allow_incomplete_topic_context=True,
    )

    with pytest.raises(TaxonomyValidationError) as error:
        await service._validate_shape(  # pyright: ignore[reportPrivateUsage]
            staff,
            term,
            revision,
            [],
            None,
        )

    assert error.value.code == "TAX-HIER-001"
    assert error.value.field_path == "primaryParentTermId"
