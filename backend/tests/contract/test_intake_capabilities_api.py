import httpx
from pydantic_settings import SettingsConfigDict

from psihointegritet.core.config import Environment, Settings
from psihointegritet.main import create_app


class IsolatedSettings(Settings):
    model_config = SettingsConfigDict(env_file=None, extra="ignore")


async def _get_capabilities(settings: IsolatedSettings) -> httpx.Response:
    # `httpx.ASGITransport` does not run FastAPI's startup/shutdown events on
    # its own (unlike `starlette.testclient.TestClient`) — LD-6 made this
    # endpoint DB-backed, so `app.state.session_factory` now has to exist
    # before the request, which only the lifespan context manager sets up.
    app = create_app(settings)
    transport = httpx.ASGITransport(app=app)
    async with (
        app.router.lifespan_context(app),
        httpx.AsyncClient(transport=transport, base_url="http://test") as client,
    ):
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
        "dataProcessingNoticeVersion": None,
        "requestAcknowledgementVersion": None,
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
        "dataProcessingNoticeVersion": "notice-v1",
        "requestAcknowledgementVersion": "request-v1",
    }


async def test_env_versions_never_override_the_registry_outside_development() -> None:
    response = await _get_capabilities(
        IsolatedSettings(
            environment=Environment.STAGING,
            intake_matching_enabled=True,
            intake_sensitive_submission_enabled=True,
            intake_data_processing_notice_version="notice-v1",
            intake_request_acknowledgement_version="request-v1",
        )
    )

    assert response.status_code == 200
    assert response.json() == {
        "matchingEnabled": True,
        "sensitiveSubmissionEnabled": False,
        "dataProcessingNoticeVersion": None,
        "requestAcknowledgementVersion": None,
    }
