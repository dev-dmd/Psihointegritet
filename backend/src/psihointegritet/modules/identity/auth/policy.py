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
    one_time_token_bytes: int = 32

    # ── Lockout ──────────────────────────────────────────────────────────────
    max_failed_attempts: int = 10
    lockout_duration: timedelta = timedelta(minutes=15)


#: The policy the application runs with. Services take a policy argument so a
#: test can pass its own; this is the value the app wires in.
DEFAULT_AUTH_POLICY = AuthPolicy()
