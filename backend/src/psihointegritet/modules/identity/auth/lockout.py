"""Throttling repeated sign-in attempts, in one service rather than per route.

Kept out of the future route handlers on purpose. Rate limiting spread across
handlers is rate limiting that one handler forgets, and the one that forgets is
the one that gets used. A handler asks two questions — may this attempt run, and
what was the outcome — and this module owns the rest.

State lives on the credential row (`failed_attempts`, `locked_until`) rather
than in memory, so a lockout survives a restart and holds across every instance
of the backend. That also means it is per account, not per IP: an attacker
spreading attempts over addresses still burns one account's budget, and a
legitimate person behind a shared address is not punished for a stranger.
"""

from dataclasses import dataclass
from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy import Case, case, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import InstrumentedAttribute

from psihointegritet.modules.identity.auth.policy import (
    DEFAULT_AUTH_POLICY,
    AuthPolicy,
)
from psihointegritet.modules.identity.auth_models import (
    PlatformCredential,
    TenantClientCredential,
)

#: The two credential tables, named rather than described structurally.
#:
#: A `Protocol` would read better, but SQLAlchemy declares mapped columns as
#: `Mapped[int]` at class level and a structural check compares against that
#: rather than the `int` an instance yields. Naming the two concrete types is
#: honest about how many there are — exactly two, one per identity kind — and
#: type-checks without fighting the ORM.
Lockable = PlatformCredential | TenantClientCredential


@dataclass(frozen=True, slots=True)
class AttemptVerdict:
    allowed: bool
    #: When the lock lifts, for a `Retry-After`. Never surfaced to the person
    #: attempting sign-in — telling an attacker exactly how long to wait, on an
    #: account that may not be theirs, confirms the account exists.
    retry_after: datetime | None = None


class LockoutService:
    def __init__(self, policy: AuthPolicy = DEFAULT_AUTH_POLICY) -> None:
        self._policy = policy

    def check(self, credential: Lockable | None) -> AttemptVerdict:
        """Whether an attempt may proceed.

        A missing credential is allowed through deliberately: refusing early for
        an address with no account would answer "does this account exist" before
        a password is even checked. The attempt fails anyway, at the same speed
        and with the same message.
        """
        if credential is None:
            return AttemptVerdict(allowed=True)
        locked_until = credential.locked_until
        if locked_until is not None and locked_until > datetime.now(UTC):
            return AttemptVerdict(allowed=False, retry_after=locked_until)
        return AttemptVerdict(allowed=True)

    async def record_failure(
        self, session: AsyncSession, *, user_id: UUID | None = None, client_id: UUID | None = None
    ) -> None:
        """Count a wrong password, and lock the account once the budget is spent.

        A single statement so concurrent attempts cannot both read the same
        count and write the same increment — which would let a parallel attack
        cost far fewer attempts than the policy says.
        """
        threshold = self._policy.max_failed_attempts
        until = datetime.now(UTC) + self._policy.lockout_duration

        if user_id is not None:
            await session.execute(
                update(PlatformCredential)
                .where(PlatformCredential.user_id == user_id)
                .values(
                    failed_attempts=PlatformCredential.failed_attempts + 1,
                    locked_until=_lock_when_spent(
                        PlatformCredential.failed_attempts, threshold, until
                    ),
                )
            )
        if client_id is not None:
            await session.execute(
                update(TenantClientCredential)
                .where(TenantClientCredential.client_id == client_id)
                .values(
                    failed_attempts=TenantClientCredential.failed_attempts + 1,
                    locked_until=_lock_when_spent(
                        TenantClientCredential.failed_attempts, threshold, until
                    ),
                )
            )

    async def record_success(
        self, session: AsyncSession, *, user_id: UUID | None = None, client_id: UUID | None = None
    ) -> None:
        """Clear the counter. A correct password ends the streak, and the lock."""
        if user_id is not None:
            await session.execute(
                update(PlatformCredential)
                .where(PlatformCredential.user_id == user_id)
                .values(failed_attempts=0, locked_until=None)
            )
        if client_id is not None:
            await session.execute(
                update(TenantClientCredential)
                .where(TenantClientCredential.client_id == client_id)
                .values(failed_attempts=0, locked_until=None)
            )


def _lock_when_spent(
    attempts: InstrumentedAttribute[int], threshold: int, until: datetime
) -> Case[datetime | None]:
    """`locked_until` set only on the attempt that crosses the threshold.

    Evaluated by PostgreSQL against the pre-increment value in the same
    statement that increments it, so the count and the lock can never disagree.
    """
    return case((attempts + 1 >= threshold, until), else_=None)
