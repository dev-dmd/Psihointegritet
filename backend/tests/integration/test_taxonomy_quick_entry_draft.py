from uuid import uuid4

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from psihointegritet.modules.content.taxonomy_models import TaxonomyAxis
from psihointegritet.modules.content.taxonomy_schemas import (
    CreateTaxonomyTermRequest,
    TaxonomyTransitionRequest,
    UpdateTaxonomyRevisionRequest,
)
from psihointegritet.modules.content.taxonomy_service import (
    TaxonomyService,
    TaxonomyValidationError,
)
from psihointegritet.modules.guidance.authorization import StaffActor
from psihointegritet.modules.identity.models import InternalUser, MembershipRole
from psihointegritet.modules.organizations.models import Organization
from psihointegritet.shared.domain.publication import RevisionStatus


async def test_quick_entry_may_save_an_incomplete_topic_draft_but_not_submit_it(
    db_session: AsyncSession,
) -> None:
    unique = uuid4().hex[:10]
    organization = Organization(slug=f"quick-entry-{unique}", display_name="Brzi unos")
    user = InternalUser(external_auth_id=f"quick-entry-user-{unique}")
    db_session.add_all([organization, user])
    await db_session.flush()
    actor = StaffActor(
        user_id=user.id,
        organization_id=organization.id,
        roles=frozenset({MembershipRole.ORG_ADMIN}),
    )
    service = TaxonomyService(db_session)

    created = await service.create_term(
        actor,
        CreateTaxonomyTermRequest(
            axis=TaxonomyAxis.TOPIC,
            stable_id="nova-tema",
            public_label="Nova tema",
            primary_parent_term_id=None,
            journey_intent_term_id=None,
        ),
    )

    assert created.status is RevisionStatus.DRAFT
    assert created.primary_parent_term_id is None
    assert created.journey_intent_term_id is None

    updated = await service.update_revision(
        actor,
        created.term_id,
        created.revision_id,
        UpdateTaxonomyRevisionRequest(
            lock_version=created.lock_version,
            primary_parent_term_id=None,
            journey_intent_term_id=None,
        ),
    )
    assert updated.status is RevisionStatus.DRAFT
    assert updated.primary_parent_term_id is None
    assert updated.journey_intent_term_id is None

    with pytest.raises(TaxonomyValidationError) as error:
        await service.transition(
            actor,
            updated.term_id,
            updated.revision_id,
            TaxonomyTransitionRequest(
                target=RevisionStatus.IN_REVIEW,
                lock_version=updated.lock_version,
            ),
        )

    assert error.value.code == "TAX-HIER-001"
    assert error.value.field_path == "primaryParentTermId"
