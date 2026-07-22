import httpx
from pydantic_settings import SettingsConfigDict

from psihointegritet.core.config import Settings
from psihointegritet.main import create_app


class IsolatedSettings(Settings):
    model_config = SettingsConfigDict(env_file=None, extra="ignore")


async def _get_capabilities(settings: IsolatedSettings) -> httpx.Response:
    transport = httpx.ASGITransport(app=create_app(settings))
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        return await client.get("/api/v1/public/intake/capabilities")


async def test_sensitive_capability_stays_off_without_document_versions() -> None:
    response = await _get_capabilities(
        IsolatedSettings(
            intake_matching_enabled=True,
            intake_sensitive_submission_enabled=True,
        )
    )

    assert response.status_code == 200
    assert response.json() == {
        "matchingEnabled": True,
        "sensitiveSubmissionEnabled": False,
    }


async def test_sensitive_capability_requires_flag_and_both_document_versions() -> None:
    response = await _get_capabilities(
        IsolatedSettings(
            intake_matching_enabled=True,
            intake_sensitive_submission_enabled=True,
            intake_data_processing_notice_version="notice-v1",
            intake_request_acknowledgement_version="request-v1",
        )
    )

    assert response.status_code == 200
    assert response.json() == {
        "matchingEnabled": True,
        "sensitiveSubmissionEnabled": True,
    }
