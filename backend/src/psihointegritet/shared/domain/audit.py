"""Central audit recorder (D-078).

Four append-only tables existed before this and none of them fit a settings
change: three are keyed to a content revision with a from/to status and carry no
organization, and the fourth is Intake-specific. So an organization admin could
watch their language change with no trace of who did it.

This is the recorder those tables should eventually share, introduced with its
first caller rather than as an empty abstraction. The next module that needs an
audit trail extends `OrganizationEventType` and calls `record_organization_event`
instead of creating a sixth table.
"""

from enum import StrEnum
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from psihointegritet.modules.guidance.authorization import StaffActor
from psihointegritet.modules.organizations.models import OrganizationAuditEvent


class ActorKind(StrEnum):
    """In what capacity the change was made.

    Load-bearing, not descriptive. This is the only field that separates "the
    platform intervened" from "someone on my team changed it" — which is the
    question D-078 exists to answer. A superadmin correcting an organization's
    settings and that organization's own admin doing the same thing produce
    otherwise identical rows.
    """

    #: A platform superadmin acting from outside the organization.
    OPERATOR = "operator"
    #: Someone who belongs to the organization.
    MEMBER = "member"


class OrganizationEventType(StrEnum):
    LOCALES_CHANGED = "organization.locales_changed"


def actor_kind_for(actor: StaffActor, organization_id: UUID) -> ActorKind:
    """Operator when a superadmin reaches outside their own organization.

    A superadmin acting inside the organization they belong to is a member —
    the elevated flag does not change whose team they are on, and labelling
    their everyday work as platform intervention would make the distinction
    useless exactly where it matters.
    """
    if actor.is_superadmin and actor.organization_id != organization_id:
        return ActorKind.OPERATOR
    return ActorKind.MEMBER


async def record_organization_event(
    session: AsyncSession,
    *,
    actor: StaffActor,
    organization_id: UUID,
    event_type: OrganizationEventType,
    details: dict[str, object],
) -> OrganizationAuditEvent:
    """Append one immutable record. Never call with clinical or free client text."""
    event = OrganizationAuditEvent(
        organization_id=organization_id,
        actor_user_id=actor.user_id,
        actor_kind=actor_kind_for(actor, organization_id).value,
        event_type=event_type.value,
        details=details,
    )
    session.add(event)
    await session.flush()
    return event
