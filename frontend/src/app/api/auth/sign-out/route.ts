import { NextResponse } from "next/server";

import {
  PLATFORM_SESSION_COOKIE,
  TENANT_SESSION_COOKIE,
} from "@/lib/auth/session/cookies";

/**
 * End the session.
 *
 * Clears both cookies rather than working out which one applies. They are
 * host-only and mutually exclusive in practice, so deleting the pair costs
 * nothing and cannot leave the wrong one behind — the failure mode worth
 * avoiding is a signed-out person still carrying a session for the other
 * surface.
 *
 * Today there is nothing to clear (D-083). The auth engine adds the row
 * revocation in `auth_sessions`; the response shape does not change.
 */
export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.delete(PLATFORM_SESSION_COOKIE);
  response.cookies.delete(TENANT_SESSION_COOKIE);
  // The answer depends on who asked; a shared cache must never reuse it.
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}
