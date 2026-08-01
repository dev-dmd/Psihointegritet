import "server-only";

/**
 * Provider-neutral server identity seam. Guards and pages import ONLY from
 * this module — never from the Clerk adapter directly.
 *
 * TODO(identity-backend): when the backend identity slice lands (M2.1),
 * replace this re-export with an adapter that calls `GET /api/v1/me` through
 * `src/lib/api/client.ts`. Swapping the source is this one line; every caller
 * keeps working unchanged (ARCHITECTURAL_RULES §10.1).
 */
export { getClerkServerIdentity as getServerIdentity } from "@/lib/auth/clerk/server-identity";
