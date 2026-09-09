import "server-only";

import type { Identity } from "@/lib/auth/identity";
import { getServerToken } from "@/lib/auth/session/server-session";
import { serverEnv } from "@/lib/validation/env";

/**
 * Server-side identity: the session says *who*, PostgreSQL says *what they may do*.
 *
 * Everything below the token was already provider-neutral — it only ever needed
 * a bearer string — so removing Clerk moved this code rather than rewriting it.
 * `GET /api/v1/me` remains the sole source of domain roles, and it creates the
 * neutral `internal_users` row on first verified login.
 */
export async function getSessionIdentity(): Promise<Identity | null> {
  const token = await getServerToken();
  if (!token) return null;

  const backend = await loadBackendIdentity(token);
  if (!backend) return null;

  return {
    userId: backend.userId,
    email: backend.email,
    displayName: backend.displayName,
    isSuperadmin: backend.isSuperadmin,
    memberships: backend.memberships,
  };
}

interface BackendIdentity {
  userId: string;
  email: string | null;
  displayName: string | null;
  isSuperadmin: boolean;
  memberships: Identity["memberships"];
}

/**
 * Which backend can answer for this request.
 *
 * **One per environment, and that is now the whole rule** — one production
 * backend over one production database, one staging backend over one staging
 * database. The registry used to carry a `productionApiBaseUrl` per tenant,
 * because two production backends genuinely existed; they do not any more, and
 * an API base was always a property of the *environment* rather than of a
 * tenant (D-081).
 *
 * Two things were wrong while it survived, and both are worth recording because
 * they are the same mistake seen twice.
 *
 * A PDC session is an opaque token in `auth_sessions`, resolved by
 * `PdcSessionVerifier` against **its own** database, and `platform-auth.ts`
 * issues every session against `NEXT_PUBLIC_API_URL`. So asking any other
 * backend who the holder is returns 401 by construction, not by
 * misconfiguration. On the platform surface that meant a per-page-load
 * cross-tenant request that could only ever return nothing. On a **tenant**
 * surface it was worse than useless: someone signing in at `sanjaneuer.com/prijava`
 * got a session from the platform backend and had it checked against a
 * different one, so the sign-in could not work at all.
 *
 * The consequence worth stating plainly, because it decided a migration:
 * **a person whose memberships live in a database other than the one that
 * issued their session cannot see those memberships**, and no configuration
 * recovers them. That is why Sanja's identity moves into the platform database
 * rather than staying in `sanja-production`
 * (`PDC_CONSOLIDATION_MIGRATION_PLAN_v1_1.md` §5.4).
 */
function apiBaseUrl(): string {
  return serverEnv.NEXT_PUBLIC_API_URL;
}

/**
 * The person, as the backend that issued their session describes them.
 *
 * `null` means "this token is not a session any more" — expired, revoked, or
 * from a database that has since been replaced. That is the contract
 * `getServerToken` documents ("reads as not signed in"), and it must be
 * answered with a redirect to sign-in rather than an error page: the cookie
 * outliving the row behind it is ordinary, and it happens to everyone
 * eventually, session TTL being what it is.
 *
 * A backend that is genuinely broken still throws. A silent empty identity
 * would read as "no roles" and quietly lock someone out of their own workspace.
 */
async function loadBackendIdentity(
  token: string,
): Promise<BackendIdentity | null> {
  const baseUrl = apiBaseUrl();
  const response = await fetch(`${baseUrl}/api/v1/me`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });

  if (response.status === 404) {
    throw new Error(
      "Identity endpoint /api/v1/me is missing. Restart or redeploy the backend from the same revision as the frontend.",
    );
  }
  if (response.status === 401 || response.status === 403) return null;
  if (!response.ok) {
    throw new Error(`Identity service failed: HTTP ${response.status}`);
  }

  return (await response.json()) as BackendIdentity;
}
