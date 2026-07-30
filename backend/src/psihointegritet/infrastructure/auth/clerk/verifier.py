import asyncio
from typing import Any

import jwt
from jwt import InvalidTokenError, PyJWKClient, PyJWKClientError

from psihointegritet.core.config import Settings
from psihointegritet.infrastructure.auth.identity import IdentityClaims


class ClerkTokenVerificationError(ValueError):
    """A bearer token could not be verified against the configured Clerk JWKS."""


class ClerkTokenVerifier:
    """Cached-JWKS verifier for short-lived Clerk session tokens."""

    def __init__(self, settings: Settings) -> None:
        self._issuer = settings.clerk_issuer
        self._audience = settings.clerk_audience
        self._jwks_url = settings.clerk_jwks_url
        self._jwks_client = PyJWKClient(self._jwks_url, cache_keys=True) if self._jwks_url else None

    async def verify(self, token: str) -> IdentityClaims:
        if not self._issuer or self._jwks_client is None:
            raise ClerkTokenVerificationError("Clerk JWT verification is not configured")
        try:
            signing_key = await asyncio.to_thread(self._jwks_client.get_signing_key_from_jwt, token)
            claims = jwt.decode(
                token,
                signing_key.key,
                algorithms=["RS256"],
                issuer=self._issuer,
                audience=self._audience or None,
                options={
                    "require": ["exp", "iat", "sub"],
                    "verify_aud": bool(self._audience),
                },
            )
        except (InvalidTokenError, PyJWKClientError, ValueError) as error:
            raise ClerkTokenVerificationError("Invalid Clerk session token") from error

        return _identity_claims(claims)


def _identity_claims(claims: dict[str, Any]) -> IdentityClaims:
    subject = claims.get("sub")
    if not isinstance(subject, str) or not subject:
        raise ClerkTokenVerificationError("Clerk session token has no subject")
    email = claims.get("email")
    session_id = claims.get("sid")
    return IdentityClaims(
        subject=subject,
        email=email if isinstance(email, str) else None,
        session_id=session_id if isinstance(session_id, str) else None,
    )
