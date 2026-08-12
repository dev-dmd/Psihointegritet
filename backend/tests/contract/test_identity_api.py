"""Identity route contract: deployment must never silently omit M2.1 endpoints."""

import httpx

from psihointegritet.main import create_app


def test_identity_routes_are_registered_in_openapi() -> None:
    paths = create_app().openapi()["paths"]

    assert "/api/v1/me" in paths
    assert "/api/v1/superadmin/organizations/{organization_slug}/users" in paths
    assert (
        "/api/v1/superadmin/organizations/{organization_slug}/users/{user_id}/roles"
        in paths
    )


async def test_me_is_a_real_protected_route_not_a_404() -> None:
    transport = httpx.ASGITransport(app=create_app())
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/api/v1/me")

    assert response.status_code == 401
    assert response.json()["title"] == "Bearer token is required"
