import "server-only";

/**
 * Provider-neutral server identity seam. Guards and pages import ONLY from
 * this module — never from the Clerk adapter directly.
 *
 * The Clerk adapter verifies the session then reads PostgreSQL roles through
 * `GET /api/v1/me`; callers remain provider-neutral.
 */
export { getClerkServerIdentity as getServerIdentity } from "@/lib/auth/clerk/server-identity";
