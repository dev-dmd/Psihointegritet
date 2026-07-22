"""Small deterministic safety signal used before any future AI assistance."""

from dataclasses import dataclass

from psihointegritet.modules.guidance.models import ReviewPriority, SafetyCategory

SAFETY_RULE_VERSION = "safety-keywords-v1"

# This is deliberately a narrow, transparent protective trigger. It does not
# diagnose, infer risk from a person, or replace a human safety assessment.
IMMEDIATE_DANGER_PHRASES = (
    "zelim da se ubijem",
    "želim da se ubijem",
    "hocu da se ubijem",
    "hoću da se ubijem",
    "planiram da se ubijem",
    "samoubistv",
    "samoubojstv",
    "povredim sebe",
    "povrijedim sebe",
    "samopovred",
    "samopovređ",
    "trenutno sam u opasnosti",
    "u neposrednoj sam opasnosti",
)


@dataclass(frozen=True, slots=True)
class SafetyAssessment:
    category: SafetyCategory | None
    review_priority: ReviewPriority

    @property
    def requires_human_review(self) -> bool:
        return self.category is not None


def assess_free_text(value: str | None) -> SafetyAssessment:
    """Return only a bounded category; never retain or emit the matched text."""

    normalized = _normalize(value)
    if normalized and any(phrase in normalized for phrase in IMMEDIATE_DANGER_PHRASES):
        return SafetyAssessment(
            category=SafetyCategory.IMMEDIATE_DANGER,
            review_priority=ReviewPriority.PRIORITY,
        )
    return SafetyAssessment(category=None, review_priority=ReviewPriority.STANDARD)


def _normalize(value: str | None) -> str:
    return " ".join((value or "").casefold().split())
