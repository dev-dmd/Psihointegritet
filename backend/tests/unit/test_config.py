from pydantic_settings import SettingsConfigDict

from psihointegritet.core.config import Environment, Settings


class IsolatedSettings(Settings):
    """Settings detached from any local .env file for deterministic tests."""

    model_config = SettingsConfigDict(env_file=None, extra="ignore")


def test_settings_defaults_are_development() -> None:
    settings = IsolatedSettings()

    assert settings.environment is Environment.DEVELOPMENT
    assert settings.is_production is False
    assert settings.cors_origins == ["http://localhost:3007"]
    assert settings.intake_review_target_business_hours == 12
    assert settings.intake_review_public_max_business_days == 1
    assert settings.intake_business_timezone == "Europe/Belgrade"


def test_cors_origins_accept_explicit_allowlist() -> None:
    settings = IsolatedSettings(cors_origins=["https://psihointegritet.rs"])

    assert settings.cors_origins == ["https://psihointegritet.rs"]


def test_sensitive_intake_needs_approved_text_versions() -> None:
    disabled = IsolatedSettings(intake_sensitive_submission_enabled=True)
    ready = IsolatedSettings(
        intake_matching_enabled=True,
        intake_sensitive_submission_enabled=True,
        intake_data_processing_notice_version="notice-v1",
        intake_request_acknowledgement_version="request-v1",
    )

    assert disabled.intake_submission_ready is False
    assert ready.intake_submission_ready is True
