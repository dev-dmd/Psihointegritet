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

    @property
    def is_production(self) -> bool:
        return self.environment is Environment.PRODUCTION


@lru_cache
def get_settings() -> Settings:
    return Settings()
