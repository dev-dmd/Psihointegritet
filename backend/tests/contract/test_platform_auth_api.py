"""The platform auth surface: registered, protected, and shaped as expected.

Route registration is worth asserting on its own. A deployment that silently
omitted these would present a login form posting into a 404, which reads to
everyone involved as "the password is wrong".
"""

import httpx

from psihointegritet.infrastructure.auth.unavailable import UnavailableTokenVerifier
from psihointegritet.main import create_app

BASE = "/api/v1/auth/platform"


def test_the_platform_auth_routes_are_registered() -> None:
    paths = create_app().openapi()["paths"]

    assert f"{BASE}/login" in paths
    assert f"{BASE}/register" in paths
    assert f"{BASE}/logout" in paths
    assert f"{BASE}/password/reset" in paths


def test_there_is_no_endpoint_that_hands_out_a_reset_token() -> None:
    """Issuing a reset link is only safe once something can deliver it.

    Until a mailer exists the token is issued by an operator script. A route
    that returned one — or logged it — would be a way to take over any account
    by naming its address, which is the opposite of what a reset is for.
    """
    paths = create_app().openapi()["paths"]

    assert f"{BASE}/password/forgot" not in paths
    assert f"{BASE}/password/request" not in paths


async def test_sign_out_refuses_an_unauthenticated_call() -> None:
    """A caller can only end its own session, and only by proving it holds one."""
    transport = httpx.ASGITransport(app=create_app())
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post(f"{BASE}/logout")

    assert response.status_code == 401


def test_an_app_that_never_started_admits_nobody() -> None:
    """`PdcSessionVerifier` is mounted in the lifespan, because it needs an engine.

    Before that runs the app still carries the verifier that refuses everything,
    so a request arriving early is a 401 rather than an `AttributeError` and a
    500 — fail closed, in the one window where the real verifier does not exist.
    """
    assert isinstance(create_app().state.token_verifier, UnavailableTokenVerifier)
