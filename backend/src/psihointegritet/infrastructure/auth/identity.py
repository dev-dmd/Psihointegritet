from dataclasses import dataclass
from typing import Protocol


@dataclass(frozen=True, slots=True)
class IdentityClaims:
    """Provider-neutral identity of an authenticated subject.

    Domain and application code depend on this contract only — never on a
    provider's SDK types. That discipline is what made removing Clerk (D-083)
    a change of one class and one line in `main.py`, rather than a refactor
    reaching into Booking, Intake, Content and Compass.
    """

    subject: str
    email: str | None
    session_id: str | None


class TokenVerificationError(ValueError):
    """A bearer token could not be verified.

    Lives beside the port rather than inside an adapter, so `get_current_identity`
    can catch it without importing whichever implementation is mounted. That is
    what keeps the 401 path stable across a provider change.
    """


class TokenVerifier(Protocol):
    """Port implemented by whatever authenticates a request."""

    async def verify(self, token: str) -> IdentityClaims: ...
