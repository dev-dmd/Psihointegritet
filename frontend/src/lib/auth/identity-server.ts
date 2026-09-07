import "server-only";

import { cache } from "react";

import { getSessionIdentity } from "@/lib/auth/session/server-identity";

/**
 * Provider-neutral server identity seam. Guards and pages import ONLY from
 * this module — never from the session adapter directly.
 *
 * The adapter resolves the session then reads PostgreSQL roles through
 * `GET /api/v1/me`; callers remain provider-neutral. That separation is what
 * made removing Clerk a one-line change here (D-083).
 */
async function loadServerIdentity() {
  return getSessionIdentity();
}

/**
 * Request-scoped identity. React clears this memoization between server
 * requests, so auth data is never persisted or shared between users.
 */
export const getServerIdentity = cache(loadServerIdentity);
