from psihointegritet.modules.guidance.models import ReviewPriority, SafetyCategory
from psihointegritet.modules.guidance.safety import assess_free_text


def test_explicit_immediate_danger_phrase_creates_bounded_priority_signal() -> None:
    assessment = assess_free_text("Trenutno sam u opasnosti i potrebna mi je pomoć.")

    assert assessment.category is SafetyCategory.IMMEDIATE_DANGER
    assert assessment.review_priority is ReviewPriority.PRIORITY
    assert assessment.requires_human_review is True


def test_unrelated_optional_note_does_not_create_a_safety_signal() -> None:
    assessment = assess_free_text("Voleo/la bih kraći razgovor sa timom.")

    assert assessment.category is None
    assert assessment.review_priority is ReviewPriority.STANDARD
    assert assessment.requires_human_review is False
