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
