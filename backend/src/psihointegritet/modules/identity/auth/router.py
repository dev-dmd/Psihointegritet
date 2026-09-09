"""HTTP for the platform auth surface (D-083, AUTH-3).

# Who is allowed to call these

**The Next.js server, not a browser.** `POST /login` answers with the opaque
session token, and that token is a bearer credential: whoever holds it is signed
in. It crosses this boundary exactly once, from FastAPI to the Next.js route
handler, which puts it straight into an `HttpOnly` cookie and answers the
browser with `{"ok": true}`. Browser JavaScript never sees it, so a cross-site
script has nothing to steal and there is nothing in `localStorage` to leak.

That is why there is no JWT here. A JWT would be readable by whoever holds it
and revocable by nobody; an opaque token is a lookup against `auth_sessions`,
where `revoked_at` ends a session the moment it is written.

# What these routes deliberately do not do

*No password-reset request endpoint.* Issuing a reset token is only useful if
something delivers it, and there is no mailer yet. Returning the token in a
response, or writing it to a log, would each be a way to take over any account
by naming its address. Until a mailer exists the token is issued by an operator
script (`scripts/issue_platform_reset.py`) and the link below consumes it.
"""

from uuid import UUID

from fastapi import APIRouter, HTTPException, Request, Response, status
from pydantic import BaseModel, ConfigDict, Field

from psihointegritet.api.dependencies import CurrentIdentity, DatabaseSession
from psihointegritet.core.logging import get_logger
from psihointegritet.modules.identity.auth.platform_accounts import (
    AuthenticationError,
    PasswordPolicyError,
    PlatformAuthService,
    RegistrationError,
)

router = APIRouter(prefix="/auth/platform", tags=["auth"])
logger = get_logger(__name__)

#: One message for every sign-in refusal. A wrong password, an unknown address,
#: an unactivated account and a throttled one are indistinguishable from here —
#: which is the point, since anything else answers "does this person have an
#: account" to whoever asks.
GENERIC_SIGN_IN_FAILURE = "Neispravna email adresa ili lozinka."

#: Truncated because the header is attacker-controlled and the column is 400.
USER_AGENT_LIMIT = 400


class SignInRequest(BaseModel):
    email: str
    password: str


class RegisterRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    email: str
    password: str
    display_name: str | None = Field(default=None, alias="displayName")


class ResetPasswordRequest(BaseModel):
    token: str
    password: str


class SessionOut(BaseModel):
    """The issued session — returned to the Next.js server, never to a browser.

    `token` is the credential itself. The only correct thing to do with this
    response is to set a cookie from it; forwarding the body to a client would
    undo every property the opaque-token design has.
    """

    model_config = ConfigDict(populate_by_name=True)

    token: str
    expires_at: str = Field(serialization_alias="expiresAt")


def _user_agent(request: Request) -> str | None:
    value = request.headers.get("user-agent")
    return value[:USER_AGENT_LIMIT] if value else None


def _no_store(response: Response) -> None:
    """Nothing here may be cached anywhere. One of these responses is a session."""
    response.headers["Cache-Control"] = "no-store"


@router.post("/login", response_model=SessionOut, response_model_by_alias=True)
async def sign_in(
    payload: SignInRequest,
    request: Request,
    response: Response,
    session: DatabaseSession,
) -> SessionOut:
    _no_store(response)
    service = PlatformAuthService()
    try:
        issued = await service.authenticate(
            session,
            email=payload.email,
            password=payload.password,
            user_agent=_user_agent(request),
        )
    except AuthenticationError as error:
        # Committed on purpose: the failure counter and any lock this attempt
        # produced are the point, and rolling them back would make the throttle
        # unreachable. The reason is logged, not returned.
        await session.commit()
        logger.info("platform_sign_in_refused", reason=error.reason.value)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=GENERIC_SIGN_IN_FAILURE,
        ) from error

    await session.commit()
    return SessionOut(token=issued.token, expires_at=issued.expires_at.isoformat())


@router.post(
    "/register",
    response_model=SessionOut,
    response_model_by_alias=True,
    status_code=status.HTTP_201_CREATED,
)
async def register(
    payload: RegisterRequest,
    request: Request,
    response: Response,
    session: DatabaseSession,
) -> SessionOut:
    """Create a platform account and sign it in.

    The account is created with no membership and no superadmin flag, so it can
    reach nothing: `resolve_staff_actor` refuses it. Authorization is
    PostgreSQL's answer and always was (rules §10.3), which is what makes an
    open registration endpoint safe rather than a privilege escalation.
    """
    _no_store(response)
    service = PlatformAuthService()
    try:
        issued = await service.register(
            session,
            email=payload.email,
            password=payload.password,
            display_name=payload.display_name,
            user_agent=_user_agent(request),
        )
    except PasswordPolicyError as error:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail=str(error)
        ) from error
    except RegistrationError as error:
        # 409 with a message that names no address. "Taken" and "malformed"
        # share one answer so the endpoint cannot be walked for a member list.
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Nalog sa ovim podacima nije moguće otvoriti.",
        ) from error

    await session.commit()
    return SessionOut(token=issued.token, expires_at=issued.expires_at.isoformat())


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def sign_out(
    identity: CurrentIdentity,
    response: Response,
    session: DatabaseSession,
) -> None:
    """Revoke the session the bearer token names. Other devices stay signed in.

    Reached through `CurrentIdentity`, so an unauthenticated call is a 401 and
    a caller can only ever end its *own* session — the session id comes from
    the verified token, never from the request body.
    """
    _no_store(response)
    if identity.session_id is None:  # pragma: no cover - the verifier always sets it
        return
    await PlatformAuthService().sign_out(session, UUID(identity.session_id))
    await session.commit()


@router.post("/password/reset", status_code=status.HTTP_204_NO_CONTENT)
async def reset_password(
    payload: ResetPasswordRequest,
    response: Response,
    session: DatabaseSession,
) -> None:
    """Spend a reset link and set a new password.

    Ends every session of the account, including the attacker's if there is one
    — a reset is what somebody does when they believe the account is
    compromised. Also clears the lockout, so the mailbox owner is never held out
    by somebody else's failed guesses.
    """
    _no_store(response)
    try:
        await PlatformAuthService().reset_password(
            session, token=payload.token, new_password=payload.password
        )
    except PasswordPolicyError as error:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail=str(error)
        ) from error
    await session.commit()
