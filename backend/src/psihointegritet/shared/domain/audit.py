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

from dataclasses import dataclass
from enum import StrEnum
from typing import Final
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
    #: A controlled platform process with no human actor — organization
    #: bootstrap being the first. This is an extension of D-078 to non-human
    #: actions, not an exemption from it: the alternative was letting tenant
    #: creation, the largest event the platform has, leave no record at all.
    SYSTEM = "system"


class OrganizationEventType(StrEnum):
    LOCALES_CHANGED = "organization.locales_changed"
    ORGANIZATION_CREATED = "organization.created"


@dataclass(frozen=True)
class AuditActor:
    """Who to attribute a record to, independent of how they were authorized.

    The recorder took a `StaffActor` before this existed, which made it
    unreachable from anything without a signed-in person — provisioning
    included. Widening the contract is better than the alternative that was
    available: fabricating a `StaffActor` with a null user id purely to satisfy
    a signature would put a fake human in the audit trail, which is worse than
    no trail at all because it reads as real.
    """

    kind: ActorKind
    #: `None` only for `SYSTEM`. Every human actor carries their own id, so a
    #: record still says who acted even after they leave.
    user_id: UUID | None


def staff_audit_actor(actor: StaffActor, organization_id: UUID) -> AuditActor:
    """Attribution for a signed-in person, in the capacity they were acting."""
    return AuditActor(kind=actor_kind_for(actor, organization_id), user_id=actor.user_id)


#: Attribution for platform processes: bootstrap commands and anything else
#: that runs without a person behind it.
SYSTEM_AUDIT_ACTOR: Final = AuditActor(kind=ActorKind.SYSTEM, user_id=None)


def actor_kind_for(actor: StaffActor, organization_id: UUID) -> ActorKind:
    """Operator when a superadmin reaches outside their own organization.

    A superadmin acting inside the organization they belong to is a member —
    the elevated flag does not change whose team they are on, and labelling
    their everyday work as platform intervention would make the distinction
    useless exactly where it matters.

    Kept separate from `staff_audit_actor` because the answer is also an
    authorization input: `organizations/service.py` refuses an operator without
    a stated reason before any record is written.
    """
    if actor.is_superadmin and actor.organization_id != organization_id:
        return ActorKind.OPERATOR
    return ActorKind.MEMBER


async def record_organization_event(
    session: AsyncSession,
    *,
    actor: AuditActor,
    organization_id: UUID,
    event_type: OrganizationEventType,
    details: dict[str, object],
) -> OrganizationAuditEvent:
    """Append one immutable record. Never call with clinical or free client text."""
    event = OrganizationAuditEvent(
        organization_id=organization_id,
        actor_user_id=actor.user_id,
        actor_kind=actor.kind.value,
        event_type=event_type.value,
        details=details,
    )
    session.add(event)
    await session.flush()
    return event
