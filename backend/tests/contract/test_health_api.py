import httpx
import pytest

from psihointegritet.main import create_app


@pytest.fixture
def api_client() -> httpx.AsyncClient:
    transport = httpx.ASGITransport(app=create_app())
    return httpx.AsyncClient(transport=transport, base_url="http://test")


async def test_root_health_returns_ok(api_client: httpx.AsyncClient) -> None:
    async with api_client as client:
        response = await client.get("/health")

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ok"


async def test_api_v1_health_returns_ok_with_correlation_header(
    api_client: httpx.AsyncClient,
) -> None:
    async with api_client as client:
        response = await client.get("/api/v1/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok", "version": "0.1.0"}
    assert response.headers.get("X-Correlation-ID")


async def test_unknown_route_returns_problem_envelope(
    api_client: httpx.AsyncClient,
) -> None:
    async with api_client as client:
        response = await client.get("/does-not-exist")

    assert response.status_code == 404
    assert response.headers["content-type"] == "application/problem+json"
    body = response.json()
    assert body["code"] == "http_error"
    assert body["correlationId"]
