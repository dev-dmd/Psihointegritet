import "server-only";

import { cookies } from "next/headers";

import { PLATFORM_SESSION_COOKIE } from "@/lib/auth/session/cookies";

/**
 * The server's answer to "who is making this request, and what may I send to
 * the backend on their behalf".
 *
 * # The token never leaves the server
 *
 * It arrives as an `HttpOnly` cookie, is read here, and travels onward as an
 * `Authorization: Bearer` header to FastAPI. Browser JavaScript is never given
 * it — not in a response body, not in `localStorage`, not in a readable cookie
 * — so a cross-site script has nothing to steal. That is the entire reason the
 * five call sites that need a token ask this module instead of holding one.
 *
 * Reading the cookie also marks the request request-time, which is what keeps
 * Next from trying to *prerender* a page whose first statement is
 * `redirect(SIGN_IN_URL)`.
 */

/**
 * The bearer token for the current request, or `null` when nobody is signed in.
 *
 * `null` is not an error. Callers must treat it as "this request is anonymous"
 * and answer accordingly — a public endpoint proceeds, a staff endpoint
 * refuses. Throwing here would take the public site down with the auth service.
 *
 * The value is passed to the backend and verified there against
 * `auth_sessions`; nothing about it is trusted on this side. An expired,
 * revoked or forged cookie is simply a token the backend does not know, which
 * comes back as a 401 and reads as "not signed in".
 */
export async function getServerToken(): Promise<string | null> {
  const store = await cookies();
  const token = store.get(PLATFORM_SESSION_COOKIE)?.value;
  return token && token.length > 0 ? token : null;
}

/** Whether the current request carries a session at all. */
export async function hasServerSession(): Promise<boolean> {
  return (await getServerToken()) !== null;
}
