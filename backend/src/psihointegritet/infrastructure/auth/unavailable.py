"""The verifier mounted while no identity provider exists."""

from psihointegritet.infrastructure.auth.identity import (
    IdentityClaims,
    TokenVerificationError,
)


class UnavailableTokenVerifier:
    """Refuses every bearer token, explicitly.

    An object rather than ``None``: ``get_current_identity`` calls ``.verify()``
    unconditionally, so an absent verifier would surface as an ``AttributeError``
    and a 500. Refusing on purpose is what makes an authenticated endpoint fail
    *closed* — the caller gets 401, which is the truth, instead of a stack trace.

    Clerk is gone (D-083) and the PDC auth engine is a later slice. This is what
    stands between them, and it is deliberately incapable of admitting anyone.
    """

    async def verify(self, token: str) -> IdentityClaims:
        raise TokenVerificationError(
            "No authentication provider is configured; every bearer token is refused."
        )
