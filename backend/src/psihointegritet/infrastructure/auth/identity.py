from dataclasses import dataclass
from typing import Protocol


@dataclass(frozen=True, slots=True)
class IdentityClaims:
    """Provider-neutral identity of an authenticated subject.

    Domain and application code depend on this contract only — never on
    Clerk SDK types. The concrete verifier arrives with the auth milestone.
    """

    subject: str
    email: str | None
    session_id: str | None


class TokenVerifier(Protocol):
    """Port implemented by the identity provider adapter (Clerk for MVP)."""

    async def verify(self, token: str) -> IdentityClaims: ...
