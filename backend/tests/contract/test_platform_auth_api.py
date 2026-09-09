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
    assert f"{BASE}/password/forgot" in paths
    assert f"{BASE}/email/verify/resend" in paths


def test_no_endpoint_can_hand_a_one_time_token_back_to_its_caller() -> None:
    """The rule that outlived the reason it was first written down.

    This used to assert that `/password/forgot` did not exist at all, because
    nothing could deliver a link and a route returning one would be a way to
    take over any account by naming its address. There is a mailer now, so the
    route exists — but the property it was protecting has not changed: a link is
    a credential, it goes to the mailbox and nowhere else, and the caller learns
    nothing.

    Asserted against the schema rather than a live response so it fails when
    somebody *declares* a body, which is the moment the mistake is cheap.
    """
    paths = create_app().openapi()["paths"]

    for path in (f"{BASE}/password/forgot", f"{BASE}/email/verify/resend"):
        responses = paths[path]["post"]["responses"]
        assert "204" in responses, f"{path} must answer 204"
        assert "200" not in responses, f"{path} must not answer with a body"
        # 204 is the only *outcome*. A 404 for an unknown address would answer
        # "does this person have an account" as loudly as a body would, so no
        # status may depend on what was found. 422 is exempt and only 422: it
        # is FastAPI's answer to a malformed body, decided before anything is
        # looked up, so it cannot vary with the address.
        assert set(responses) <= {"204", "422"}, (
            f"{path} declares {sorted(responses)}; only 204 may depend on the request"
        )


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
