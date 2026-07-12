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


def test_cors_origins_accept_explicit_allowlist() -> None:
    settings = IsolatedSettings(cors_origins=["https://psihointegritet.rs"])

    assert settings.cors_origins == ["https://psihointegritet.rs"]
