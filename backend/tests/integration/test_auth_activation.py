"""AUTH-5: five existing people get passwords, and keep everything else.

The headline test is `test_activation_changes_the_credential_and_nothing_else`.
It records the identity id, the memberships and the therapist link before
activation, walks the whole flow — prepare, open the link, choose a password,
sign in — and asserts that `resolve_staff_actor` comes back with the same actor
it would have returned under Clerk.

That is the only claim AUTH-5 makes, and it is the one that would be expensive
to be wrong about: `internal_users.id` is the foreign key under appointments,
intake cases, content ownership and audit rows, so an activation that
"recreated" an account would detach a therapist from their own caseload while
every screen kept rendering.
"""

from collections.abc import AsyncIterator
from datetime import UTC, datetime, timedelta
from uuid import UUID, uuid4

import pytest
from sqlalchemy import delete, select, update
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from psihointegritet.infrastructure.auth.identity import IdentityClaims
from psihointegritet.infrastructure.auth.pdc_session import PdcSessionVerifier
from psihointegritet.modules.guidance.authorization import resolve_staff_actor
from psihointegritet.modules.identity.auth.activation import (
    AccountStatus,
    ActivationError,
    ActivationRefusal,
    PlatformActivationService,
)
from psihointegritet.modules.identity.auth.platform_accounts import (
    AuthenticationError,
    AuthFailureReason,
    PasswordPolicyError,
    PlatformAuthService,
)
from psihointegritet.modules.identity.auth.policy import AuthPolicy
from psihointegritet.modules.identity.auth_models import (
    AuthSession,
    AuthToken,
    PlatformCredential,
)
from psihointegritet.modules.identity.models import (
    InternalUser,
    MembershipRole,
    MembershipStatus,
    OrganizationMembership,
)
from psihointegritet.modules.organizations.models import Organization
from tests.integration.conftest import test_database_url as _test_database_url

POLICY = AuthPolicy(argon2_memory_cost=8, argon2_time_cost=1, argon2_parallelism=1)
CHOSEN_PASSWORD = "a-password-nobody-else-has-held"  # noqa: S105 - test fixture
SECOND_PASSWORD = "and-then-a-different-one"  # noqa: S105 - test fixture

#: The Clerk subject a migrated identity carries. Kept in this shape on purpose:
#: it is what the real rows hold, and the point of the tests below is that it
#: keeps working untouched.
CLERK_SUBJECT_PREFIX = "user_"


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
def activation() -> PlatformActivationService:
    return PlatformActivationService(POLICY)


@pytest.fixture
def auth() -> PlatformAuthService:
    return PlatformAuthService(POLICY)


async def _purge(sessions: async_sessionmaker[AsyncSession], user_ids: list[UUID]) -> None:
    async with sessions() as session:
        await session.execute(delete(AuthToken).where(AuthToken.user_id.in_(user_ids)))
        await session.execute(delete(AuthSession).where(AuthSession.user_id.in_(user_ids)))
        await session.execute(
            delete(PlatformCredential).where(PlatformCredential.user_id.in_(user_ids))
        )
        await session.execute(
            delete(OrganizationMembership).where(OrganizationMembership.user_id.in_(user_ids))
        )
        await session.execute(delete(InternalUser).where(InternalUser.id.in_(user_ids)))
        await session.commit()


@pytest.fixture
async def migrated(
    sessions: async_sessionmaker[AsyncSession],
) -> AsyncIterator[tuple[Organization, InternalUser]]:
    """A therapist exactly as Clerk left her: a subject, an email, memberships.

    No `platform_credentials` row, because Clerk held the password. This is the
    state every one of the five accounts is in before AUTH-5 runs.
    """
    suffix = uuid4().hex[:8]
    organization = Organization(slug=f"activation-{suffix}", display_name="Activation tenant")
    user = InternalUser(
        external_auth_id=f"{CLERK_SUBJECT_PREFIX}{suffix}",
        email=f"Sanja.{suffix}@Example.Test",
        display_name="Sanja Neuer",
    )
    async with sessions() as session:
        session.add_all([organization, user])
        await session.flush()
        session.add_all(
            [
                OrganizationMembership(
                    organization_id=organization.id,
                    user_id=user.id,
                    role=role,
                    status=MembershipStatus.ACTIVE,
                )
                for role in (MembershipRole.ORG_ADMIN, MembershipRole.THERAPIST)
            ]
        )
        await session.commit()

    yield organization, user

    await _purge(sessions, [user.id])
    async with sessions() as session:
        await session.execute(delete(Organization).where(Organization.id == organization.id))
        await session.commit()


# ── The claim AUTH-5 makes ───────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_activation_changes_the_credential_and_nothing_else(
    sessions: async_sessionmaker[AsyncSession],
    activation: PlatformActivationService,
    auth: PlatformAuthService,
    migrated: tuple[Organization, InternalUser],
) -> None:
    organization, user = migrated

    async with sessions() as session:
        before = await resolve_staff_actor(session, _clerk_era_claims(user), organization.slug)

    async with sessions() as session:
        outcome = await activation.activate(session, user)
        await session.commit()
    assert outcome.credential_created
    assert outcome.awaiting_password

    # The link, opened. This is the same endpoint a forgotten password uses.
    async with sessions() as session:
        await auth.reset_password(session, token=outcome.token, new_password=CHOSEN_PASSWORD)
        await session.commit()

    async with sessions() as session:
        issued = await auth.authenticate(session, email=user.email or "", password=CHOSEN_PASSWORD)
        await session.commit()

    claims = await PdcSessionVerifier(sessions).verify(issued.token)
    async with sessions() as session:
        after = await resolve_staff_actor(session, claims, organization.slug)

    # Byte for byte the same actor: same identity row, same tenant, same roles.
    assert after == before
    assert after.user_id == user.id

    async with sessions() as session:
        refreshed = await session.get(InternalUser, user.id)
        assert refreshed is not None
        # The subject is untouched, Clerk shape and all. Rewriting it would
        # break `provision_staff.py`, which still looks accounts up by it.
        assert refreshed.external_auth_id == user.external_auth_id
        assert refreshed.display_name == "Sanja Neuer"
        memberships = list(
            await session.scalars(
                select(OrganizationMembership).where(OrganizationMembership.user_id == user.id)
            )
        )
        assert len(memberships) == 2
        assert all(m.status is MembershipStatus.ACTIVE for m in memberships)


def _clerk_era_claims(user: InternalUser) -> IdentityClaims:
    """The claims Clerk would have produced for this account.

    Built directly rather than through a verifier: the point of the comparison
    is what `resolve_staff_actor` answered *before* AUTH-5 existed.
    """
    return IdentityClaims(subject=user.external_auth_id, email=user.email, session_id="clerk-era")


# ── Before the link is used ──────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_a_prepared_account_still_cannot_be_signed_into(
    sessions: async_sessionmaker[AsyncSession],
    activation: PlatformActivationService,
    auth: PlatformAuthService,
    migrated: tuple[Organization, InternalUser],
) -> None:
    """Reachable, not enterable.

    `password_hash IS NULL` is refused with the same generic message as a wrong
    password, so preparing an account discloses nothing and opens nothing.
    """
    _, user = migrated
    async with sessions() as session:
        await activation.activate(session, user)
        await session.commit()

    async with sessions() as session:
        for attempt in (CHOSEN_PASSWORD, "", "null"):
            with pytest.raises(AuthenticationError) as error:
                await auth.authenticate(session, email=user.email or "", password=attempt)
            assert error.value.reason is AuthFailureReason.PASSWORD_NOT_SET


@pytest.mark.asyncio
async def test_no_clerk_password_is_carried_across(
    sessions: async_sessionmaker[AsyncSession],
    activation: PlatformActivationService,
    migrated: tuple[Organization, InternalUser],
) -> None:
    """The credential is written empty, deliberately.

    Clerk's hashes were never ours to read. Anything other than `NULL` here
    would mean somebody had invented a password on this person's behalf.
    """
    _, user = migrated
    async with sessions() as session:
        await activation.activate(session, user)
        await session.commit()

    async with sessions() as session:
        credential = await session.get(PlatformCredential, user.id)
        assert credential is not None
        assert credential.password_hash is None
        assert credential.email_verified_at is None
        # Normalised, so `Sanja.x@Example.Test` signs in as she types it.
        assert credential.normalized_email == (user.email or "").lower()


# ── Running it twice ─────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_a_second_run_never_overwrites_a_password_already_chosen(
    sessions: async_sessionmaker[AsyncSession],
    activation: PlatformActivationService,
    auth: PlatformAuthService,
    migrated: tuple[Organization, InternalUser],
) -> None:
    """The destructive re-run, refused.

    An operator will run this again — for a sixth person, or because the first
    run's output scrolled away. Whoever was quickest to set a password must not
    be silently reset to `NULL` and locked out.
    """
    _, user = migrated
    async with sessions() as session:
        first = await activation.activate(session, user)
        await session.commit()
    async with sessions() as session:
        await auth.reset_password(session, token=first.token, new_password=CHOSEN_PASSWORD)
        await session.commit()

    async with sessions() as session:
        second = await activation.activate(session, user)
        await session.commit()

    assert not second.credential_created
    assert not second.awaiting_password

    async with sessions() as session:
        assert await auth.authenticate(session, email=user.email or "", password=CHOSEN_PASSWORD)
        await session.commit()


@pytest.mark.asyncio
async def test_a_new_link_retires_the_previous_one(
    sessions: async_sessionmaker[AsyncSession],
    activation: PlatformActivationService,
    auth: PlatformAuthService,
    migrated: tuple[Organization, InternalUser],
) -> None:
    """Two live activation links for one account is one link too many.

    Without this, the older mail still opens the account after the newer link
    has been used and a password chosen.
    """
    _, user = migrated
    async with sessions() as session:
        first = await activation.activate(session, user)
        await session.commit()
    async with sessions() as session:
        second = await activation.activate(session, user)
        await session.commit()

    async with sessions() as session:
        with pytest.raises(PasswordPolicyError):
            await auth.reset_password(session, token=first.token, new_password=CHOSEN_PASSWORD)

    async with sessions() as session:
        await auth.reset_password(session, token=second.token, new_password=SECOND_PASSWORD)
        await session.commit()


@pytest.mark.asyncio
async def test_an_activation_link_is_single_use_and_expires(
    sessions: async_sessionmaker[AsyncSession],
    activation: PlatformActivationService,
    auth: PlatformAuthService,
    migrated: tuple[Organization, InternalUser],
) -> None:
    _, user = migrated
    async with sessions() as session:
        outcome = await activation.activate(session, user)
        await session.commit()

    # A week, not the hour a forgotten-password link gets: this one is handed
    # over out of band rather than requested, to somebody not expecting it.
    assert outcome.expires_at - datetime.now(UTC) > timedelta(days=6)

    async with sessions() as session:
        await auth.reset_password(session, token=outcome.token, new_password=CHOSEN_PASSWORD)
        await session.commit()

    async with sessions() as session:
        with pytest.raises(PasswordPolicyError):
            await auth.reset_password(session, token=outcome.token, new_password=SECOND_PASSWORD)


# ── Accounts that cannot be activated ────────────────────────────────────────


@pytest.mark.asyncio
async def test_an_identity_with_no_address_is_refused_by_name(
    sessions: async_sessionmaker[AsyncSession],
    activation: PlatformActivationService,
) -> None:
    """The state most rows in a real database are in.

    Every Clerk account that signed in once without being provisioned has no
    email, and there is nothing to sign in with. Named rather than skipped
    silently, so an operator can see how many and decide.
    """
    user = InternalUser(external_auth_id=f"user_{uuid4().hex[:8]}", email=None)
    async with sessions() as session:
        session.add(user)
        await session.commit()

    try:
        async with sessions() as session:
            with pytest.raises(ActivationError) as error:
                await activation.activate(session, user)
            assert error.value.refusal is ActivationRefusal.NO_EMAIL
    finally:
        await _purge(sessions, [user.id])


@pytest.mark.asyncio
async def test_two_identities_sharing_one_address_are_refused_not_guessed(
    sessions: async_sessionmaker[AsyncSession],
    activation: PlatformActivationService,
    migrated: tuple[Organization, InternalUser],
) -> None:
    """A data problem to resolve by hand, not to paper over by picking one.

    Silently attaching the address to whichever row ran first would hand one
    person the other's workspace — and the two are told apart by nothing the
    application can see.
    """
    _, first = migrated
    twin = InternalUser(
        external_auth_id=f"user_{uuid4().hex[:8]}",
        email=(first.email or "").upper(),
    )
    async with sessions() as session:
        session.add(twin)
        await session.commit()

    try:
        async with sessions() as session:
            await activation.activate(session, first)
            await session.commit()

        async with sessions() as session:
            with pytest.raises(ActivationError) as error:
                await activation.activate(session, twin)
            assert error.value.refusal is ActivationRefusal.EMAIL_TAKEN
    finally:
        await _purge(sessions, [twin.id])


@pytest.mark.asyncio
async def test_a_deactivated_account_is_not_re_opened_by_activation(
    sessions: async_sessionmaker[AsyncSession],
    activation: PlatformActivationService,
    migrated: tuple[Organization, InternalUser],
) -> None:
    """Somebody closed this account. A link would quietly undo that."""
    _, user = migrated
    async with sessions() as session:
        await session.execute(
            update(InternalUser).where(InternalUser.id == user.id).values(is_active=False)
        )
        await session.commit()
        refreshed = await session.get(InternalUser, user.id)
        assert refreshed is not None

    async with sessions() as session:
        with pytest.raises(ActivationError) as error:
            await activation.activate(session, refreshed)
        assert error.value.refusal is ActivationRefusal.ACCOUNT_INACTIVE


# ── The operator's view ──────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_the_survey_says_who_can_sign_in_and_who_is_waiting(
    sessions: async_sessionmaker[AsyncSession],
    activation: PlatformActivationService,
    auth: PlatformAuthService,
    migrated: tuple[Organization, InternalUser],
) -> None:
    """The whole cutover in one table, so nobody is forgotten halfway through."""
    _, user = migrated

    async with sessions() as session:
        waiting = _row_for(await activation.survey(session), user.id)
    assert not waiting.has_credential
    assert not waiting.can_sign_in
    assert waiting.membership_count == 2

    async with sessions() as session:
        outcome = await activation.activate(session, user)
        await session.commit()

    async with sessions() as session:
        prepared = _row_for(await activation.survey(session), user.id)
    assert prepared.has_credential
    assert not prepared.has_password
    assert not prepared.can_sign_in

    async with sessions() as session:
        await auth.reset_password(session, token=outcome.token, new_password=CHOSEN_PASSWORD)
        await session.commit()

    async with sessions() as session:
        ready = _row_for(await activation.survey(session), user.id)
    assert ready.can_sign_in


def _row_for(rows: list[AccountStatus], user_id: UUID) -> AccountStatus:
    match = [row for row in rows if row.user_id == user_id]
    assert len(match) == 1, f"expected exactly one row for {user_id}, got {len(match)}"
    return match[0]
