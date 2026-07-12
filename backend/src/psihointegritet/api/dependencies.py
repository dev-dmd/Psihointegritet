from typing import Annotated

from fastapi import Depends, HTTPException, status

from psihointegritet.infrastructure.auth.identity import IdentityClaims


async def get_current_identity() -> IdentityClaims:
    """Placeholder authentication dependency.

    Token verification arrives with the auth milestone; until then every
    protected endpoint fails closed instead of silently allowing access.
    """
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Authentication is not configured yet",
    )


CurrentIdentity = Annotated[IdentityClaims, Depends(get_current_identity)]
