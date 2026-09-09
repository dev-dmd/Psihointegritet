"""Opaque tokens: generated once, stored only as a digest.

Two rules, and both matter more than they look.

**The token never persists.** What goes in the database is a SHA-256 digest, so
a dump, a backup or a leaked read replica is not a set of live sessions and
password-reset links. Lookup hashes what the caller presented and matches on
that.

**SHA-256, not Argon2, and that is deliberate.** These are 256-bit random
values, not passwords: there is no dictionary to attack and nothing to slow an
attacker down, while a per-request Argon2 verification would put ~100ms on every
authenticated call. Slow hashing protects low-entropy secrets; this is the other
kind.
"""

import hashlib
import secrets

from psihointegritet.modules.identity.auth.policy import (
    DEFAULT_AUTH_POLICY,
    AuthPolicy,
)


def generate_token(policy: AuthPolicy = DEFAULT_AUTH_POLICY) -> str:
    """A URL-safe token with `session_token_bytes` of entropy behind it."""
    return secrets.token_urlsafe(policy.session_token_bytes)


def generate_one_time_token(policy: AuthPolicy = DEFAULT_AUTH_POLICY) -> str:
    return secrets.token_urlsafe(policy.one_time_token_bytes)


def hash_token(token: str) -> str:
    """The stored form. 64 hex characters, matching the column width."""
    return hashlib.sha256(token.encode("utf-8")).hexdigest()
