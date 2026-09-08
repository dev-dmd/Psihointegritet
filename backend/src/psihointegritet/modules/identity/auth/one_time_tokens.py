"""Email verification and password reset links.

Both are the same object with a different purpose and lifetime, so they share
one implementation — a reset flow that quietly grew its own token handling is
how one of the two ends up without an expiry.
"""

from dataclasses import dataclass
from datetime import UTC, datetime
from typing import Any, cast
from uuid import UUID

from sqlalchemy import CursorResult, Result, update
from sqlalchemy.ext.asyncio import AsyncSession

from psihointegritet.modules.identity.auth.policy import (
    DEFAULT_AUTH_POLICY,
    AuthPolicy,
)
from psihointegritet.modules.identity.auth.secrets import (
    generate_one_time_token,
    hash_token,
)
from psihointegritet.modules.identity.auth_models import (
    AuthToken,
    SessionKind,
    TokenPurpose,
)


def _rows_affected(result: Result[Any]) -> int:
    """`rowcount` for an UPDATE, typed.

    `AsyncSession.execute` is declared as returning `Result`, but a DML
    statement always yields a `CursorResult` — which is the class that carries
    `rowcount`. The cast states that rather than leaving the return type unknown
    under strict checking.
    """
    return cast("CursorResult[Any]", result).rowcount


@dataclass(frozen=True, slots=True)
class IssuedToken:
    """The one moment the token exists in plaintext — to be mailed, not logged."""

    token_id: UUID
    token: str
    expires_at: datetime


@dataclass(frozen=True, slots=True)
class ConsumedToken:
    """Who a spent token belonged to."""

    token_id: UUID
    purpose: TokenPurpose
    kind: SessionKind
    user_id: UUID | None
    client_id: UUID | None
    organization_id: UUID | None


class OneTimeTokenService:
    def __init__(self, policy: AuthPolicy = DEFAULT_AUTH_POLICY) -> None:
        self._policy = policy

    def _ttl_for(self, purpose: TokenPurpose) -> datetime:
        span = (
            self._policy.password_reset_ttl
            if purpose is TokenPurpose.PASSWORD_RESET
            else self._policy.email_verification_ttl
        )
        return datetime.now(UTC) + span

    async def issue_for_user(
        self,
        session: AsyncSession,
        *,
        purpose: TokenPurpose,
        user_id: UUID,
    ) -> IssuedToken:
        return await self._issue(
            session,
            purpose=purpose,
            kind=SessionKind.PLATFORM,
            user_id=user_id,
            client_id=None,
            organization_id=None,
        )

    async def issue_for_client(
        self,
        session: AsyncSession,
        *,
        purpose: TokenPurpose,
        client_id: UUID,
        organization_id: UUID,
    ) -> IssuedToken:
        return await self._issue(
            session,
            purpose=purpose,
            kind=SessionKind.TENANT_CLIENT,
            user_id=None,
            client_id=client_id,
            organization_id=organization_id,
        )

    async def _issue(
        self,
        session: AsyncSession,
        *,
        purpose: TokenPurpose,
        kind: SessionKind,
        user_id: UUID | None,
        client_id: UUID | None,
        organization_id: UUID | None,
    ) -> IssuedToken:
        token = generate_one_time_token(self._policy)
        expires_at = self._ttl_for(purpose)
        row = AuthToken(
            purpose=purpose,
            kind=kind,
            user_id=user_id,
            client_id=client_id,
            organization_id=organization_id,
            token_hash=hash_token(token),
            expires_at=expires_at,
        )
        session.add(row)
        await session.flush()
        return IssuedToken(token_id=row.id, token=token, expires_at=expires_at)

    async def consume(
        self,
        session: AsyncSession,
        token: str,
        *,
        purpose: TokenPurpose,
        organization_id: UUID | None = None,
    ) -> ConsumedToken | None:
        """Spend the token, atomically, or answer `None`.

        # Why this is one statement and not read-then-write

        A read followed by an update loses the race the same way first-login
        registration did: two requests both read `consumed_at IS NULL`, both
        write, and a reset link works twice. For a password reset that is an
        account takeover replayed out of a mailbox.

        `UPDATE ... WHERE consumed_at IS NULL ... RETURNING` cannot be lost.
        PostgreSQL serialises the row, the second writer re-checks the
        predicate against the committed row and matches nothing, and the loser
        gets `None` — the same answer as an unknown token.

        Expiry is in the predicate too, so an expired token is never spent: it
        stays unconsumed and simply cannot be used.
        """
        statement = (
            update(AuthToken)
            .where(
                AuthToken.token_hash == hash_token(token),
                AuthToken.purpose == purpose,
                AuthToken.consumed_at.is_(None),
                AuthToken.expires_at > datetime.now(UTC),
            )
            .values(consumed_at=datetime.now(UTC))
            .returning(
                AuthToken.id,
                AuthToken.purpose,
                AuthToken.kind,
                AuthToken.user_id,
                AuthToken.client_id,
                AuthToken.organization_id,
            )
        )
        if organization_id is not None:
            statement = statement.where(AuthToken.organization_id == organization_id)

        row = (await session.execute(statement)).one_or_none()
        if row is None:
            return None
        return ConsumedToken(
            token_id=row.id,
            purpose=row.purpose,
            kind=row.kind,
            user_id=row.user_id,
            client_id=row.client_id,
            organization_id=row.organization_id,
        )

    async def invalidate_outstanding(
        self,
        session: AsyncSession,
        *,
        purpose: TokenPurpose,
        user_id: UUID | None = None,
        client_id: UUID | None = None,
    ) -> int:
        """Spend every unused token of this purpose for one identity.

        Called when a reset completes: the link that was just used is spent, but
        an earlier one from a second "forgot password" click would otherwise
        still be live in an older mail.
        """
        statement = (
            update(AuthToken)
            .where(AuthToken.purpose == purpose, AuthToken.consumed_at.is_(None))
            .values(consumed_at=datetime.now(UTC))
        )
        if user_id is not None:
            statement = statement.where(AuthToken.user_id == user_id)
        if client_id is not None:
            statement = statement.where(AuthToken.client_id == client_id)
        result = await session.execute(statement)
        return _rows_affected(result)
