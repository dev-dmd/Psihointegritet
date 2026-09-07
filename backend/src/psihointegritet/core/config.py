from enum import StrEnum
from functools import lru_cache

from pydantic import Field, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Environment(StrEnum):
    DEVELOPMENT = "development"
    STAGING = "staging"
    PRODUCTION = "production"


#: The first tenant. Kept as a development convenience, never as a deployment
#: default — see `Settings._bind_deployment_tenant`.
FOUNDING_TENANT_SLUG = "psihointegritet"


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

    #: Which organization this deployment serves — the C2(a) deployment binding.
    #: Empty means "not stated"; `_bind_deployment_tenant` then either supplies
    #: the development convenience or refuses to start. It is never a tenant
    #: onboarding step: creating an organization is `provision_organization`.
    #:
    #: **Transitional (D-081).** One backend per tenant is a migration artifact,
    #: not the target: production becomes one API over one database where the
    #: tenant arrives per request as
    #: `organizationSlug -> organization_id -> scoped query`. `resolve_staff_actor`
    #: is already scoped to a concrete `organization.id`; the only thing wrong is
    #: that the organization comes from this setting instead of from the request.
    #: When that changes, this survives as a local-development convenience only.
    #: See `documentations/PDC_CONSOLIDATION_MIGRATION_PLAN_v1_0.md`.
    default_organization_slug: str = ""
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
    slot_hold_ttl_seconds: int = Field(default=600, ge=30, le=3600)

    @model_validator(mode="after")
    def _bind_deployment_tenant(self) -> Settings:
        """Refuse to start a deployed environment that has not named its tenant.

        This used to default to the founding tenant everywhere, on the reasoning
        that an absent value had one correct answer. That was true while one
        tenant existed. With a second, absent means someone forgot — and the
        default then answers every request for one organization out of another
        organization's deployment, with nothing raised to say so.

        Development keeps the convenience: a laptop with no `.env` should still
        run. A deployment calling itself staging or production must say who it
        serves.
        """
        if self.default_organization_slug.strip():
            return self
        if self.environment is Environment.DEVELOPMENT:
            self.default_organization_slug = FOUNDING_TENANT_SLUG
            return self
        raise ValueError(
            f"ENVIRONMENT is '{self.environment.value}' but DEFAULT_ORGANIZATION_SLUG is "
            f"not set. A deployed environment must name the organization it serves; "
            f"falling back to '{FOUNDING_TENANT_SLUG}' would serve one tenant out of "
            f"another tenant's deployment. Set DEFAULT_ORGANIZATION_SLUG."
        )

    @property
    def is_production(self) -> bool:
        return self.environment is Environment.PRODUCTION

    @property
    def superadmin_may_act_as_therapist(self) -> bool:
        """Whether a superadmin may edit a therapist's availability without being one.

        Deliberately an **allowlist**, not ``not is_production``: a new or
        misspelled environment must lose the privilege rather than silently
        inherit it. Adding a QA environment means adding it to this set and to
        ``Environment`` — one visible edit, not an accident.

        This is a convenience for building and testing schedules before the team
        has real accounts. It never applies in production, where a superadmin
        must go through the therapist registry like everyone else.
        """
        return self.environment in {Environment.DEVELOPMENT, Environment.STAGING}

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
