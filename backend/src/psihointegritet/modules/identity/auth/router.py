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

# The two endpoints that send mail to an address the caller chose

`POST /password/forgot` and `POST /email/verify/resend` are unauthenticated and
mail a one-time link to an address whoever calls them typed. Both were held back
until there was something to make that safe, and there now is:

- **The recipient is never the request.** The address is looked up and the
  *stored* one is mailed, so the endpoint cannot be pointed at another mailbox.
- **204, always.** No account, already verified, still inside the cooldown — one
  answer covers all of them, so neither endpoint answers "does this person have
  an account here". Sign-in spends an Argon2 verification to avoid answering
  that question; it would be a poor trade to leave it lying beside the form.
- **A cooldown per account** (`AuthPolicy.self_service_mail_cooldown`), which is
  what stops a held-down button from filling somebody's inbox.

What is still missing, and is worth naming rather than implying: there is no
per-IP limit. A caller working through a list of *known* addresses can still
make us send one mail per address per cooldown. The mail goes only to its own
account's mailbox and says nothing about the account, so the harm is our sending
reputation rather than anybody's security — but it is a real gap and the right
place to close it is an edge rate limit, not this module.

The operator script (`scripts/platform_accounts.py --reset`) stays. It answers a
different question — "this person cannot get in, hand me a link" — and it is not
subject to the cooldown, because an operator holding a link is not a mailbox
being flooded.
"""

from collections.abc import Callable
from urllib.parse import quote
from uuid import UUID

from fastapi import APIRouter, HTTPException, Request, Response, status
from pydantic import BaseModel, ConfigDict, Field

from psihointegritet.api.dependencies import CurrentIdentity, DatabaseSession
from psihointegritet.core.logging import get_logger
from psihointegritet.infrastructure.email.layout import email_base_url
from psihointegritet.infrastructure.email.resend_client import (
    EmailEnvelope,
    ResendClient,
)
from psihointegritet.infrastructure.email.templates import (
    email_verification_email,
    password_reset_email,
)
from psihointegritet.modules.identity.auth.platform_accounts import (
    AuthenticationError,
    MailableLink,
    PasswordPolicyError,
    PlatformAuthService,
    RegistrationError,
)

#: Where the verification link lands. Mirrors `/nova-lozinka`: a stable,
#: unlocalized path, because the link is minted on a server, mailed, and opened
#: days later — it must not shift with anybody's language.
VERIFY_EMAIL_PATH = "/potvrda-adrese"

#: Where a reset link lands. The same page an activation link uses — setting a
#: first password and replacing a forgotten one are one operation.
RESET_PASSWORD_PATH = "/nova-lozinka"  # noqa: S105 - a route, not a credential

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


class VerifyEmailRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    token: str = Field(min_length=1)


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
    """Create a platform account, sign it in, and mail its verification link.

    The account is created with no membership and no superadmin flag, so it can
    reach nothing: `resolve_staff_actor` refuses it. Authorization is
    PostgreSQL's answer and always was (rules §10.3), which is what makes an
    open registration endpoint safe rather than a privilege escalation.

    What it was *not* safe against is address squatting, which is why the
    verification link below is not optional: without it anyone could take the
    address of a colleague who has not been provisioned yet.
    """
    _no_store(response)
    service = PlatformAuthService()
    try:
        account = await service.register(
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
    # After the commit, never before: a mail promising a link that a rolled-back
    # transaction never minted is worse than no mail at all. A send that fails
    # leaves the account registered and unverified, which is exactly the state
    # `/email/verify` and a re-registration attempt both already handle — so it
    # is logged and swallowed rather than turned into a 500 for somebody whose
    # account was created successfully.
    await _send_verification_email(
        email=payload.email,
        display_name=payload.display_name,
        token=account.verification_token,
    )
    return SessionOut(
        token=account.session.token,
        expires_at=account.session.expires_at.isoformat(),
    )


@router.post("/email/verify", status_code=status.HTTP_204_NO_CONTENT)
async def verify_email(
    payload: VerifyEmailRequest,
    response: Response,
    session: DatabaseSession,
) -> None:
    """Spend a verification link, so this account may sign in.

    204 rather than a session: registration already signed the browser in, and
    a link opened days later somewhere else must not hand that browser a
    session it never authenticated for.
    """
    _no_store(response)
    try:
        await PlatformAuthService().verify_email(session, token=payload.token)
    except PasswordPolicyError as error:
        await session.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(error)) from error
    await session.commit()


async def _send_verification_email(*, email: str, display_name: str | None, token: str) -> None:
    client = ResendClient()
    if not client.configured:
        # Local development and any environment without a mailer. Loud in the
        # log and nowhere else: the operator can still finish the account with
        # `platform_accounts.py`, and the alternative — skipping verification
        # when no mailer is configured — is the hole this closes.
        logger.warning("verification_email_not_sent", reason="resend_unconfigured")
        return
    verify_url = _link(VERIFY_EMAIL_PATH, token)
    try:
        await client.send(
            EmailEnvelope(
                to=email,
                subject="Potvrdite svoju adresu",
                html=email_verification_email(display_name, verify_url),
            )
        )
    except Exception:  # delivery must never fail an account that was created
        logger.exception("verification_email_failed")


def _link(path: str, token: str) -> str:
    return f"{email_base_url()}{path}?token={quote(token, safe='')}"


class AddressRequest(BaseModel):
    """An address, and nothing else.

    No password and no token on purpose. Both endpoints taking this body are
    unauthenticated, and a field neither of them reads is a field somebody
    later wires up.
    """

    email: str = Field(min_length=1, max_length=320)


@router.post("/password/forgot", status_code=status.HTTP_204_NO_CONTENT)
async def forgot_password(
    payload: AddressRequest,
    response: Response,
    session: DatabaseSession,
) -> None:
    """Mail a reset link to the account at this address, if there is one.

    **204 whatever happens** — no account, still inside the cooldown, mailer
    down. The caller learns nothing about who has an account here, which is the
    same promise `/login` makes and would be pointless to make there alone.
    """
    _no_store(response)
    link = await PlatformAuthService().request_password_reset(session, email=payload.email)
    # Committed before the send, and only then: a mail carrying a link that a
    # rolled-back transaction never minted is worse than no mail at all.
    await session.commit()
    if link is None:
        return
    await _send_link_email(
        link,
        path=RESET_PASSWORD_PATH,
        subject="Postavite novu lozinku",
        render=password_reset_email,
        kind="password_reset",
    )


@router.post("/email/verify/resend", status_code=status.HTTP_204_NO_CONTENT)
async def resend_verification(
    payload: AddressRequest,
    response: Response,
    session: DatabaseSession,
) -> None:
    """Mail a fresh verification link, for a registration whose mail went astray.

    204 on the same terms as `/password/forgot`, with one more case folded into
    it: an address that is *already* verified is answered identically, so the
    endpoint cannot be used to sort addresses into verified and not.
    """
    _no_store(response)
    link = await PlatformAuthService().request_email_verification(session, email=payload.email)
    await session.commit()
    if link is None:
        return
    await _send_link_email(
        link,
        path=VERIFY_EMAIL_PATH,
        subject="Potvrdite svoju adresu",
        render=email_verification_email,
        kind="email_verification",
    )


async def _send_link_email(
    link: MailableLink,
    *,
    path: str,
    subject: str,
    render: Callable[[str | None, str], str],
    kind: str,
) -> None:
    """Deliver one link, and never let delivery become the caller's problem.

    A send that fails is logged and swallowed. The token is already minted and
    the response is already 204 by contract — turning a mailer outage into a
    500 would tell the caller that the address exists, which is precisely what
    the 204 is there to withhold.
    """
    client = ResendClient()
    if not client.configured:
        # Not a failure — local development and any environment without a
        # mailer land here, and the token is already minted. Logged under its
        # own event so "no mailer configured" never reads as "delivery broke".
        logger.warning("link_email_skipped", reason="resend_unconfigured", kind=kind)
        return
    try:
        await client.send(
            EmailEnvelope(
                to=link.email,
                subject=subject,
                html=render(link.display_name, _link(path, link.token)),
            )
        )
    except Exception:
        logger.exception("link_email_failed", kind=kind)


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
