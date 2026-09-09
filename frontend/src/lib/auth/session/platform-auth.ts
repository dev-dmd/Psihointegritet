import "server-only";

import { serverEnv } from "@/lib/validation/env";

/**
 * The server's half of platform sign-in.
 *
 * # Why the token stops here
 *
 * The backend answers `POST /api/v1/auth/platform/login` with the opaque
 * session token, because something has to receive it. That something is this
 * module, running on the Next.js server, and it hands the value to a cookie
 * writer — never to a response body, never to a client component, never to
 * `localStorage`. Browser JavaScript has no way to read it, so an injected
 * script has nothing to steal and there is nothing to exfiltrate from storage.
 *
 * The route handlers above this file answer `{ ok: true }`. Anything richer
 * risks somebody adding one convenient field and quietly undoing all of it,
 * which is why `signIn` returns the token to exactly one caller and that caller
 * only ever passes it to `setPlatformSessionCookie`.
 *
 * # Which backend
 *
 * `NEXT_PUBLIC_API_URL` — the single backend this deployment is configured
 * against — rather than the production fan-out `server-identity.ts` uses.
 * Reading an identity from several backends and merging is right; *issuing* a
 * session in several is not. Platform accounts live in one database, and the
 * consolidation plan collapses the rest to it (Phase 7–8) rather than teaching
 * sign-in to pick.
 */

export interface IssuedSession {
  token: string;
  expiresAt: string;
}

/** A refusal from the backend, carrying only what is safe to show. */
export class PlatformAuthError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "PlatformAuthError";
  }
}

const AUTH_BASE = "/api/v1/auth/platform";

async function post(path: string, body: unknown): Promise<Response> {
  return fetch(`${serverEnv.NEXT_PUBLIC_API_URL}${AUTH_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });
}

/**
 * Read the failure message the backend chose, without inventing one.
 *
 * The backend already decides what is safe to disclose — one generic sentence
 * for every sign-in refusal, so the response cannot be used to learn who has an
 * account. Rewriting it here would be a second, unreviewed disclosure policy.
 */
async function refusalFrom(
  response: Response,
  fallback: string,
): Promise<never> {
  let message = fallback;
  try {
    const payload: unknown = await response.json();
    const detail = (payload as { detail?: unknown }).detail;
    if (typeof detail === "string" && detail.length > 0) message = detail;
  } catch {
    // A backend that answered with something other than JSON is still a
    // refusal; the fallback sentence is the honest thing to show.
  }
  throw new PlatformAuthError(response.status, message);
}

async function issuedFrom(response: Response): Promise<IssuedSession> {
  const payload = (await response.json()) as {
    token?: unknown;
    expiresAt?: unknown;
  };
  if (
    typeof payload.token !== "string" ||
    typeof payload.expiresAt !== "string"
  ) {
    throw new PlatformAuthError(502, "Prijava trenutno nije dostupna.");
  }
  return { token: payload.token, expiresAt: payload.expiresAt };
}

export async function signIn(
  email: string,
  password: string,
  fallbackMessage: string,
): Promise<IssuedSession> {
  const response = await post("/login", { email, password });
  if (!response.ok) await refusalFrom(response, fallbackMessage);
  return issuedFrom(response);
}

export async function register(
  email: string,
  password: string,
  displayName: string | null,
  fallbackMessage: string,
): Promise<IssuedSession> {
  const response = await post("/register", {
    email,
    password,
    displayName,
  });
  if (!response.ok) await refusalFrom(response, fallbackMessage);
  return issuedFrom(response);
}

/**
 * Revoke the session row behind this token.
 *
 * Deliberately best-effort: the cookie is cleared whether or not this succeeds,
 * because a person who clicked "sign out" must end up signed out of the browser
 * in front of them even if the backend is unreachable. The row then expires on
 * its own schedule, which is a smaller problem than a sign-out that appears to
 * fail.
 */
export async function revokeSession(token: string): Promise<void> {
  try {
    await fetch(`${serverEnv.NEXT_PUBLIC_API_URL}${AUTH_BASE}/logout`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
  } catch {
    // See above. Never rethrown.
  }
}

/**
 * Spend a verification link, so this account may sign in.
 *
 * Deliberately not a GET on page load. Mail clients and link scanners fetch
 * every URL in a message before anybody reads it, and a token spent by a
 * scanner is a person who can never verify — so the page renders a button and
 * this runs when they press it.
 */
export async function verifyEmail(
  token: string,
  fallbackMessage: string,
): Promise<void> {
  const response = await post("/email/verify", { token });
  if (!response.ok) await refusalFrom(response, fallbackMessage);
}

export async function resetPassword(
  token: string,
  password: string,
  fallbackMessage: string,
): Promise<void> {
  const response = await post("/password/reset", { token, password });
  if (!response.ok) await refusalFrom(response, fallbackMessage);
}

/**
 * Ask for a password-reset link, by naming an address.
 *
 * Returns nothing and throws only when the backend is unreachable. The backend
 * answers 204 whether or not there is an account, and this deliberately does
 * not try to learn more: an "unknown address" branch here would rebuild, in the
 * browser, exactly the disclosure the 204 exists to prevent.
 */
export async function requestPasswordReset(email: string): Promise<void> {
  const response = await post("/password/forgot", { email });
  if (!response.ok) {
    throw new PlatformAuthError(response.status, "");
  }
}

/** Ask for a fresh verification link. Same contract, same silence. */
export async function resendVerification(email: string): Promise<void> {
  const response = await post("/email/verify/resend", { email });
  if (!response.ok) {
    throw new PlatformAuthError(response.status, "");
  }
}
