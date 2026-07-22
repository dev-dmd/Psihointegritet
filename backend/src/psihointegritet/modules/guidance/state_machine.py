from collections.abc import Mapping

from psihointegritet.modules.guidance.models import IntakeCaseStatus


class InvalidIntakeTransitionError(ValueError):
    """Raised before an invalid lifecycle mutation reaches persistence."""


ALLOWED_TRANSITIONS: Mapping[IntakeCaseStatus, frozenset[IntakeCaseStatus]] = {
    IntakeCaseStatus.UNASSIGNED: frozenset(
        {
            IntakeCaseStatus.CLAIMED,
            IntakeCaseStatus.CLOSED,
            IntakeCaseStatus.WITHDRAWN,
            IntakeCaseStatus.EXPIRED,
        }
    ),
    IntakeCaseStatus.CLAIMED: frozenset(
        {
            IntakeCaseStatus.BOOKING_STARTED,
            IntakeCaseStatus.CLOSED,
            IntakeCaseStatus.WITHDRAWN,
            IntakeCaseStatus.EXPIRED,
        }
    ),
    IntakeCaseStatus.BOOKING_STARTED: frozenset(
        {
            IntakeCaseStatus.CONVERTED,
            IntakeCaseStatus.CLOSED,
            IntakeCaseStatus.WITHDRAWN,
            IntakeCaseStatus.EXPIRED,
        }
    ),
    IntakeCaseStatus.CONVERTED: frozenset({IntakeCaseStatus.CLOSED}),
    IntakeCaseStatus.CLOSED: frozenset(),
    IntakeCaseStatus.WITHDRAWN: frozenset(),
    IntakeCaseStatus.EXPIRED: frozenset(),
}


def can_transition(current: IntakeCaseStatus, target: IntakeCaseStatus) -> bool:
    return target in ALLOWED_TRANSITIONS[current]


def require_transition(current: IntakeCaseStatus, target: IntakeCaseStatus) -> None:
    if not can_transition(current, target):
        raise InvalidIntakeTransitionError(
            f"Cannot transition IntakeCase from {current} to {target}"
        )
