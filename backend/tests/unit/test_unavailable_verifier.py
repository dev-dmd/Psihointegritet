"""The verifier that stands between Clerk and the PDC auth engine."""

import pytest

from psihointegritet.infrastructure.auth.identity import TokenVerificationError
from psihointegritet.infrastructure.auth.unavailable import UnavailableTokenVerifier


@pytest.mark.asyncio
async def test_every_token_is_refused() -> None:
    """Fail closed, and with the type `get_current_identity` already catches.

    This is the only thing between a clean 401 and an AttributeError 500: the
    dependency calls `.verify()` unconditionally, so the object has to exist and
    has to raise something the 401 handler recognises.
    """
    verifier = UnavailableTokenVerifier()

    for token in ("", "anything", "eyJhbGciOiJSUzI1NiJ9.payload.signature"):
        with pytest.raises(TokenVerificationError):
            await verifier.verify(token)
