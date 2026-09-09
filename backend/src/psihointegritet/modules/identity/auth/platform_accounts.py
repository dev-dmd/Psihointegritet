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

from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
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
    AuthToken,
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
    #: Registered, has a password, never proved it can read the address.
    #: Only self-registration produces this state — an account activated by an
    #: operator is stamped verified the moment its link is spent.
    EMAIL_NOT_VERIFIED = "email_not_verified"


@dataclass(frozen=True, slots=True)
class MailableLink:
    """A one-time link and the little it takes to address the mail.

    Returned instead of a bare token so the router does not have to go back to
    the database for a display name — and, more importantly, so it mails the
    address **this module** resolved rather than the one the caller typed. Those
    differ by case and whitespace at least, and a mailer that trusts request
    input is a mailer that can be pointed at a different mailbox.
    """

    email: str
    display_name: str | None
    token: str


class AuthenticationError(Exception):
    """Sign-in refused. The reason is carried, never disclosed."""

    def __init__(self, reason: AuthFailureReason) -> None:
        self.reason = reason
        super().__init__(reason.value)


@dataclass(frozen=True, slots=True)
class RegisteredAccount:
    """What registration produced: a live session, and a link still to send.

    The token is returned to the caller rather than mailed here, for the same
    reason `issue_password_reset` does it: this module owns accounts, not
    delivery. The route sends it; a script could print it; a test can read it
    without a mailbox.
    """

    session: IssuedSession
    verification_token: str


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

        # Checked *after* the password, deliberately: refusing an unverified
        # account before it would turn sign-in into an oracle telling anyone
        # which addresses are registered but unconfirmed. The password is
        # correct by this point, so the person is the owner or already holds
        # their credentials, and neither learns anything new.
        #
        # A password with no verification can only come from self-registration
        # (`register`), because every operator-issued link stamps the column
        # when it is spent. That is what makes this one condition enough,
        # without a column recording how the account was created.
        if credential.email_verified_at is None:
            raise AuthenticationError(AuthFailureReason.EMAIL_NOT_VERIFIED)

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
    ) -> RegisteredAccount:
        """Create a platform account, sign it in, and mint its proof-of-address.

        **Grants nothing.** The new row has no membership and no superadmin
        flag, so `resolve_staff_actor` refuses it with `NO_ACTIVE_STAFF_ROLE`
        and every protected surface stays shut. Authorization has always been
        PostgreSQL's answer, never the provider's (rules §10.3); that is what
        makes an open registration endpoint safe to have at all.

        `email_verified_at` stays `NULL`, and **that now refuses sign-in**
        (`AuthFailureReason.EMAIL_NOT_VERIFIED`). Until it did, an open endpoint
        on a live platform domain let anyone take any address — including the
        address of somebody who had not been provisioned yet, which would have
        made provisioning them impossible without an operator deleting a row.

        A session is still issued: the browser that registered is the one that
        proved nothing yet, and letting it hold a session it cannot use
        anywhere is harmless — every surface asks PostgreSQL, and this account
        has no membership. It is what lets the page say "check your mail"
        instead of dropping the person at a sign-in form that will refuse them.
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

        verification = await self.tokens.issue_for_user(
            db,
            purpose=TokenPurpose.EMAIL_VERIFICATION,
            user_id=user_id,
            ttl=self.policy.email_verification_ttl,
        )
        session = await self.sessions.issue_platform_session(
            db, user_id=user_id, user_agent=user_agent
        )
        return RegisteredAccount(session=session, verification_token=verification.token)

    async def verify_email(self, db: AsyncSession, *, token: str) -> UUID:
        """Spend a verification link and mark the address proved.

        Returns the account it belonged to. Idempotent only in the sense that
        matters: the token is consumed atomically, so a link forwarded out of a
        mailbox or clicked twice works exactly once.

        Nothing else changes — no session is issued here. Registration already
        signed the person in, and a link opened days later in a different
        browser must not hand that browser a session it never authenticated
        for.
        """
        consumed = await self.tokens.consume(db, token, purpose=TokenPurpose.EMAIL_VERIFICATION)
        if consumed is None or consumed.user_id is None:
            raise PasswordPolicyError("This link is no longer valid.")

        credential = await db.get(PlatformCredential, consumed.user_id)
        if credential is None:
            raise PasswordPolicyError("This link is no longer valid.")

        if credential.email_verified_at is None:
            credential.email_verified_at = datetime.now(UTC)
            await db.flush()
        return consumed.user_id

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

    # ── Self-service requests (from the sign-in form) ────────────────────────
    #
    # Both endpoints below are unauthenticated and both send mail to an address
    # the caller chooses, which is the entire risk. Three rules make that safe,
    # and all three are in `_request_link`:
    #
    # 1. **The mail only ever goes to the account's own address.** Nothing the
    #    caller sends decides a recipient; the address is looked up and the
    #    stored one is used.
    # 2. **The answer is the same either way.** `None` for "no such account" and
    #    `None` for "already on cooldown" are indistinguishable to the router,
    #    which returns 204 regardless — so neither endpoint answers "does this
    #    person have an account here", which is the question sign-in spends an
    #    Argon2 verification to avoid answering.
    # 3. **One live link at a time.** Older ones are spent before a new one is
    #    minted, so a second request never leaves the first mail working.

    async def request_password_reset(self, db: AsyncSession, *, email: str) -> MailableLink | None:
        """A reset link somebody asked for by typing their address."""
        credential = await self._credential_for(db, email)
        if credential is None:
            return None
        return await self._request_link(
            db,
            credential=credential,
            purpose=TokenPurpose.PASSWORD_RESET,
            ttl=self.policy.password_reset_ttl,
        )

    async def request_email_verification(
        self, db: AsyncSession, *, email: str
    ) -> MailableLink | None:
        """A fresh verification link, for a registration whose mail went astray.

        Two accounts get `None`, and neither is a courtesy — a one-time link is
        a credential, and one sent for no reason is a credential for no reason:

        - **Already verified.** There is nothing left for the link to do.
        - **No password yet.** That is an account an operator provisioned and
          nobody has activated, and what it needs is the activation link, not
          this one. Mailing "confirm your address so you can sign in" to
          somebody who then still cannot sign in is a promise the flow does not
          keep — and spending the link would stamp the column without moving
          them one step closer to getting in.
        """
        credential = await self._credential_for(db, email)
        if (
            credential is None
            or credential.email_verified_at is not None
            or credential.password_hash is None
        ):
            return None
        return await self._request_link(
            db,
            credential=credential,
            purpose=TokenPurpose.EMAIL_VERIFICATION,
            ttl=self.policy.email_verification_ttl,
        )

    async def _credential_for(self, db: AsyncSession, email: str) -> PlatformCredential | None:
        return await db.scalar(
            select(PlatformCredential).where(
                PlatformCredential.normalized_email == normalize_email(email)
            )
        )

    async def _request_link(
        self,
        db: AsyncSession,
        *,
        credential: PlatformCredential,
        purpose: TokenPurpose,
        ttl: timedelta,
    ) -> MailableLink | None:
        if await self._mailed_recently(db, purpose=purpose, user_id=credential.user_id):
            return None

        # Before minting, not after: a caller who requests twice must end up
        # with one working link, not two, or the older mail keeps opening the
        # account after the newer one has been used.
        await self.tokens.invalidate_outstanding(db, purpose=purpose, user_id=credential.user_id)
        issued = await self.tokens.issue_for_user(
            db, purpose=purpose, user_id=credential.user_id, ttl=ttl
        )
        user = await db.get(InternalUser, credential.user_id)
        return MailableLink(
            email=credential.normalized_email,
            display_name=user.display_name if user else None,
            token=issued.token,
        )

    async def _mailed_recently(
        self, db: AsyncSession, *, purpose: TokenPurpose, user_id: UUID
    ) -> bool:
        """Is there a live link of this purpose younger than the cooldown?

        Derived from `auth_tokens` rather than from a counter of its own. A
        token row *is* the record of a mail having been sent, so a separate
        table would be a second thing to keep in step with the first — and the
        rows are already deleted with the account they belong to.

        `consumed_at IS NULL` matters: somebody who spent their link and now
        needs another one is not the abuse this guards against.
        """
        since = datetime.now(UTC) - self.policy.self_service_mail_cooldown
        recent = await db.scalar(
            select(AuthToken.id).where(
                AuthToken.user_id == user_id,
                AuthToken.purpose == purpose,
                AuthToken.consumed_at.is_(None),
                AuthToken.created_at > since,
            )
        )
        return recent is not None

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
        # Spending this link *is* the proof. It reached the person either
        # through their mailbox (`--reset`) or from an operator's hand
        # (`--activate`, D-083 §8), and both are stronger evidence than a
        # second mail round-trip would be. Without this the four accounts
        # carried over from Clerk would set a password and then be refused for
        # a verification they were never sent.
        if credential.email_verified_at is None:
            credential.email_verified_at = datetime.now(UTC)
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
