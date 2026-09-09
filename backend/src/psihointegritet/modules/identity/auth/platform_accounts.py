"""Sign-in, sign-out and password reset for a platform account (D-083).

The use cases, with no HTTP in them. A router below this turns an exception into
a status code and a dataclass into JSON; every rule about what may happen lives
here, where a test can reach it without a client.

# One failure, one exception

`AuthenticationError` covers a wrong password, an unknown address, an account
whose password was never set, a deactivated account and a throttled one. The
caller cannot tell them apart and neither can the response, which is what stops
sign-in from being an oracle for "does this person have an account here". The
`reason` field exists for logs, and is deliberately not part of any response.
"""

from enum import StrEnum
from uuid import UUID, uuid4

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from psihointegritet.modules.identity.auth.hashing import PasswordService
from psihointegritet.modules.identity.auth.lockout import LockoutService
from psihointegritet.modules.identity.auth.one_time_tokens import OneTimeTokenService
from psihointegritet.modules.identity.auth.policy import (
    DEFAULT_AUTH_POLICY,
    AuthPolicy,
)
from psihointegritet.modules.identity.auth.sessions import IssuedSession, SessionService
from psihointegritet.modules.identity.auth_models import (
    PlatformCredential,
    TokenPurpose,
)
from psihointegritet.modules.identity.models import InternalUser

#: An Argon2 hash of a value nobody holds, verified against when no credential
#: was found. Sign-in for an unknown address then costs the same ~100ms as one
#: for a known address with a wrong password, so response time stops answering
#: "does this account exist". Computed once at import; the plaintext behind it
#: is discarded and is not recoverable.
_ABSENT_CREDENTIAL_HASH = PasswordService().hash(uuid4().hex)


class AuthFailureReason(StrEnum):
    """Why a sign-in was refused. For logs and tests — never for a response."""

    NO_SUCH_ACCOUNT = "no_such_account"
    PASSWORD_NOT_SET = "password_not_set"  # noqa: S105 - a reason label, not a credential
    WRONG_PASSWORD = "wrong_password"  # noqa: S105 - a reason label, not a credential
    ACCOUNT_DISABLED = "account_disabled"
    THROTTLED = "throttled"


class AuthenticationError(Exception):
    """Sign-in refused. The reason is carried, never disclosed."""

    def __init__(self, reason: AuthFailureReason) -> None:
        self.reason = reason
        super().__init__(reason.value)


class RegistrationError(Exception):
    """The account could not be created — a weak password, or a taken address."""

    def __init__(self, message: str) -> None:
        super().__init__(message)


class PasswordPolicyError(Exception):
    """The proposed password does not meet policy."""


def normalize_email(email: str) -> str:
    """Lowercased and trimmed. The single definition of what the column holds.

    The uniqueness constraints are on the normalized value, so normalizing in
    two places with two rules is how `Ana@…` and `ana@…` become two accounts.
    """
    return email.strip().lower()


class PlatformAuthService:
    """Every platform credential operation, sharing one policy.

    The sub-services are built *from* the policy rather than defaulted
    separately, which is the difference between a test that measures what it
    thinks it measures and one that does not: `PlatformAuthService(fast_policy)`
    has to hash with `fast_policy`, not with the application's 65 MiB Argon2
    while claiming otherwise.

    Cheap to construct — it holds services, not state — so a request builds one
    rather than reaching for a module global.
    """

    def __init__(self, policy: AuthPolicy = DEFAULT_AUTH_POLICY) -> None:
        self.policy = policy
        self.passwords = PasswordService(policy)
        self.sessions = SessionService(policy)
        self.lockout = LockoutService(policy)
        self.tokens = OneTimeTokenService(policy)

    # ── Sign in ──────────────────────────────────────────────────────────────

    async def authenticate(
        self,
        db: AsyncSession,
        *,
        email: str,
        password: str,
        user_agent: str | None = None,
    ) -> IssuedSession:
        """Prove the password and issue a platform session.

        Every refusal raises `AuthenticationError`, and every refusal costs
        roughly the same time: an unknown address is verified against a hash of
        a value nobody holds rather than returning early.
        """
        credential = await db.scalar(
            select(PlatformCredential).where(
                PlatformCredential.normalized_email == normalize_email(email)
            )
        )

        # Asked before the password is checked. Verifying first and then
        # refusing would let an attacker keep testing guesses straight through
        # a lock, which is the whole of the protection.
        #
        # A throttled attempt is *not* counted as a failure, and that asymmetry
        # is load-bearing. Counting it would let a burst of requests walk the
        # account straight up to the longest tier while it is already locked —
        # handing anyone who knows an address the escalation this policy exists
        # to deny. Not counting it means each further tier costs the attacker a
        # full wait, so a burst can never do worse than the first tier.
        if not self.lockout.check(credential).allowed:
            raise AuthenticationError(AuthFailureReason.THROTTLED)

        if credential is None:
            self.passwords.verify(_ABSENT_CREDENTIAL_HASH, password)
            raise AuthenticationError(AuthFailureReason.NO_SUCH_ACCOUNT)

        if credential.password_hash is None:
            # An account migrated off Clerk that has not been activated yet
            # (AUTH-5). Indistinguishable from a wrong password, on purpose.
            self.passwords.verify(_ABSENT_CREDENTIAL_HASH, password)
            raise AuthenticationError(AuthFailureReason.PASSWORD_NOT_SET)

        if not self.passwords.verify(credential.password_hash, password):
            await self.lockout.record_failure(db, user_id=credential.user_id)
            raise AuthenticationError(AuthFailureReason.WRONG_PASSWORD)

        user = await db.get(InternalUser, credential.user_id)
        if user is None or not user.is_active:
            # A correct password on a disabled account still fails, and still
            # clears nothing: the streak is not this person's to reset.
            raise AuthenticationError(AuthFailureReason.ACCOUNT_DISABLED)

        # The only moment the plaintext exists, so the only moment a hash can be
        # upgraded to current parameters without asking anybody to do anything.
        if self.passwords.needs_rehash(credential.password_hash):
            credential.password_hash = self.passwords.hash(password)

        await self.lockout.record_success(db, user_id=credential.user_id)
        return await self.sessions.issue_platform_session(
            db, user_id=credential.user_id, user_agent=user_agent
        )

    # ── Register ─────────────────────────────────────────────────────────────

    async def register(
        self,
        db: AsyncSession,
        *,
        email: str,
        password: str,
        display_name: str | None = None,
        user_agent: str | None = None,
    ) -> IssuedSession:
        """Create a platform account and sign it in.

        **Grants nothing.** The new row has no membership and no superadmin
        flag, so `resolve_staff_actor` refuses it with `NO_ACTIVE_STAFF_ROLE`
        and every protected surface stays shut. Authorization has always been
        PostgreSQL's answer, never the provider's (rules §10.3); that is what
        makes an open registration endpoint safe to have at all.

        `email_verified_at` stays `NULL`. Nothing enforces it yet because there
        is no mailer — worth closing before the platform domain sees traffic.
        """
        self._require_acceptable_password(password)
        normalized = normalize_email(email)

        user_id = uuid4()
        try:
            db.add(
                InternalUser(
                    id=user_id,
                    # PDC-issued rather than borrowed. The `pdc:` prefix makes
                    # the provider visible in any row that carries a subject, so
                    # an account created here is never mistaken for a migrated
                    # one.
                    external_auth_id=f"pdc:{user_id}",
                    email=normalized,
                    display_name=display_name,
                )
            )
            # Flushed on its own, before the credential that points at it.
            # SQLAlchemy's unit of work does not order these two reliably —
            # nothing declares a relationship between them, only a raw foreign
            # key — and getting it wrong is a foreign-key violation on every
            # registration, not an occasional one.
            await db.flush()
            db.add(
                PlatformCredential(
                    user_id=user_id,
                    normalized_email=normalized,
                    password_hash=self.passwords.hash(password),
                )
            )
            await db.flush()
        except IntegrityError as error:
            # `uq_platform_credentials_email` arbitrating two people registering
            # the same address at once, or one address registered twice. The
            # database decides; the application does not read-then-write and
            # hope, which is the race `/api/v1/me` lost in production.
            await db.rollback()
            raise RegistrationError("This address cannot be registered.") from error

        return await self.sessions.issue_platform_session(
            db, user_id=user_id, user_agent=user_agent
        )

    # ── Sign out ─────────────────────────────────────────────────────────────

    async def sign_out(self, db: AsyncSession, session_id: UUID) -> None:
        """End this one session. Other devices stay signed in."""
        await self.sessions.revoke(db, session_id)

    # ── Reset ────────────────────────────────────────────────────────────────

    async def issue_password_reset(self, db: AsyncSession, *, email: str) -> str | None:
        """A reset token for this address, or `None` if there is no account.

        Returns the plaintext to its **caller only** — an operator script today,
        a mailer later. No route returns this, and it is never logged: whoever
        holds it holds the account.
        """
        credential = await db.scalar(
            select(PlatformCredential).where(
                PlatformCredential.normalized_email == normalize_email(email)
            )
        )
        if credential is None:
            return None
        issued = await self.tokens.issue_for_user(
            db, purpose=TokenPurpose.PASSWORD_RESET, user_id=credential.user_id
        )
        return issued.token

    async def reset_password(self, db: AsyncSession, *, token: str, new_password: str) -> UUID:
        """Spend a reset token, set the password, and end every session.

        Returns the account the token belonged to.

        Four things happen together, and each one is a hole if it is left out:

        1. **The token is consumed atomically**, so a link forwarded or
           replayed out of a mailbox works exactly once.
        2. **Every other outstanding reset token for the account is spent**, so
           a second "forgot password" click does not leave a live link in an
           older mail.
        3. **Every session of this identity is revoked** — the instruction is
           explicit and it is the right one: a reset is what somebody does when
           they believe the account is compromised, and leaving the attacker's
           session alive would defeat the entire exercise.
        4. **The lockout is cleared.** This is what keeps per-account throttling
           from becoming a denial-of-service: whoever can read the mailbox gets
           back in without waiting out somebody else's failed guesses.
        """
        self._require_acceptable_password(new_password)

        consumed = await self.tokens.consume(db, token, purpose=TokenPurpose.PASSWORD_RESET)
        if consumed is None or consumed.user_id is None:
            raise PasswordPolicyError("This link is no longer valid.")

        credential = await db.get(PlatformCredential, consumed.user_id)
        if credential is None:
            raise PasswordPolicyError("This link is no longer valid.")

        credential.password_hash = self.passwords.hash(new_password)
        await db.flush()

        await self.tokens.invalidate_outstanding(
            db, purpose=TokenPurpose.PASSWORD_RESET, user_id=consumed.user_id
        )
        await self.sessions.revoke_all_for_user(db, consumed.user_id)
        await self.lockout.clear(db, user_id=consumed.user_id)
        return consumed.user_id

    def _require_acceptable_password(self, password: str) -> None:
        if len(password) < self.policy.min_password_length:
            raise PasswordPolicyError(
                f"Lozinka mora imati najmanje {self.policy.min_password_length} znakova."
            )
