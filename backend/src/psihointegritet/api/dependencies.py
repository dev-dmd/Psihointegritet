from collections.abc import AsyncIterator
from typing import Annotated

from fastapi import Depends, HTTPException, Request, Security, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from psihointegritet.core.config import Settings
from psihointegritet.db.session import get_session
from psihointegritet.infrastructure.auth.clerk.verifier import (
    ClerkTokenVerificationError,
)
from psihointegritet.infrastructure.auth.identity import IdentityClaims
from psihointegritet.modules.guidance.authorization import (
    IntakeAuthorizationError,
    StaffActor,
    resolve_staff_actor,
    staff_authorization_message,
)

_bearer = HTTPBearer(auto_error=False)
BearerCredentials = Annotated[
    HTTPAuthorizationCredentials | None,
    Security(_bearer),
]


async def get_current_identity(
    request: Request,
    credentials: BearerCredentials,
) -> IdentityClaims:
    """Verify Clerk identity first; domain authorization is resolved from PostgreSQL later."""
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Bearer token is required",
        )
    try:
        return await request.app.state.token_verifier.verify(credentials.credentials)
    except ClerkTokenVerificationError as error:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid bearer token",
        ) from error


CurrentIdentity = Annotated[IdentityClaims, Depends(get_current_identity)]


async def get_database_session(request: Request) -> AsyncIterator[AsyncSession]:
    session_factory: async_sessionmaker[AsyncSession] = request.app.state.session_factory
    async for session in get_session(session_factory):
        yield session


DatabaseSession = Annotated[AsyncSession, Depends(get_database_session)]


def get_app_settings(request: Request) -> Settings:
    return request.app.state.settings


AppSettings = Annotated[Settings, Depends(get_app_settings)]


async def require_superadmin(
    identity: CurrentIdentity,
    session: DatabaseSession,
    settings: AppSettings,
) -> StaffActor:
    """Require superadmin access (D0 — Diagnostic Engine gate).

    Resolves the staff actor from the verified Clerk identity and raises HTTP 403
    when the internal user does not carry the ``is_superadmin`` flag.

    Placed here (not inside ``modules/diagnostics``) because this guard is the
    only way for *any* future module — diagnostic runs, platform-wide settings,
    organisation overrides — to verify platform-level privilege.
    """
    try:
        actor = await resolve_staff_actor(session, identity, settings.default_organization_slug)
    except IntakeAuthorizationError as error:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "code": "STAFF_REQUIRED",
                "message": staff_authorization_message(error),
            },
        ) from error
    if not actor.is_superadmin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "code": "SUPERADMIN_REQUIRED",
                "message": "Ova akcija je dozvoljena samo platform administratoru.",
            },
        )
    return actor


RequireSuperadmin = Annotated[StaffActor, Depends(require_superadmin)]


async def require_staff(
    identity: CurrentIdentity,
    session: DatabaseSession,
    settings: AppSettings,
) -> StaffActor:
    """Require an active staff role: ``org_admin``, ``therapist`` or superadmin.

    ``resolve_staff_actor`` already refuses an account with no active
    membership (``NO_ACTIVE_STAFF_ROLE``) and, per D-051, admits a platform
    superadmin with or without membership rows — so resolving the actor *is*
    the check. Nothing further is needed to express "superadmin, org_admin or
    therapist".

    Being authenticated by Clerk is deliberately **not** enough: a Clerk
    account is any signed-in visitor, while these routes approve requests and
    cancel other people's appointments.

    Ownership rules (a therapist may only touch their own appointments) are a
    separate, per-route concern and are not decided here.
    """
    try:
        return await resolve_staff_actor(session, identity, settings.default_organization_slug)
    except IntakeAuthorizationError as error:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "code": "STAFF_REQUIRED",
                "message": staff_authorization_message(error),
            },
        ) from error


RequireStaff = Annotated[StaffActor, Depends(require_staff)]
