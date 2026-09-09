import "server-only";

import { headers } from "next/headers";

import type { Identity } from "@/lib/auth/identity";
import { getServerToken } from "@/lib/auth/session/server-session";
import {
  TENANT_SLUG_HEADER,
  TENANT_SURFACE_HEADER,
  tenantForSlug,
} from "@/lib/tenant/domain-registry";
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
 * **Exactly one, always — and that is a consequence of D-083, not a
 * simplification.** This function used to return every registered backend on
 * the platform surface and merge what came back, because a Clerk session was a
 * JWT: any backend holding the same JWKS could verify it, so each tenant's API
 * could answer "here are the memberships I know about" for one shared token.
 *
 * A PDC session is an opaque token in `auth_sessions`, and `PdcSessionVerifier`
 * looks it up in **its own** database. A session issued by the platform backend
 * does not exist in another tenant's database, so that backend answers 401 —
 * every time, by construction, not because of a misconfiguration. Fanning out
 * therefore cost one cross-tenant request per page load and could never return
 * anything but `null`.
 *
 * The consequence worth stating plainly, because it decides a migration:
 * **a person whose memberships live in a database other than the one that
 * issued their session cannot see those memberships at all.** There is no
 * configuration that recovers them. That is why Sanja's identity has to move
 * into the platform database rather than stay in `sanja-production`
 * (`PDC_CONSOLIDATION_MIGRATION_PLAN_v1_1.md` §5.4).
 *
 * Sessions are issued against `NEXT_PUBLIC_API_URL` (`platform-auth.ts`), so
 * that is the only backend that can resolve one. The registry is still
 * consulted on a tenant surface: a tenant client's session (AUTH-7) is issued
 * by the backend serving that tenant, and pointing it at the platform API would
 * be the cross-tenant leak this whole slice exists to prevent.
 */
async function apiBaseUrlForRequest(): Promise<string> {
  // Outside production every environment is bound to one tenant and one
  // backend. The registry holds *production* URLs, so consulting it here would
  // send a development session to the production API.
  if (serverEnv.DEPLOYMENT_ENV !== "production") {
    return serverEnv.NEXT_PUBLIC_API_URL;
  }

  const requestHeaders = await headers();
  if (requestHeaders.get(TENANT_SURFACE_HEADER) === "tenant") {
    const slug = requestHeaders.get(TENANT_SLUG_HEADER);
    const tenant = slug ? tenantForSlug(slug) : null;
    if (tenant) return tenant.productionApiBaseUrl;
  }

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
  const baseUrl = await apiBaseUrlForRequest();
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
