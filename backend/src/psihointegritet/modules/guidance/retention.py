from dataclasses import dataclass
from datetime import UTC, datetime, timedelta

from psihointegritet.core.config import Settings


@dataclass(frozen=True, slots=True)
class IntakeRetentionPolicy:
    anonymous_guidance: timedelta
    submitted_case: timedelta
    closed_case: timedelta
    free_text: timedelta

    @classmethod
    def from_settings(cls, settings: Settings) -> IntakeRetentionPolicy:
        return cls(
            anonymous_guidance=timedelta(hours=settings.intake_anonymous_retention_hours),
            submitted_case=timedelta(days=settings.intake_submitted_retention_days),
            closed_case=timedelta(days=settings.intake_closed_retention_days),
            free_text=timedelta(days=settings.intake_free_text_retention_days),
        )

    def anonymous_expiry(self, now: datetime | None = None) -> datetime:
        return _now(now) + self.anonymous_guidance

    def submitted_case_expiry(self, now: datetime | None = None) -> datetime:
        return _now(now) + self.submitted_case

    def closed_case_expiry(self, now: datetime | None = None) -> datetime:
        return _now(now) + self.closed_case

    def free_text_expiry(self, now: datetime | None = None) -> datetime:
        return _now(now) + self.free_text


def _now(value: datetime | None) -> datetime:
    return value if value is not None else datetime.now(UTC)
