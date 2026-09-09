"""Sign-in, registration and reset, with the refusals that carry the security.

Happy paths are two tests here. The rest are the states somebody must not be
able to get a session out of, plus the two properties that are easy to state and
easy to lose: a reset ends every session of the identity, and a lockout can
never become a way to keep somebody out for good.
"""

from collections.abc import AsyncIterator
from datetime import UTC, datetime, timedelta
from uuid import UUID, uuid4

import pytest
from sqlalchemy import delete, func, select, update
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from psihointegritet.modules.identity.auth.platform_accounts import (
    AuthenticationError,
    AuthFailureReason,
    PasswordPolicyError,
    PlatformAuthService,
    RegistrationError,
)
from psihointegritet.modules.identity.auth.policy import AuthPolicy
from psihointegritet.modules.identity.auth.sessions import SessionService
from psihointegritet.modules.identity.auth_models import (
    AuthSession,
    AuthToken,
    PlatformCredential,
    SessionKind,
)
from psihointegritet.modules.identity.models import InternalUser
from tests.integration.conftest import test_database_url as _test_database_url

#: Argon2 turned down so the suite is not dominated by key derivation, and the
#: lockout tiers compressed so a test can reach the ceiling. Passed to the
#: service, which derives every sub-service from it — the reason
#: `PlatformAuthService` builds them rather than defaulting them separately.
POLICY = AuthPolicy(
    argon2_memory_cost=8,
    argon2_time_cost=1,
    argon2_parallelism=1,
    lockout_tiers=((2, timedelta(minutes=1)), (4, timedelta(minutes=5))),
)
#: Test fixtures, not credentials. Named rather than inlined so `ruff`'s
#: hardcoded-password rule stays useful instead of being suppressed at
#: fifteen call sites.
PASSWORD = "a-perfectly-fine-password"  # noqa: S105
NEW_PASSWORD = "an-entirely-different-one"  # noqa: S105
THIRD_PASSWORD = "and-a-third-one-entirely"  # noqa: S105
WRONG = "not-the-password"
TOO_SHORT = "short"


@pytest.fixture
async def engine() -> AsyncIterator[AsyncEngine]:
    eng = create_async_engine(_test_database_url())
    try:
        async with eng.connect():
            pass
    except (SQLAlchemyError, OSError) as error:
        await eng.dispose()
        pytest.skip(f"No test database reachable ({type(error).__name__}). Start compose.")
    yield eng
    await eng.dispose()


@pytest.fixture
def sessions(engine: AsyncEngine) -> async_sessionmaker[AsyncSession]:
    return async_sessionmaker(engine, expire_on_commit=False)


@pytest.fixture
def service() -> PlatformAuthService:
    return PlatformAuthService(POLICY)


@pytest.fixture
def email() -> str:
    return f"owner-{uuid4().hex[:10]}@example.test"


@pytest.fixture
async def account(
    sessions: async_sessionmaker[AsyncSession],
    service: PlatformAuthService,
    email: str,
) -> AsyncIterator[InternalUser]:
    """An existing account with a password already set, and its address proved.

    Verified on purpose: an account that can sign in is, by construction, one
    whose one-time link has been spent — either mailed at registration or
    handed over by an operator (`--activate`). A fixture without
    `email_verified_at` would describe a state the product refuses, and every
    sign-in test built on it would be measuring the refusal instead of the
    thing it names.
    """
    user = InternalUser(external_auth_id=f"user_{uuid4().hex[:8]}", email=email)
    async with sessions() as session:
        session.add(user)
        await session.flush()
        session.add(
            PlatformCredential(
                user_id=user.id,
                normalized_email=email,
                password_hash=service.passwords.hash(PASSWORD),
                email_verified_at=datetime.now(UTC),
            )
        )
        await session.commit()

    yield user

    await _purge(sessions, user.id)


async def _account_behind(service: PlatformAuthService, db: AsyncSession, token: str) -> UUID:
    """The identity a session token names, one line after it was issued.

    `resolve` is optional-returning because a token can be unknown, revoked or
    expired — correct on the production path and impossible here, where
    `register` handed this one over a statement ago. Asserted rather than
    silenced with a cast: if a change ever stops registration issuing a usable
    session, this fails naming that, instead of somewhere downstream on an
    attribute of `None`.
    """
    resolved = await service.sessions.resolve(db, token, kind=SessionKind.PLATFORM)
    assert resolved is not None, "register issued a session that does not resolve"
    assert resolved.user_id is not None, "a platform session must name a user"
    return resolved.user_id


async def _purge(sessions: async_sessionmaker[AsyncSession], user_id: UUID) -> None:
    async with sessions() as session:
        await session.execute(delete(AuthToken).where(AuthToken.user_id == user_id))
        await session.execute(delete(AuthSession).where(AuthSession.user_id == user_id))
        await session.execute(
            delete(PlatformCredential).where(PlatformCredential.user_id == user_id)
        )
        await session.execute(delete(InternalUser).where(InternalUser.id == user_id))
        await session.commit()


# ── Sign in ──────────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_the_right_password_issues_a_session(
    sessions: async_sessionmaker[AsyncSession],
    service: PlatformAuthService,
    account: InternalUser,
    email: str,
) -> None:
    async with sessions() as session:
        issued = await service.authenticate(session, email=email, password=PASSWORD)
        await session.commit()

    async with sessions() as session:
        resolved = await service.sessions.resolve(session, issued.token, kind=SessionKind.PLATFORM)
        assert resolved is not None
        assert resolved.user_id == account.id


@pytest.mark.asyncio
async def test_the_address_is_matched_case_insensitively(
    sessions: async_sessionmaker[AsyncSession],
    service: PlatformAuthService,
    account: InternalUser,
    email: str,
) -> None:
    """`Owner@…` and `owner@…` are one account, not two.

    Normalisation lives in one function for this reason: two definitions of
    "the same address" is how a second account quietly appears for a person who
    typed their own email with a capital letter.
    """
    async with sessions() as session:
        assert await service.authenticate(session, email=f"  {email.upper()}  ", password=PASSWORD)
        await session.commit()


@pytest.mark.asyncio
async def test_every_refusal_looks_the_same_from_outside(
    sessions: async_sessionmaker[AsyncSession],
    service: PlatformAuthService,
    account: InternalUser,
    email: str,
) -> None:
    """Four different causes, one exception type — no oracle for who exists."""
    async with sessions() as session:
        with pytest.raises(AuthenticationError) as wrong:
            await service.authenticate(session, email=email, password=WRONG)
        assert wrong.value.reason is AuthFailureReason.WRONG_PASSWORD
        await session.commit()

    async with sessions() as session:
        with pytest.raises(AuthenticationError) as unknown:
            await service.authenticate(session, email="nobody-here@example.test", password=PASSWORD)
        assert unknown.value.reason is AuthFailureReason.NO_SUCH_ACCOUNT


@pytest.mark.asyncio
async def test_an_account_with_no_password_yet_cannot_be_signed_into(
    sessions: async_sessionmaker[AsyncSession],
    service: PlatformAuthService,
    account: InternalUser,
    email: str,
) -> None:
    """The state every account migrated off Clerk starts in (AUTH-5).

    `password_hash IS NULL` must refuse like a wrong password, not admit and
    not crash — an empty string or `None` slipping into the verifier is how a
    migration turns into an open door.
    """
    async with sessions() as session:
        await session.execute(
            update(PlatformCredential)
            .where(PlatformCredential.user_id == account.id)
            .values(password_hash=None)
        )
        await session.commit()

    async with sessions() as session:
        for attempt in (PASSWORD, "", "None"):
            with pytest.raises(AuthenticationError) as error:
                await service.authenticate(session, email=email, password=attempt)
            assert error.value.reason is AuthFailureReason.PASSWORD_NOT_SET


@pytest.mark.asyncio
async def test_a_deactivated_account_is_refused_even_with_the_right_password(
    sessions: async_sessionmaker[AsyncSession],
    service: PlatformAuthService,
    account: InternalUser,
    email: str,
) -> None:
    async with sessions() as session:
        await session.execute(
            update(InternalUser).where(InternalUser.id == account.id).values(is_active=False)
        )
        await session.commit()

    async with sessions() as session:
        with pytest.raises(AuthenticationError) as error:
            await service.authenticate(session, email=email, password=PASSWORD)
        assert error.value.reason is AuthFailureReason.ACCOUNT_DISABLED


@pytest.mark.asyncio
async def test_a_successful_sign_in_upgrades_a_hash_made_with_weaker_parameters(
    sessions: async_sessionmaker[AsyncSession],
    account: InternalUser,
    email: str,
) -> None:
    """Raising the Argon2 cost must not require a migration or a forced reset.

    The hash is rewritten during the one moment the plaintext exists, so
    accounts upgrade as people come back.
    """
    weak = PlatformAuthService(
        AuthPolicy(argon2_memory_cost=8, argon2_time_cost=1, argon2_parallelism=1)
    )
    stronger = PlatformAuthService(
        AuthPolicy(argon2_memory_cost=64, argon2_time_cost=2, argon2_parallelism=1)
    )

    async with sessions() as session:
        await session.execute(
            update(PlatformCredential)
            .where(PlatformCredential.user_id == account.id)
            .values(password_hash=weak.passwords.hash(PASSWORD))
        )
        await session.commit()

    async with sessions() as session:
        before = await session.get(PlatformCredential, account.id)
        assert before is not None and before.password_hash is not None
        assert stronger.passwords.needs_rehash(before.password_hash)

    async with sessions() as session:
        await stronger.authenticate(session, email=email, password=PASSWORD)
        await session.commit()

    async with sessions() as session:
        after = await session.get(PlatformCredential, account.id)
        assert after is not None and after.password_hash is not None
        assert not stronger.passwords.needs_rehash(after.password_hash)
        # And the same password still works against the new hash.
        assert stronger.passwords.verify(after.password_hash, PASSWORD)


# ── Lockout, and the denial-of-service it must not become ────────────────────


@pytest.mark.asyncio
async def test_the_throttle_refuses_even_a_correct_password(
    sessions: async_sessionmaker[AsyncSession],
    service: PlatformAuthService,
    account: InternalUser,
    email: str,
) -> None:
    """Otherwise the throttle is decorative.

    Verifying during a lock and admitting a correct password sounds kinder and
    removes the protection entirely — an attacker must submit a guess to learn
    whether it was right, so "check it anyway" is "keep guessing".
    """
    for _ in range(POLICY.first_lockout_threshold):
        async with sessions() as session:
            with pytest.raises(AuthenticationError):
                await service.authenticate(session, email=email, password=WRONG)
            await session.commit()

    async with sessions() as session:
        with pytest.raises(AuthenticationError) as error:
            await service.authenticate(session, email=email, password=PASSWORD)
        assert error.value.reason is AuthFailureReason.THROTTLED


@pytest.mark.asyncio
async def test_a_burst_of_attempts_cannot_escalate_past_the_first_tier(
    sessions: async_sessionmaker[AsyncSession],
    service: PlatformAuthService,
    account: InternalUser,
    email: str,
) -> None:
    """The denial-of-service question, asked directly.

    Somebody who knows an address can spend that account's budget on purpose.
    Forty requests in a row is exactly that attack — and it buys the shortest
    lock the policy has, because attempts made *during* a lock are refused
    without being counted. Every further tier costs the attacker a full wait it
    cannot skip, so the damage from a burst is fixed and small.
    """
    for _ in range(40):
        async with sessions() as session:
            with pytest.raises(AuthenticationError):
                await service.authenticate(session, email=email, password=WRONG)
            await session.commit()

    async with sessions() as session:
        credential = await session.get(PlatformCredential, account.id)
        assert credential is not None
        # Not 40. The counter stopped the moment the first lock took hold.
        assert credential.failed_attempts == POLICY.first_lockout_threshold
        assert credential.locked_until is not None

        shortest = min(duration for _, duration in POLICY.lockout_tiers)
        assert credential.locked_until - datetime.now(UTC) <= shortest


@pytest.mark.asyncio
async def test_the_longest_lock_the_policy_can_ever_impose_is_the_top_tier(
    sessions: async_sessionmaker[AsyncSession],
    service: PlatformAuthService,
    account: InternalUser,
    email: str,
) -> None:
    """Escalation stops. A lockout is a delay with a ceiling, never an outage.

    Reached here by writing the failure count directly, because getting there
    honestly would mean waiting out a lock per attempt — which is itself the
    property the test above asserts.
    """
    async with sessions() as session:
        await session.execute(
            update(PlatformCredential)
            .where(PlatformCredential.user_id == account.id)
            .values(failed_attempts=999, locked_until=None)
        )
        await session.commit()

    async with sessions() as session:
        with pytest.raises(AuthenticationError):
            await service.authenticate(session, email=email, password=WRONG)
        await session.commit()

    async with sessions() as session:
        credential = await session.get(PlatformCredential, account.id)
        assert credential is not None
        assert credential.locked_until is not None
        worst_case = max(duration for _, duration in POLICY.lockout_tiers)
        assert credential.locked_until - datetime.now(UTC) <= worst_case
        # A wait, not a state somebody has to be talked out of by support.
        assert service.lockout.check(credential).retry_after is not None


@pytest.mark.asyncio
async def test_a_password_reset_releases_a_lock_somebody_else_caused(
    sessions: async_sessionmaker[AsyncSession],
    service: PlatformAuthService,
    account: InternalUser,
    email: str,
) -> None:
    """The escape hatch that makes per-account lockout acceptable at all.

    Whoever can read the mailbox gets back in immediately, without waiting out
    an attacker who is still hammering the address.
    """
    for _ in range(POLICY.first_lockout_threshold):
        async with sessions() as session:
            with pytest.raises(AuthenticationError):
                await service.authenticate(session, email=email, password=WRONG)
            await session.commit()

    async with sessions() as session:
        token = await service.issue_password_reset(session, email=email)
        assert token is not None
        await session.commit()

    async with sessions() as session:
        await service.reset_password(session, token=token, new_password=NEW_PASSWORD)
        await session.commit()

    async with sessions() as session:
        credential = await session.get(PlatformCredential, account.id)
        assert credential is not None
        assert credential.failed_attempts == 0
        assert credential.locked_until is None

    async with sessions() as session:
        assert await service.authenticate(session, email=email, password=NEW_PASSWORD)
        await session.commit()


# ── Reset ────────────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_a_reset_ends_every_session_of_that_identity(
    sessions: async_sessionmaker[AsyncSession],
    service: PlatformAuthService,
    account: InternalUser,
    email: str,
) -> None:
    """Three devices, one reset, nothing left signed in.

    A reset is what somebody does when they believe the account is compromised.
    Leaving the intruder's session alive would make the exercise pointless, so
    revocation is deliberately all sessions of the identity rather than all but
    the current one.
    """
    tokens: list[str] = []
    async with sessions() as session:
        for _ in range(3):
            issued = await SessionService(POLICY).issue_platform_session(
                session, user_id=account.id
            )
            tokens.append(issued.token)
        await session.commit()

    async with sessions() as session:
        reset_token = await service.issue_password_reset(session, email=email)
        assert reset_token is not None
        await session.commit()

    async with sessions() as session:
        await service.reset_password(session, token=reset_token, new_password=NEW_PASSWORD)
        await session.commit()

    async with sessions() as session:
        for token in tokens:
            assert (
                await service.sessions.resolve(session, token, kind=SessionKind.PLATFORM)
            ) is None


@pytest.mark.asyncio
async def test_a_second_forgot_password_click_does_not_leave_a_live_link_behind(
    sessions: async_sessionmaker[AsyncSession],
    service: PlatformAuthService,
    account: InternalUser,
    email: str,
) -> None:
    """The older mail must stop working the moment the newer one is used."""
    async with sessions() as session:
        first = await service.issue_password_reset(session, email=email)
        second = await service.issue_password_reset(session, email=email)
        assert first is not None and second is not None
        await session.commit()

    async with sessions() as session:
        await service.reset_password(session, token=second, new_password=NEW_PASSWORD)
        await session.commit()

    async with sessions() as session:
        with pytest.raises(PasswordPolicyError):
            await service.reset_password(session, token=first, new_password=THIRD_PASSWORD)


@pytest.mark.asyncio
async def test_a_reset_link_cannot_be_spent_twice(
    sessions: async_sessionmaker[AsyncSession],
    service: PlatformAuthService,
    account: InternalUser,
    email: str,
) -> None:
    async with sessions() as session:
        token = await service.issue_password_reset(session, email=email)
        assert token is not None
        await session.commit()

    async with sessions() as session:
        await service.reset_password(session, token=token, new_password=NEW_PASSWORD)
        await session.commit()

    async with sessions() as session:
        with pytest.raises(PasswordPolicyError):
            await service.reset_password(session, token=token, new_password=THIRD_PASSWORD)


@pytest.mark.asyncio
async def test_an_expired_reset_link_is_refused(
    sessions: async_sessionmaker[AsyncSession],
    service: PlatformAuthService,
    account: InternalUser,
    email: str,
) -> None:
    async with sessions() as session:
        token = await service.issue_password_reset(session, email=email)
        assert token is not None
        await session.execute(
            update(AuthToken)
            .where(AuthToken.user_id == account.id)
            .values(expires_at=datetime.now(UTC) - timedelta(seconds=1))
        )
        await session.commit()

    async with sessions() as session:
        with pytest.raises(PasswordPolicyError):
            await service.reset_password(session, token=token, new_password=NEW_PASSWORD)

    # And it stays unspent, so nothing was consumed by an attempt that failed.
    async with sessions() as session:
        row = await session.scalar(select(AuthToken).where(AuthToken.user_id == account.id))
        assert row is not None
        assert row.consumed_at is None


# ── Self-service requests from the sign-in form ──────────────────────────────


@pytest.mark.asyncio
async def test_a_self_service_reset_mails_the_stored_address_not_the_typed_one(
    sessions: async_sessionmaker[AsyncSession],
    service: PlatformAuthService,
    account: InternalUser,
    email: str,
) -> None:
    """The recipient is never request input.

    An endpoint anybody may call, that mails a one-time link, must not let the
    caller influence where it lands. Asked with different capitalisation here
    because that is the cheapest version of the attack — and the one a
    case-insensitive lookup makes easy to get wrong.
    """
    async with sessions() as session:
        link = await service.request_password_reset(session, email=email.upper())
        await session.commit()

    assert link is not None
    assert link.email == email


@pytest.mark.asyncio
async def test_a_second_reset_request_inside_the_cooldown_sends_nothing(
    sessions: async_sessionmaker[AsyncSession],
    service: PlatformAuthService,
    account: InternalUser,
    email: str,
) -> None:
    """What stops a held-down button from filling somebody's inbox."""
    async with sessions() as session:
        first = await service.request_password_reset(session, email=email)
        await session.commit()
    async with sessions() as session:
        second = await service.request_password_reset(session, email=email)
        await session.commit()

    assert first is not None
    assert second is None

    async with sessions() as session:
        live = await session.scalar(
            select(func.count())
            .select_from(AuthToken)
            .where(AuthToken.user_id == account.id, AuthToken.consumed_at.is_(None))
        )
    assert live == 1


@pytest.mark.asyncio
async def test_a_request_past_the_cooldown_leaves_only_the_newest_link_alive(
    sessions: async_sessionmaker[AsyncSession],
    service: PlatformAuthService,
    account: InternalUser,
    email: str,
) -> None:
    """Two mails, one working link.

    Otherwise the older mail still opens the account after the newer one has
    been used — which is the whole reason `reset_password` spends outstanding
    tokens, applied to the request side as well.
    """
    async with sessions() as session:
        first = await service.request_password_reset(session, email=email)
        await session.commit()
    assert first is not None

    # Age the first request past the cooldown rather than waiting for it.
    async with sessions() as session:
        await session.execute(
            update(AuthToken)
            .where(AuthToken.user_id == account.id)
            .values(created_at=datetime.now(UTC) - timedelta(hours=1))
        )
        await session.commit()

    async with sessions() as session:
        second = await service.request_password_reset(session, email=email)
        await session.commit()
    assert second is not None

    async with sessions() as session:
        with pytest.raises(PasswordPolicyError):
            await service.reset_password(session, token=first.token, new_password=NEW_PASSWORD)
    async with sessions() as session:
        await service.reset_password(session, token=second.token, new_password=NEW_PASSWORD)
        await session.commit()


@pytest.mark.asyncio
async def test_a_self_service_request_for_an_unknown_address_produces_nothing(
    sessions: async_sessionmaker[AsyncSession],
    service: PlatformAuthService,
) -> None:
    """Indistinguishable, to the router, from a request inside the cooldown.

    Both are `None` and both become 204, which is what keeps the endpoint from
    answering "does this person have an account here" — the question sign-in
    spends an Argon2 verification to avoid answering.
    """
    async with sessions() as session:
        assert await service.request_password_reset(session, email="nobody@example.test") is None
        assert (
            await service.request_email_verification(session, email="nobody@example.test") is None
        )


@pytest.mark.asyncio
async def test_verification_is_not_resent_to_an_address_already_verified(
    sessions: async_sessionmaker[AsyncSession],
    service: PlatformAuthService,
    account: InternalUser,
    email: str,
) -> None:
    """A live link in a mailbox for no reason is a credential for no reason.

    The `account` fixture is verified by construction, so this is the state a
    person reaches by clicking "resend" once too often after it already worked.
    """
    async with sessions() as session:
        assert await service.request_email_verification(session, email=email) is None


@pytest.mark.asyncio
async def test_verification_is_not_resent_to_an_account_awaiting_activation(
    sessions: async_sessionmaker[AsyncSession],
    service: PlatformAuthService,
    email: str,
) -> None:
    """What that account needs is the activation link, not this one.

    A credential with no password is somebody an operator provisioned and
    nobody has activated. Mailing them "confirm your address so you can sign
    in" is a promise the flow does not keep: spending the link stamps the
    column and leaves them exactly as locked out as before.
    """
    user = InternalUser(external_auth_id=f"user_{uuid4().hex[:8]}", email=email)
    async with sessions() as session:
        session.add(user)
        await session.flush()
        session.add(PlatformCredential(user_id=user.id, normalized_email=email))
        await session.commit()

    try:
        async with sessions() as session:
            assert await service.request_email_verification(session, email=email) is None
    finally:
        await _purge(sessions, user.id)


@pytest.mark.asyncio
async def test_an_unverified_account_can_ask_for_its_link_again(
    sessions: async_sessionmaker[AsyncSession],
    service: PlatformAuthService,
    email: str,
) -> None:
    """The case the button exists for: the registration mail never arrived."""
    async with sessions() as session:
        created = await service.register(session, email=email, password=PASSWORD)
        await session.commit()
        user_id = await _account_behind(service, session, created.session.token)

    try:
        # The registration link is outstanding, so the cooldown applies to it.
        async with sessions() as session:
            await session.execute(
                update(AuthToken)
                .where(AuthToken.user_id == user_id)
                .values(created_at=datetime.now(UTC) - timedelta(hours=1))
            )
            await session.commit()

        async with sessions() as session:
            link = await service.request_email_verification(session, email=email)
            await session.commit()
        assert link is not None

        async with sessions() as session:
            await service.verify_email(session, token=link.token)
            await session.commit()

        async with sessions() as session:
            await service.authenticate(session, email=email, password=PASSWORD)
            await session.commit()
    finally:
        await _purge(sessions, user_id)


@pytest.mark.asyncio
async def test_a_reset_for_an_unknown_address_issues_nothing(
    sessions: async_sessionmaker[AsyncSession],
    service: PlatformAuthService,
) -> None:
    async with sessions() as session:
        assert await service.issue_password_reset(session, email="nobody@example.test") is None


@pytest.mark.asyncio
async def test_a_short_password_is_refused_before_anything_is_written(
    sessions: async_sessionmaker[AsyncSession],
    service: PlatformAuthService,
    account: InternalUser,
    email: str,
) -> None:
    async with sessions() as session:
        token = await service.issue_password_reset(session, email=email)
        assert token is not None
        await session.commit()

    async with sessions() as session:
        with pytest.raises(PasswordPolicyError):
            await service.reset_password(session, token=token, new_password=TOO_SHORT)

    # The link survives a rejected password: a typo must not burn the one way in.
    async with sessions() as session:
        await service.reset_password(session, token=token, new_password=NEW_PASSWORD)
        await session.commit()


# ── Register ─────────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_registration_creates_an_account_that_can_reach_nothing(
    sessions: async_sessionmaker[AsyncSession],
    service: PlatformAuthService,
    email: str,
) -> None:
    """Signed in, and authorized for exactly nothing.

    This is what makes an open registration endpoint safe: privilege comes from
    `organization_memberships`, never from having an account.
    """
    async with sessions() as session:
        account_created = await service.register(session, email=email, password=PASSWORD)
        await session.commit()

    async with sessions() as session:
        resolved = await service.sessions.resolve(
            session, account_created.session.token, kind=SessionKind.PLATFORM
        )
        assert resolved is not None and resolved.user_id is not None
        user = await session.get(InternalUser, resolved.user_id)
        assert user is not None
        assert user.external_auth_id.startswith("pdc:")
        assert user.is_superadmin is False
        assert user.is_active is True
        credential = await session.get(PlatformCredential, resolved.user_id)
        assert credential is not None
        # Unverified until the mailed link is spent — and that now refuses
        # sign-in, which is what stops an open endpoint being an address squat.
        assert credential.email_verified_at is None
        assert account_created.verification_token
        user_id = resolved.user_id

    await _purge(sessions, user_id)


@pytest.mark.asyncio
async def test_an_address_can_only_be_registered_once(
    sessions: async_sessionmaker[AsyncSession],
    service: PlatformAuthService,
    account: InternalUser,
    email: str,
) -> None:
    """PostgreSQL arbitrates; the application does not read-then-write and hope."""
    async with sessions() as session:
        with pytest.raises(RegistrationError):
            await service.register(session, email=email.upper(), password=PASSWORD)


@pytest.mark.asyncio
async def test_registration_cannot_claim_an_address_awaiting_activation(
    sessions: async_sessionmaker[AsyncSession],
    service: PlatformAuthService,
    email: str,
) -> None:
    """The gap every provisioned person passes through, closed at the database.

    An operator creates the identity with an address and no credential; the
    address stays unclaimed until the activation link is spent. Before
    `uq_internal_users_email` existed, open registration handed that window to
    whoever asked first — 201, a duplicate `internal_users` row, and the
    credential slot taken. The real owner's activation then failed on the
    credential constraint with nothing they could do about it.

    The verification gate does not cover this. It stops the squatter signing
    in; it does not stop them holding the address, which is the harm.

    Asserted case-insensitively because a mailbox is one mailbox: an index on
    the raw column would have let one capital letter walk straight through.
    """
    invited = InternalUser(external_auth_id=f"user_{uuid4().hex[:8]}", email=email)
    async with sessions() as session:
        session.add(invited)
        await session.commit()

    try:
        async with sessions() as session:
            with pytest.raises(RegistrationError):
                await service.register(session, email=email.upper(), password=PASSWORD)

        async with sessions() as session:
            assert (
                await session.scalar(
                    select(func.count())
                    .select_from(InternalUser)
                    .where(func.lower(InternalUser.email) == email.lower())
                )
            ) == 1
    finally:
        await _purge(sessions, invited.id)


@pytest.mark.asyncio
async def test_registration_refuses_a_password_shorter_than_policy(
    sessions: async_sessionmaker[AsyncSession],
    service: PlatformAuthService,
    email: str,
) -> None:
    async with sessions() as session:
        with pytest.raises(PasswordPolicyError):
            await service.register(session, email=email, password=TOO_SHORT)

    async with sessions() as session:
        assert (
            await session.scalar(
                select(PlatformCredential).where(PlatformCredential.normalized_email == email)
            )
        ) is None


@pytest.mark.asyncio
async def test_a_registered_account_cannot_sign_in_before_it_proves_the_address(
    sessions: async_sessionmaker[AsyncSession],
    service: PlatformAuthService,
    email: str,
) -> None:
    """The hole this closes: an open endpoint that could squat any address.

    Without it, anyone could register the address of a colleague who has not
    been provisioned yet, and provisioning them afterwards would need an
    operator to delete a row.
    """
    async with sessions() as session:
        created = await service.register(session, email=email, password=PASSWORD)
        await session.commit()
        user_id = await _account_behind(service, session, created.session.token)

    async with sessions() as session:
        with pytest.raises(AuthenticationError) as refusal:
            await service.authenticate(session, email=email, password=PASSWORD)
        assert refusal.value.reason is AuthFailureReason.EMAIL_NOT_VERIFIED

    async with sessions() as session:
        await service.verify_email(session, token=created.verification_token)
        await session.commit()

    async with sessions() as session:
        issued = await service.authenticate(session, email=email, password=PASSWORD)
        assert issued.token

    await _purge(sessions, user_id)


@pytest.mark.asyncio
async def test_a_verification_link_is_spent_exactly_once(
    sessions: async_sessionmaker[AsyncSession],
    service: PlatformAuthService,
    email: str,
) -> None:
    """A link forwarded out of a mailbox, or clicked twice, works once."""
    async with sessions() as session:
        created = await service.register(session, email=email, password=PASSWORD)
        await session.commit()
        user_id = await _account_behind(service, session, created.session.token)

    async with sessions() as session:
        await service.verify_email(session, token=created.verification_token)
        await session.commit()

    async with sessions() as session:
        with pytest.raises(PasswordPolicyError):
            await service.verify_email(session, token=created.verification_token)

    await _purge(sessions, user_id)


@pytest.mark.asyncio
async def test_setting_a_password_from_a_link_proves_the_address_too(
    sessions: async_sessionmaker[AsyncSession],
    service: PlatformAuthService,
    email: str,
) -> None:
    """Why the four accounts carried over from Clerk are not locked out.

    They were activated by an operator, never sent a verification mail. The
    link they *were* given is the proof, so spending it stamps the column —
    otherwise every one of them would set a password and then be refused for a
    verification nobody could send them.
    """
    user = InternalUser(external_auth_id=f"user_{uuid4().hex[:8]}", email=email)
    async with sessions() as session:
        session.add(user)
        await session.flush()
        session.add(PlatformCredential(user_id=user.id, normalized_email=email, password_hash=None))
        await session.commit()

    async with sessions() as session:
        token = await service.issue_password_reset(session, email=email)
        assert token is not None
        await session.commit()

    async with sessions() as session:
        await service.reset_password(session, token=token, new_password=PASSWORD)
        await session.commit()

    async with sessions() as session:
        credential = await session.get(PlatformCredential, user.id)
        assert credential is not None and credential.email_verified_at is not None
        issued = await service.authenticate(session, email=email, password=PASSWORD)
        assert issued.token

    await _purge(sessions, user.id)
