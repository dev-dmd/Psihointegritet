import pytest

from psihointegritet.modules.guidance.models import IntakeCaseStatus
from psihointegritet.modules.guidance.state_machine import (
    InvalidIntakeTransitionError,
    can_transition,
    require_transition,
)


def test_allowed_intake_lifecycle_transition() -> None:
    assert can_transition(IntakeCaseStatus.UNASSIGNED, IntakeCaseStatus.CLAIMED) is True
    require_transition(IntakeCaseStatus.CLAIMED, IntakeCaseStatus.BOOKING_STARTED)


def test_terminal_intake_case_cannot_return_to_queue() -> None:
    assert can_transition(IntakeCaseStatus.CLOSED, IntakeCaseStatus.UNASSIGNED) is False
    with pytest.raises(InvalidIntakeTransitionError):
        require_transition(IntakeCaseStatus.CLOSED, IntakeCaseStatus.UNASSIGNED)
