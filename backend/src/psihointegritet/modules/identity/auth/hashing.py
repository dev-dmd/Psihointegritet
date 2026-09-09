"""Password hashing. One configuration, one place.

Argon2id, because it resists both GPU and side-channel attack where Argon2i and
Argon2d each resist only one. bcrypt would also be defensible; Argon2id is the
current OWASP default and the parameters are explicit in `AuthPolicy` rather
than hidden in a library default that could shift under a version bump.
"""

from argon2 import PasswordHasher
from argon2.exceptions import InvalidHashError, VerificationError, VerifyMismatchError

from psihointegritet.modules.identity.auth.policy import (
    DEFAULT_AUTH_POLICY,
    AuthPolicy,
)


class PasswordService:
    """Hashes and verifies passwords, and says when a hash is out of date.

    Constructed once and shared. Every caller uses this rather than reaching for
    `argon2` directly, so parameters cannot drift apart between two routes —
    which is the failure that leaves half the accounts weakly hashed and nobody
    able to tell which half.
    """

    def __init__(self, policy: AuthPolicy = DEFAULT_AUTH_POLICY) -> None:
        self._hasher = PasswordHasher(
            time_cost=policy.argon2_time_cost,
            memory_cost=policy.argon2_memory_cost,
            parallelism=policy.argon2_parallelism,
            hash_len=policy.argon2_hash_length,
            salt_len=policy.argon2_salt_length,
        )

    def hash(self, password: str) -> str:
        """The encoded hash, carrying its own parameters and salt."""
        return self._hasher.hash(password)

    def verify(self, password_hash: str, password: str) -> bool:
        """Whether the password matches.

        Returns a boolean rather than raising, because every caller wants the
        same answer for "wrong password" and "this hash is unreadable": refuse,
        with one generic message. Distinguishing them at the call site is how a
        stack trace ends up telling an attacker which accounts exist.
        """
        try:
            return self._hasher.verify(password_hash, password)
        except VerifyMismatchError, VerificationError, InvalidHashError:
            return False

    def needs_rehash(self, password_hash: str) -> bool:
        """Whether this hash predates the current parameters.

        Checked on every successful sign-in, which is the only moment the
        plaintext is available to rehash with. Raising the cost in `AuthPolicy`
        therefore upgrades accounts as people return, with no migration and no
        forced reset.
        """
        try:
            return self._hasher.check_needs_rehash(password_hash)
        except InvalidHashError:
            # Unreadable is worse than outdated: treat it as needing replacement.
            return True
