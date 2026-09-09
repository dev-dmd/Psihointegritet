"""Issuing, resolving and revoking sessions.

The resolver is the security-critical part of this module, and it takes the
caller's *expectations* as arguments rather than reporting what it found:

    resolve(token, kind=TENANT_CLIENT, organization_id=<from the hostname>)

A function that returned "here is the session, you check it" would put the
tenant check at every call site, and the one place somebody forgets is the hole.
Asking the caller to state what it expects means a mismatch is refused here,
once, for everyone.
"""

from dataclasses import dataclass
from datetime import UTC, datetime
from typing import Any, cast
from uuid import UUID

from sqlalchemy import CursorResult, Result, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from psihointegritet.modules.identity.auth.policy import (
    DEFAULT_AUTH_POLICY,
    AuthPolicy,
)
from psihointegritet.modules.identity.auth.secrets import generate_token, hash_token
from psihointegritet.modules.identity.auth_models import AuthSession, SessionKind


def _rows_affected(result: Result[Any]) -> int:
    """`rowcount` for an UPDATE, typed.

    `AsyncSession.execute` is declared as returning `Result`, but a DML
    statement always yields a `CursorResult` — which is the class that carries
    `rowcount`. The cast states that rather than leaving the return type unknown
    under strict checking.
    """
    return cast("CursorResult[Any]", result).rowcount


@dataclass(frozen=True, slots=True)
class IssuedSession:
    """A new session, and the only time its token exists in memory.

    The plaintext is returned once, for the cookie. It is never logged, never
    put in an exception and never stored — after this object is dropped the
    value cannot be recovered from the database.
    """

    session_id: UUID
    token: str
    expires_at: datetime


@dataclass(frozen=True, slots=True)
class ResolvedSession:
    """A session that passed every check the caller asked for."""

    session_id: UUID
    kind: SessionKind
    user_id: UUID | None
    client_id: UUID | None
    organization_id: UUID | None


class SessionService:
    def __init__(self, policy: AuthPolicy = DEFAULT_AUTH_POLICY) -> None:
        self._policy = policy

    async def issue_platform_session(
        self,
        session: AsyncSession,
        *,
        user_id: UUID,
        user_agent: str | None = None,
    ) -> IssuedSession:
        return await self._issue(
            session,
            kind=SessionKind.PLATFORM,
            user_id=user_id,
            client_id=None,
            organization_id=None,
            user_agent=user_agent,
        )

    async def issue_tenant_session(
        self,
        session: AsyncSession,
        *,
        client_id: UUID,
        organization_id: UUID,
        user_agent: str | None = None,
    ) -> IssuedSession:
        """A tenant session always carries its organization.

        There is no overload without one: the database refuses such a row
        anyway, and an optional argument would invite a caller to omit it.
        """
        return await self._issue(
            session,
            kind=SessionKind.TENANT_CLIENT,
            user_id=None,
            client_id=client_id,
            organization_id=organization_id,
            user_agent=user_agent,
        )

    async def _issue(
        self,
        session: AsyncSession,
        *,
        kind: SessionKind,
        user_id: UUID | None,
        client_id: UUID | None,
        organization_id: UUID | None,
        user_agent: str | None,
    ) -> IssuedSession:
        token = generate_token(self._policy)
        expires_at = datetime.now(UTC) + self._policy.session_ttl
        row = AuthSession(
            kind=kind,
            user_id=user_id,
            client_id=client_id,
            organization_id=organization_id,
            token_hash=hash_token(token),
            expires_at=expires_at,
            user_agent=user_agent,
        )
        session.add(row)
        await session.flush()
        return IssuedSession(session_id=row.id, token=token, expires_at=expires_at)

    async def resolve(
        self,
        session: AsyncSession,
        token: str,
        *,
        kind: SessionKind,
        organization_id: UUID | None = None,
    ) -> ResolvedSession | None:
        """The session this token names, if it is live and matches expectations.

        `None` covers every failure with one shape — unknown token, expired,
        revoked, wrong kind, wrong tenant. Callers answer 401 for all of them,
        and distinguishing them here would leak which tokens exist.

        **`organization_id` is required for a tenant session and refused for a
        platform one.** That asymmetry is the point: a tenant session resolved
        without naming the organization would be a session valid on any tenant's
        domain, which is precisely the cross-tenant hole this design exists to
        close.
        """
        if kind is SessionKind.TENANT_CLIENT and organization_id is None:
            raise ValueError(
                "A tenant-client session cannot be resolved without an organization; "
                "pass the one resolved from the request hostname."
            )
        if kind is SessionKind.PLATFORM and organization_id is not None:
            raise ValueError("A platform session has no organization to match.")

        # Every condition is in the query, so a caller cannot receive a row and
        # forget to check one of them.
        statement = select(AuthSession).where(
            AuthSession.token_hash == hash_token(token),
            AuthSession.kind == kind,
            AuthSession.revoked_at.is_(None),
            AuthSession.expires_at > datetime.now(UTC),
        )
        if organization_id is not None:
            statement = statement.where(AuthSession.organization_id == organization_id)

        row = await session.scalar(statement)
        if row is None:
            return None
        return ResolvedSession(
            session_id=row.id,
            kind=row.kind,
            user_id=row.user_id,
            client_id=row.client_id,
            organization_id=row.organization_id,
        )

    async def revoke(self, session: AsyncSession, session_id: UUID) -> None:
        """End one session — a sign-out."""
        await session.execute(
            update(AuthSession)
            .where(AuthSession.id == session_id, AuthSession.revoked_at.is_(None))
            .values(revoked_at=datetime.now(UTC))
        )

    async def revoke_all_for_user(self, session: AsyncSession, user_id: UUID) -> int:
        """Every live session this platform account has. Returns how many."""
        result = await session.execute(
            update(AuthSession)
            .where(
                AuthSession.user_id == user_id,
                AuthSession.revoked_at.is_(None),
            )
            .values(revoked_at=datetime.now(UTC))
        )
        return _rows_affected(result)

    async def revoke_all_for_client(
        self, session: AsyncSession, client_id: UUID, organization_id: UUID
    ) -> int:
        """Every live session this tenant client has, within its own tenant.

        Scoped by organization even though `client_id` is already unique, for
        the same reason `resolve` is: a revocation that ignored the tenant would
        be the one query in the module that could act across one.
        """
        result = await session.execute(
            update(AuthSession)
            .where(
                AuthSession.client_id == client_id,
                AuthSession.organization_id == organization_id,
                AuthSession.revoked_at.is_(None),
            )
            .values(revoked_at=datetime.now(UTC))
        )
        return _rows_affected(result)
