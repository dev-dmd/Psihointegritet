import "server-only";

import { cache } from "react";

import { getClerkServerIdentity } from "@/lib/auth/clerk/server-identity";

/**
 * Provider-neutral server identity seam. Guards and pages import ONLY from
 * this module — never from the Clerk adapter directly.
 *
 * The Clerk adapter verifies the session then reads PostgreSQL roles through
 * `GET /api/v1/me`; callers remain provider-neutral.
 */
async function loadServerIdentity() {
  return getClerkServerIdentity();
}

/**
 * Request-scoped identity. React clears this memoization between server
 * requests, so auth data is never persisted or shared between users.
 */
export const getServerIdentity = cache(loadServerIdentity);
