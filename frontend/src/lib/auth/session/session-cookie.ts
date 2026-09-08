import "server-only";

import type { NextResponse } from "next/server";

import {
  PLATFORM_SESSION_COOKIE,
  TENANT_SESSION_COOKIE,
} from "@/lib/auth/session/cookies";
import { serverEnv } from "@/lib/validation/env";

/**
 * The one place a session cookie is written, and the attributes it must carry.
 *
 * Each of these is load-bearing:
 *
 * - **`httpOnly`** — the whole design. Without it the token is readable by any
 *   script on the page and the opaque-token model buys nothing.
 * - **`secure`** outside development, so the token is never sent in clear.
 *   Localhost is exempt because it has no certificate and the cookie would
 *   simply never be set.
 * - **`sameSite: "lax"`**, not `"strict"`. Sign-in commonly begins by following
 *   a link from somewhere else — a mail, a bookmark bar, the tenant's own site
 *   — and `strict` withholds the cookie on exactly that first navigation, so
 *   the person arrives signed out and tries again.
 * - **no `domain`** — host-only, so a session on one tenant's domain is not
 *   even *sent* to another's. The registry gives every tenant its own host for
 *   this reason.
 * - **`expires`** from the backend, so the browser and `auth_sessions` agree on
 *   when the session is over rather than each keeping its own opinion.
 */
export function setPlatformSessionCookie(
  response: NextResponse,
  session: { token: string; expiresAt: string },
): void {
  response.cookies.set({
    name: PLATFORM_SESSION_COOKIE,
    value: session.token,
    httpOnly: true,
    secure: serverEnv.DEPLOYMENT_ENV !== "development",
    sameSite: "lax",
    path: "/",
    expires: new Date(session.expiresAt),
  });
}

/**
 * Clear both cookies rather than working out which one applies.
 *
 * They are host-only and mutually exclusive in practice, so deleting the pair
 * costs nothing and cannot leave the wrong one behind — the failure worth
 * avoiding is somebody signed out of one surface still carrying a session for
 * the other.
 */
export function clearSessionCookies(response: NextResponse): void {
  response.cookies.delete(PLATFORM_SESSION_COOKIE);
  response.cookies.delete(TENANT_SESSION_COOKIE);
}
