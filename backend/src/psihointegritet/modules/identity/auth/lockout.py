"""Throttling repeated sign-in attempts, in one service rather than per route.

Kept out of the route handlers on purpose. Rate limiting spread across handlers
is rate limiting that one handler forgets, and the one that forgets is the one
that gets used. A handler asks two questions — may this attempt run, and what
was the outcome — and this module owns the rest.

State lives on the credential row (`failed_attempts`, `locked_until`) rather
than in memory, so a lockout survives a restart and holds across every instance
of the backend. That also means it is per account, not per IP: an attacker
spreading attempts over addresses still burns one account's budget, and a
legitimate person behind a shared address is not punished for a stranger.

# The denial-of-service that per-account lockout invites, and what answers it

Anyone who knows an address can spend that account's budget on purpose. With a
single hard threshold — "five wrong passwords, locked for an hour" — five cheap
requests an hour keep the owner permanently out, and the security control
becomes the attack. Three properties keep that from being true here:

1. **The first tier is a delay, not a ban.** A minute is enough to destroy an
   automated guess rate and short enough that a person barely notices.
2. **Escalation stops.** The longest lock this policy can ever impose is the
   top tier, so the damage an attacker can do is bounded and fixed — it does
   not grow with how long they keep at it.
3. **A password reset clears the lock.** The owner of the mailbox always has a
   way back in that does not depend on the attacker stopping, which is what
   turns the worst case from "locked out" into "locked out until you read your
   mail". `PlatformAuthService.reset_password` calls `clear` for exactly this.

What is deliberately *not* done: verifying the password during a lock and
admitting it if correct. It reads like the obvious fix, and it silently removes
the throttle — an attacker would simply keep guessing through the lock, since
every guess must be checked to know whether it was the right one.
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
    #: When the lock lifts. Never surfaced to the person attempting sign-in —
    #: telling an attacker exactly how long to wait, on an account that may not
    #: be theirs, confirms the account exists. Present so the service layer can
    #: log it and so a test can assert on it.
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
        self,
        session: AsyncSession,
        *,
        user_id: UUID | None = None,
        client_id: UUID | None = None,
    ) -> None:
        """Count a wrong password, and apply whatever delay the tier calls for.

        A single statement so concurrent attempts cannot both read the same
        count and write the same increment — which would let a parallel attack
        cost far fewer attempts than the policy says.
        """
        now = datetime.now(UTC)

        if user_id is not None:
            await session.execute(
                update(PlatformCredential)
                .where(PlatformCredential.user_id == user_id)
                .values(
                    failed_attempts=PlatformCredential.failed_attempts + 1,
                    locked_until=self._lock_after(PlatformCredential.failed_attempts, now),
                )
            )
        if client_id is not None:
            await session.execute(
                update(TenantClientCredential)
                .where(TenantClientCredential.client_id == client_id)
                .values(
                    failed_attempts=TenantClientCredential.failed_attempts + 1,
                    locked_until=self._lock_after(TenantClientCredential.failed_attempts, now),
                )
            )

    async def record_success(
        self,
        session: AsyncSession,
        *,
        user_id: UUID | None = None,
        client_id: UUID | None = None,
    ) -> None:
        """A correct password ends the streak, and the lock."""
        await self.clear(session, user_id=user_id, client_id=client_id)

    async def clear(
        self,
        session: AsyncSession,
        *,
        user_id: UUID | None = None,
        client_id: UUID | None = None,
    ) -> None:
        """Forget the streak entirely.

        Separate from `record_success` because the other caller is not a
        successful sign-in: completing a password reset clears the lock too.
        That is the escape hatch that keeps a per-account lockout from being a
        denial-of-service — whoever can read the mailbox is never held out by
        somebody else's failed guesses.
        """
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

    def _lock_after(
        self, attempts: InstrumentedAttribute[int], now: datetime
    ) -> Case[datetime | None]:
        """`locked_until` for the count this statement is about to write.

        Evaluated by PostgreSQL against the pre-increment value in the same
        statement that increments it, so the count and the lock can never
        disagree — there is no window in which one is written and the other is
        not.

        Tiers are tried highest-first because `case` takes the first match, and
        the highest threshold reached is the one that applies.
        """
        tiers = sorted(self._policy.lockout_tiers, key=lambda tier: tier[0], reverse=True)
        return case(
            *((attempts + 1 >= threshold, now + duration) for threshold, duration in tiers),
            else_=None,
        )
