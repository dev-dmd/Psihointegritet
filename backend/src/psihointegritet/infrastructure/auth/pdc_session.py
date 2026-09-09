"""The verifier that turns a PDC session token into `IdentityClaims` (D-083).

This is the whole of AUTH-3's coupling to the rest of the backend. Everything
downstream — `resolve_staff_actor`, `require_staff`, `require_superadmin`, every
router that depends on them — receives exactly the object it received from
Clerk, built from exactly the same column. `internal_users.external_auth_id`
stays the subject, so the identities provisioned under Clerk keep their
`internal_users.id` and every membership, appointment, article and audit row
that points at it. **The auth provider changed; the business identity did not.**

# Strict platform verifier, on purpose

It accepts a `platform` session and nothing else. A tenant client's session is
a different kind of subject with a different resolver (AUTH-7), and passing one
through this path would make "holds a valid token" sufficient for a staff
route — which is the Marysoll failure the two cookie namespaces exist to
prevent. `SessionService.resolve(kind=PLATFORM)` puts the kind in the SQL
predicate, and the assertions below re-check the shape the check constraint
already guarantees, because a guard that trusts its input once is a guard that
stops guarding when something upstream changes.
"""

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from psihointegritet.infrastructure.auth.identity import (
    IdentityClaims,
    TokenVerificationError,
)
from psihointegritet.modules.identity.auth.sessions import SessionService
from psihointegritet.modules.identity.auth_models import SessionKind
from psihointegritet.modules.identity.models import InternalUser


class PdcSessionVerifier:
    """Resolves an opaque bearer token against `auth_sessions`.

    Owns its own session factory rather than taking a request-scoped one,
    because `TokenVerifier` is deliberately a one-method port: giving it a
    database argument would make every other implementation — and every test
    fake — carry a dependency it does not use. The lookup is one indexed read
    on a unique hash, in its own short transaction.
    """

    def __init__(
        self,
        session_factory: async_sessionmaker[AsyncSession],
        sessions: SessionService | None = None,
    ) -> None:
        self._session_factory = session_factory
        self._sessions = sessions or SessionService()

    async def verify(self, token: str) -> IdentityClaims:
        """The account this token belongs to, or `TokenVerificationError`.

        One exception for every refusal — unknown token, expired, revoked, a
        tenant-client session, a deactivated account. `get_current_identity`
        turns it into a 401 with one message, so the response cannot be used to
        learn which tokens or accounts exist.
        """
        async with self._session_factory() as db:
            resolved = await self._sessions.resolve(db, token, kind=SessionKind.PLATFORM)
            if resolved is None:
                raise TokenVerificationError("No live platform session for this token.")

            # The check constraint on `auth_sessions` already makes these true
            # for any row that exists. Re-checked because this is the boundary:
            # if a later migration ever loosened that constraint, the failure
            # must be a 401 here rather than a tenant-client identity quietly
            # arriving at `resolve_staff_actor` with `subject=None`.
            if (
                resolved.user_id is None
                or resolved.client_id is not None
                or resolved.organization_id is not None
            ):
                raise TokenVerificationError("Session is not a platform subject.")

            user = await db.get(InternalUser, resolved.user_id)
            if user is None or not user.is_active:
                raise TokenVerificationError("The account behind this session cannot sign in.")

            return IdentityClaims(
                subject=user.external_auth_id,
                email=user.email,
                session_id=str(resolved.session_id),
            )
