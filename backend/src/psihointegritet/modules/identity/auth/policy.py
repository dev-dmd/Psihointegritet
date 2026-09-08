"""Every tunable the auth engine has, in one place.

Scattering these across call sites is how two routes end up hashing with
different Argon2 parameters, or how a reset link outlives a verification link
because nobody compared them. One frozen object instead, read by the services
and overridable in a test without monkeypatching a module global.

The Argon2 numbers are the `argon2-cffi` defaults for the `ID` profile, which
track OWASP guidance. They are named here rather than left implicit because
raising them later is a deliberate act with a cost — every existing hash needs
a rehash on next sign-in, which `needs_rehash` handles precisely so that raising
them stays cheap.
"""

from dataclasses import dataclass
from datetime import timedelta

#: How long an account is locked after each tier of consecutive failures.
#:
#: Read as "at 5 failures wait a minute, at 10 wait five, from 20 on wait a
#: quarter of an hour". Ordered by threshold; `lock_duration_for` matches the
#: highest one reached.
#:
#: **The shape is what defends against the denial-of-service, not the numbers.**
#: A single hard threshold — the usual "5 wrong passwords, locked for an hour" —
#: hands anyone who knows an address a way to keep its owner out indefinitely
#: for the price of five requests an hour. Escalating from a delay short enough
#: to be a nuisance, and capping where it stops growing, means the worst an
#: attacker can impose is a fixed wait, never an outage. Meanwhile the guess
#: rate collapses: past the cap an attacker gets four attempts an hour, which
#: ends brute force just as firmly as a permanent lock would.
LOCKOUT_TIERS: tuple[tuple[int, timedelta], ...] = (
    (5, timedelta(minutes=1)),
    (10, timedelta(minutes=5)),
    (20, timedelta(minutes=15)),
)


@dataclass(frozen=True, slots=True)
class AuthPolicy:
    # ── Password hashing (Argon2id) ──────────────────────────────────────────
    #: KiB of memory per hash. The dominant cost, and what makes GPU attack
    #: expensive rather than merely slow.
    argon2_memory_cost: int = 65_536
    #: Passes over memory.
    argon2_time_cost: int = 3
    #: Lanes. Kept at 4 to match the library default; raising it without raising
    #: memory buys little.
    argon2_parallelism: int = 4
    argon2_hash_length: int = 32
    argon2_salt_length: int = 16

    #: The shortest password accepted. Length is the only requirement, on
    #: purpose: composition rules ("one digit, one symbol") measurably push
    #: people towards `Password1!` and are no longer recommended by NIST.
    min_password_length: int = 12

    # ── Sessions ─────────────────────────────────────────────────────────────
    session_ttl: timedelta = timedelta(days=14)
    #: Bytes of entropy in an opaque session token, before encoding. 32 bytes is
    #: 256 bits — far beyond guessable, and short enough for a cookie.
    session_token_bytes: int = 32

    # ── One-time tokens ──────────────────────────────────────────────────────
    #: Long enough that somebody can find the mail and act on it, short enough
    #: that a forwarded or archived link stops working.
    email_verification_ttl: timedelta = timedelta(hours=24)
    #: Deliberately shorter than verification: a live reset link is a live
    #: account takeover if a mailbox is exposed.
    password_reset_ttl: timedelta = timedelta(hours=1)
    #: An account that has never had a password gets much longer. The activation
    #: link is the *only* way in for somebody migrated off Clerk (AUTH-5), it is
    #: handed over out of band rather than requested, and an hour is not enough
    #: time for five people to each notice and act. It is still a one-time token
    #: on an account with no password to steal.
    activation_ttl: timedelta = timedelta(days=7)
    one_time_token_bytes: int = 32

    # ── Lockout ──────────────────────────────────────────────────────────────
    lockout_tiers: tuple[tuple[int, timedelta], ...] = LOCKOUT_TIERS

    @property
    def first_lockout_threshold(self) -> int:
        """Failures before the first delay. The lowest tier, by definition."""
        return min(threshold for threshold, _ in self.lockout_tiers)

    def lock_duration_for(self, failed_attempts: int) -> timedelta | None:
        """How long to lock after this many consecutive failures.

        `None` below the first tier — an ordinary typo costs nothing.
        """
        reached = [
            duration for threshold, duration in self.lockout_tiers if failed_attempts >= threshold
        ]
        return max(reached, default=None)


#: The policy the application runs with. Services take a policy argument so a
#: test can pass its own; this is the value the app wires in.
DEFAULT_AUTH_POLICY = AuthPolicy()
