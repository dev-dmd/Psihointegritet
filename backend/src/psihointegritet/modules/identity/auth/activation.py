"""Giving an existing account a password of its own (D-083, AUTH-5).

# What this is not

It is **not a password migration.** Clerk hashes were never ours to read, and
copying them would be the wrong thing even if they were. Each person gets a
one-time link and chooses a password nobody else has ever held.

# What must survive, exactly

``internal_users.id`` and every membership. That id is the foreign key under
appointments, intake cases, content ownership, publication events and audit
rows; a migration that "recreated" accounts would silently detach a therapist
from their own caseload while every screen kept rendering. So nothing here
inserts an ``internal_users`` row, and nothing here touches
``organization_memberships`` — the only write is a ``platform_credentials`` row
beside the identity that already exists.

``external_auth_id`` is left as it is, including its ``user_…`` shape. It is now
an opaque subject the engine reads from a row it has already loaded, so its
history costs nothing — while rewriting it would break ``roster.py``,
``provision_staff.py`` and ``provision_team.py``, all of which still look an
account up *by* that value. The next ``provision_staff.py --person maria`` would
then find nothing and create a second Maria. Renaming it belongs with removing
those Clerk keys, in AUTH-9.

# Re-running has to be safe

An operator will run this twice — for a sixth person, or because the first run's
output scrolled away. The second run must not overwrite a password somebody has
already set, which is why the credential is written with ``ON CONFLICT DO
NOTHING`` and never with an update.
"""

from dataclasses import dataclass
from datetime import datetime
from enum import StrEnum
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from psihointegritet.modules.identity.auth.one_time_tokens import OneTimeTokenService
from psihointegritet.modules.identity.auth.platform_accounts import normalize_email
from psihointegritet.modules.identity.auth.policy import (
    DEFAULT_AUTH_POLICY,
    AuthPolicy,
)
from psihointegritet.modules.identity.auth_models import PlatformCredential, TokenPurpose
from psihointegritet.modules.identity.models import (
    InternalUser,
    MembershipStatus,
    OrganizationMembership,
)


class ActivationRefusal(StrEnum):
    """Why an account could not be prepared. Reported to an operator, in full.

    Unlike a sign-in refusal, these are not shown to the public and there is
    nothing to disclose: whoever runs the script is already looking at the
    database. A vague "could not activate" would just mean guessing which of
    three different fixes applies.
    """

    #: No address on the `internal_users` row, so there is nothing to sign in
    #: with. Every `race-user-*` and every Clerk account that signed in once
    #: without being provisioned is in this state.
    NO_EMAIL = "no_email"
    #: The address already belongs to a different account's credential. Two
    #: `internal_users` rows sharing one address is a data problem to resolve by
    #: hand, not something to paper over by picking one.
    EMAIL_TAKEN = "email_taken"
    #: Deactivated. Handing out a link would be re-opening an account somebody
    #: deliberately closed.
    ACCOUNT_INACTIVE = "account_inactive"


class ActivationError(Exception):
    def __init__(self, refusal: ActivationRefusal, detail: str) -> None:
        self.refusal = refusal
        super().__init__(detail)


@dataclass(frozen=True, slots=True)
class ActivationOutcome:
    """What happened to one account."""

    user_id: UUID
    email: str
    #: `False` when the credential was already there — a re-run, or somebody who
    #: has already set a password.
    credential_created: bool
    #: `True` when this account still has no password and the link is the way in.
    awaiting_password: bool
    token: str
    expires_at: datetime


@dataclass(frozen=True, slots=True)
class AccountStatus:
    """One row of `--list`, so an operator can see the whole cutover at once."""

    user_id: UUID
    external_auth_id: str
    email: str | None
    is_active: bool
    is_superadmin: bool
    membership_count: int
    has_credential: bool
    has_password: bool

    @property
    def can_sign_in(self) -> bool:
        return self.is_active and self.has_credential and self.has_password


class PlatformActivationService:
    def __init__(self, policy: AuthPolicy = DEFAULT_AUTH_POLICY) -> None:
        self._policy = policy
        self._tokens = OneTimeTokenService(policy)

    async def activate(self, db: AsyncSession, user: InternalUser) -> ActivationOutcome:
        """Ensure a credential exists, then issue the link that sets a password.

        The credential is written with `password_hash = NULL`, which
        `PlatformAuthService.authenticate` refuses with the same generic message
        as a wrong password. So an account is *reachable* the moment this runs
        and *enterable* only once its owner has used the link.
        """
        if not user.is_active:
            raise ActivationError(
                ActivationRefusal.ACCOUNT_INACTIVE,
                f"{user.external_auth_id} is deactivated; reactivate it first.",
            )
        if not user.email:
            raise ActivationError(
                ActivationRefusal.NO_EMAIL,
                f"{user.external_auth_id} has no email address on its identity row.",
            )

        email = normalize_email(user.email)
        await self._refuse_if_address_belongs_to_somebody_else(db, email, user.id)

        # `ON CONFLICT DO NOTHING`, never an update. A second run must not wipe
        # a password its owner has already chosen — which is exactly what an
        # upsert on `password_hash` would do, quietly, to the person who was
        # quickest to act.
        result = await db.execute(
            pg_insert(PlatformCredential)
            .values(user_id=user.id, normalized_email=email, password_hash=None)
            .on_conflict_do_nothing(index_elements=["user_id"])
            .returning(PlatformCredential.user_id)
        )
        created = result.scalar_one_or_none() is not None

        credential = await db.get(PlatformCredential, user.id)
        if credential is None:  # pragma: no cover - the insert above guarantees it
            raise ActivationError(
                ActivationRefusal.EMAIL_TAKEN,
                f"credential for {user.external_auth_id} could not be read back.",
            )

        # Spend any link from an earlier run. Two live activation links for one
        # account means the older mail still opens it after the newer one has
        # been used and the password chosen.
        await self._tokens.invalidate_outstanding(
            db, purpose=TokenPurpose.PASSWORD_RESET, user_id=user.id
        )
        issued = await self._tokens.issue_for_user(
            db,
            purpose=TokenPurpose.PASSWORD_RESET,
            user_id=user.id,
            ttl=self._policy.activation_ttl,
        )
        return ActivationOutcome(
            user_id=user.id,
            email=email,
            credential_created=created,
            awaiting_password=credential.password_hash is None,
            token=issued.token,
            expires_at=issued.expires_at,
        )

    async def _refuse_if_address_belongs_to_somebody_else(
        self, db: AsyncSession, email: str, user_id: UUID
    ) -> None:
        owner = await db.scalar(
            select(PlatformCredential.user_id).where(PlatformCredential.normalized_email == email)
        )
        if owner is not None and owner != user_id:
            raise ActivationError(
                ActivationRefusal.EMAIL_TAKEN,
                f"{email} already belongs to identity {owner}; "
                "two identity rows share one address and that must be resolved by hand.",
            )

    async def survey(self, db: AsyncSession) -> list[AccountStatus]:
        """Every platform identity and whether it can sign in.

        One query rather than a loop, because the interesting output is the
        whole table — who is ready, who is waiting on a link, and who cannot be
        activated at all — and reading it a row at a time invites stopping at
        the first name somebody recognises.
        """
        memberships = (
            select(
                OrganizationMembership.user_id.label("user_id"),
                func.count().label("total"),
            )
            .where(OrganizationMembership.status == MembershipStatus.ACTIVE)
            .group_by(OrganizationMembership.user_id)
            .subquery()
        )
        rows = await db.execute(
            select(InternalUser, PlatformCredential, memberships.c.total)
            .outerjoin(PlatformCredential, PlatformCredential.user_id == InternalUser.id)
            .outerjoin(memberships, memberships.c.user_id == InternalUser.id)
            .order_by(InternalUser.created_at)
        )
        return [
            AccountStatus(
                user_id=user.id,
                external_auth_id=user.external_auth_id,
                email=user.email,
                is_active=user.is_active,
                is_superadmin=user.is_superadmin,
                membership_count=total or 0,
                has_credential=credential is not None,
                has_password=credential is not None and credential.password_hash is not None,
            )
            for user, credential, total in rows
        ]
