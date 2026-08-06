from uuid import uuid4

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from psihointegritet.modules.compass.schemas import CompassFlowDefinition
from psihointegritet.modules.compass.service import CompassFlowError, CompassFlowService
from psihointegritet.modules.content.models import ReviewOutcome
from psihointegritet.modules.guidance.authorization import StaffActor
from psihointegritet.modules.identity.models import InternalUser, MembershipRole
from psihointegritet.modules.organizations.models import Organization
from psihointegritet.shared.domain.publication import ApprovalCapability, RevisionStatus


def definition() -> CompassFlowDefinition:
    return CompassFlowDefinition.model_validate(
        {
            "schemaVersion": 1,
            "entryQuestionId": "start",
            "questions": [
                {
                    "questionId": "start",
                    "prompt": "Da li želite da nastavite?",
                    "selectionTarget": "none",
                    "inputMode": "single_select",
                    "optionSource": "static",
                    "staticOptions": [{"optionId": "yes", "label": "Da", "terminal": "results"}],
                    "terminal": "results",
                }
            ],
            "resultSections": [
                {
                    "sectionId": "professional-support",
                    "title": "Stručna podrška",
                    "locked": True,
                    "emptyBehavior": "show",
                }
            ],
        }
    )


async def test_flow_review_publish_and_public_boundary(db_session: AsyncSession) -> None:
    suffix = uuid4().hex[:10]
    organization = Organization(slug=f"flow-{suffix}", display_name="Flow test")
    user = InternalUser(external_auth_id=f"flow-user-{suffix}")
    db_session.add_all([organization, user])
    await db_session.flush()
    actor = StaffActor(
        user_id=user.id,
        organization_id=organization.id,
        roles=frozenset({MembershipRole.ORG_ADMIN}),
    )
    service = CompassFlowService(db_session)
    created = await service.create(actor, "main-kompas", "sr-Latn", definition())

    with pytest.raises(CompassFlowError, match="Objavljeni"):
        await service.public(organization.id, "main-kompas", "sr-Latn")

    in_review = await service.transition(
        actor,
        created.flow_id,
        created.version_id,
        created.lock_version,
        RevisionStatus.IN_REVIEW,
    )
    for capability in (ApprovalCapability.CLINICAL, ApprovalCapability.BUSINESS):
        await service.review(
            actor,
            created.flow_id,
            created.version_id,
            capability,
            ReviewOutcome.APPROVED,
            None,
        )
    approved = await service.transition(
        actor,
        created.flow_id,
        created.version_id,
        in_review.lock_version,
        RevisionStatus.APPROVED,
    )
    published = await service.transition(
        actor,
        created.flow_id,
        created.version_id,
        approved.lock_version,
        RevisionStatus.PUBLISHED,
    )

    public = await service.public(organization.id, "main-kompas", "sr-Latn")
    assert public.version_id == published.version_id
    assert public.status is RevisionStatus.PUBLISHED
