"""Research module — two generic tables for every survey the site runs.

One row in `research_surveys` is one *version* of one survey; every answer
lands in `research_submissions` regardless of which survey produced it. Adding
a survey is therefore a data operation, not a migration.

**Privacy is a schema property here, not a convention.** There is deliberately
no `user_id`, no email, no IP address, no Kompas selection and no
recommendation result on `ResearchSubmission`. A submission cannot be tied back
to a person because the columns that would allow it do not exist — the same
reasoning `intake_free_texts` applies to sensitive text.
"""

from datetime import UTC, datetime
from enum import StrEnum
from uuid import UUID, uuid4

from sqlalchemy import (
    JSON,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    String,
    UniqueConstraint,
    Uuid,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column

from psihointegritet.db.base import Base
from psihointegritet.shared.types.sa_enum import value_enum

__all__ = [
    "ResearchSubmission",
    "ResearchSubmissionSurface",
    "ResearchSubmissionTrigger",
    "ResearchSurvey",
    "ResearchSurveyStatus",
]


class ResearchSurveyStatus(StrEnum):
    DRAFT = "draft"
    PUBLISHED = "published"
    ARCHIVED = "archived"


class ResearchSubmissionSurface(StrEnum):
    """Where the drawer was rendered — not who rendered it."""

    RESEARCH_DRAWER = "research-drawer"
    COMPASS_FEEDBACK = "compass-feedback"


class ResearchSubmissionTrigger(StrEnum):
    """What opened the drawer. Coarse by design; never a session identifier."""

    MANUAL = "manual"
    AFTER_RESULTS = "after-results"
    FINISH = "finish"


class ResearchSurvey(Base):
    """One published version of one survey.

    `stable_id` names the survey (`online-experience`, `compass-experience`)
    and `version` numbers its question set. Keeping the version out of the
    stable id is what lets a panel tab group every version of a survey while
    still reporting per-version results.
    """

    __tablename__ = "research_surveys"
    __table_args__ = (
        UniqueConstraint(
            "organization_id",
            "stable_id",
            "version",
            name="uq_research_surveys_identity",
        ),
        Index("ix_research_surveys_lookup", "organization_id", "stable_id"),
    )

    id: Mapped[UUID] = mapped_column(Uuid, primary_key=True, default=uuid4)
    organization_id: Mapped[UUID] = mapped_column(
        Uuid, ForeignKey("organizations.id", ondelete="CASCADE"), index=True
    )
    stable_id: Mapped[str] = mapped_column(String(80))
    version: Mapped[int] = mapped_column(Integer, default=1)
    title: Mapped[str] = mapped_column(String(200))
    question_schema: Mapped[dict[str, object]] = mapped_column(JSON)
    status: Mapped[ResearchSurveyStatus] = mapped_column(
        value_enum(ResearchSurveyStatus, length=20),
        default=ResearchSurveyStatus.DRAFT,
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    published_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), default=None)

    def mark_published(self) -> None:
        """Sets status and stamp together so a published row always has both."""
        self.status = ResearchSurveyStatus.PUBLISHED
        self.published_at = datetime.now(UTC)


class ResearchSubmission(Base):
    """One anonymous submission against one survey version.

    `answers` stores stable identifiers, never rendered text:

        {"answers": [{"questionId": "...", "optionIds": ["..."]}]}

    Storing the label instead would make a published wording change silently
    rewrite history, and would put free-form strings in a table that must stay
    free of anything person-identifying.
    """

    __tablename__ = "research_submissions"
    __table_args__ = (
        Index(
            "ix_research_submissions_survey_time",
            "organization_id",
            "survey_id",
            "submitted_at",
        ),
    )

    id: Mapped[UUID] = mapped_column(Uuid, primary_key=True, default=uuid4)
    organization_id: Mapped[UUID] = mapped_column(
        Uuid, ForeignKey("organizations.id", ondelete="CASCADE"), index=True
    )
    survey_id: Mapped[UUID] = mapped_column(
        Uuid, ForeignKey("research_surveys.id", ondelete="RESTRICT"), index=True
    )
    answers: Mapped[dict[str, object]] = mapped_column(JSON)
    surface: Mapped[ResearchSubmissionSurface] = mapped_column(
        value_enum(ResearchSubmissionSurface, length=32)
    )
    trigger: Mapped[ResearchSubmissionTrigger] = mapped_column(
        value_enum(ResearchSubmissionTrigger, length=20)
    )
    locale: Mapped[str] = mapped_column(String(16), default="sr-Latn")
    submitted_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
