from enum import StrEnum
from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Environment(StrEnum):
    DEVELOPMENT = "development"
    STAGING = "staging"
    PRODUCTION = "production"


class Settings(BaseSettings):
    """Validated application environment. Fails fast at startup."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    environment: Environment = Environment.DEVELOPMENT
    api_host: str = "0.0.0.0"  # noqa: S104 — bound inside container/local dev only
    api_port: int = 8001

    database_url: str = Field(
        default="postgresql+asyncpg://psihointegritet:local_only_change_me@localhost:5434/psihointegritet",
    )
    migration_database_url: str = Field(
        default="postgresql+psycopg://psihointegritet:local_only_change_me@localhost:5434/psihointegritet",
    )
    redis_url: str = "redis://localhost:6381/0"

    cors_origins: list[str] = Field(default_factory=lambda: ["http://localhost:3007"])

    clerk_issuer: str = ""
    clerk_jwks_url: str = ""
    clerk_audience: str = ""

    default_organization_slug: str = "psihointegritet"
    intake_matching_enabled: bool = False
    intake_sensitive_submission_enabled: bool = False
    intake_team_queue_enabled: bool = False
    intake_ai_assist_enabled: bool = False
    intake_data_processing_notice_version: str = ""
    intake_request_acknowledgement_version: str = ""
    intake_anonymous_retention_hours: int = Field(default=24, ge=1, le=168)
    intake_submitted_retention_days: int = Field(default=90, ge=1, le=3650)
    intake_closed_retention_days: int = Field(default=30, ge=1, le=3650)
    intake_free_text_retention_days: int = Field(default=30, ge=1, le=3650)
    intake_review_target_business_hours: int = Field(default=12, ge=1, le=168)
    intake_review_public_max_business_days: int = Field(default=1, ge=1, le=30)
    intake_business_timezone: str = "Europe/Belgrade"

    @property
    def is_production(self) -> bool:
        return self.environment is Environment.PRODUCTION

    @property
    def intake_submission_ready(self) -> bool:
        """Sensitive Intake writes require both the flag and approved text versions."""

        return (
            self.intake_matching_enabled
            and self.intake_sensitive_submission_enabled
            and bool(self.intake_data_processing_notice_version)
            and bool(self.intake_request_acknowledgement_version)
        )


@lru_cache
def get_settings() -> Settings:
    return Settings()
