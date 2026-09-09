import { NextResponse } from "next/server";

import { getServerToken } from "@/lib/auth/session/server-session";
import { revokeSession } from "@/lib/auth/session/platform-auth";
import { clearSessionCookies } from "@/lib/auth/session/session-cookie";

/**
 * End the session.
 *
 * Two steps, in this order and both unconditional: revoke the row in
 * `auth_sessions` so the token is dead everywhere, then clear the cookies so
 * this browser stops presenting it.
 *
 * The revocation is best-effort by design. If the backend is unreachable the
 * cookies are still cleared — somebody who clicked "sign out" must end up
 * signed out of the browser in front of them, and a stranded row expiring on
 * its own schedule is a smaller problem than a sign-out that appears to fail.
 */
export async function POST() {
  const token = await getServerToken();
  if (token) await revokeSession(token);

  const response = NextResponse.json({ ok: true });
  clearSessionCookies(response);
  // The answer depends on who asked; a shared cache must never reuse it.
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}
