import "server-only";

import { auth, currentUser } from "@clerk/nextjs/server";

import type { Identity } from "@/lib/auth/identity";

import {
  TENANT_DOMAINS,
  TENANT_SLUG_HEADER,
  TENANT_SURFACE_HEADER,
  tenantForSlug,
} from "@/lib/tenant/domain-registry";
import { serverEnv } from "@/lib/validation/env";
import { headers } from "next/headers";

/**
 * Clerk exposes `fullName` only when both parts are set, so a user with just a
 * first name would otherwise be nameless. Assembled here rather than at the
 * call sites, so every surface agrees on what to call the same person.
 */
function resolveDisplayName(
  user: {
    fullName?: string | null;
    firstName?: string | null;
    lastName?: string | null;
  } | null,
): string | null {
  if (!user) return null;
  const assembled = [user.firstName, user.lastName].filter(Boolean).join(" ");
  return user.fullName ?? (assembled === "" ? null : assembled);
}

/**
 * Server-side identity adapter. Clerk authenticates the subject; FastAPI's
 * PostgreSQL-backed `/api/v1/me` is the sole source of domain roles. The
 * endpoint creates a neutral `internal_users` row on first verified login.
 */
export async function getClerkServerIdentity(): Promise<Identity | null> {
  const session = await auth();
  const { userId } = session;
  if (!userId) {
    return null;
  }

  const token = await session.getToken();
  if (!token) return null;

  const backend = await loadBackendIdentity(token);
  // `/api/v1/me` is authoritative. Clerk's user profile is a fallback only;
  // avoid a second provider request when the backend already returned both
  // presentation fields.
  const user =
    backend.email === null || backend.displayName === null
      ? await currentUser()
      : null;

  return {
    userId: backend.userId,
    email: backend.email ?? user?.primaryEmailAddress?.emailAddress ?? null,
    displayName: backend.displayName ?? resolveDisplayName(user),
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
 * Which backends can answer for this request, and why more than one might.
 *
 * **Only production has more than one.** Every other environment — staging, a
 * preview, a laptop — is bound to a single tenant and a single backend, named
 * by `NEXT_PUBLIC_API_URL`: the staging frontend talks to the staging backend,
 * a developer's to `localhost:8001`. The registry holds *production* URLs, so
 * consulting it anywhere else sends a development session to the production API,
 * which rejects the token and answers with no memberships — a signed-in
 * workspace containing no panels, and no error to explain it.
 */
async function apiBaseUrlsForRequest(): Promise<string[]> {
  if (serverEnv.DEPLOYMENT_ENV !== "production") {
    return [serverEnv.NEXT_PUBLIC_API_URL];
  }

  const requestHeaders = await headers();
  const surface = requestHeaders.get(TENANT_SURFACE_HEADER);
  const slug = requestHeaders.get(TENANT_SLUG_HEADER);

  if (surface === "tenant" && slug) {
    const tenant = tenantForSlug(slug);
    // One tenant, one backend. A request on Sanja's domain must never reach
    // another tenant's API — that is the isolation this whole slice is for.
    if (tenant) return [tenant.productionApiBaseUrl];
  }

  if (surface === "platform") {
    // The owners' workspace is shared, but the databases are not: each tenant
    // holds only its own memberships, so nobody can answer "which
    // organizations is this person in" alone. Asking each registered backend
    // and merging is the honest answer while the databases stay separate —
    // deliberately, because RLS does not exist yet. It collapses to a single
    // call once a shared backend lands.
    return TENANT_DOMAINS.map((tenant) => tenant.productionApiBaseUrl);
  }

  return [serverEnv.NEXT_PUBLIC_API_URL];
}

/**
 * The person, as every backend that can see them describes them.
 *
 * A tenant that does not know this account answers with no memberships rather
 * than an error, so an owner of one practice simply has nothing from the other.
 * A backend that is genuinely broken still throws — a silent empty identity
 * would read as "no roles" and quietly lock someone out of their own workspace.
 */
async function loadBackendIdentity(token: string): Promise<BackendIdentity> {
  const baseUrls = await apiBaseUrlsForRequest();
  const responses = await Promise.all(
    baseUrls.map(async (baseUrl) => {
      const response = await fetch(`${baseUrl}/api/v1/me`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      if (response.status === 404) {
        throw new Error(
          "Identity endpoint /api/v1/me is missing. Restart or redeploy the backend from the same revision as the frontend.",
        );
      }
      // 401/403 means "this backend does not know you", which on the shared
      // workspace is an ordinary answer rather than a failure.
      if (response.status === 401 || response.status === 403) return null;
      if (!response.ok) {
        throw new Error(`Identity service failed: HTTP ${response.status}`);
      }
      return (await response.json()) as BackendIdentity;
    }),
  );

  const known = responses.filter(
    (value): value is BackendIdentity => value !== null,
  );
  if (known.length === 0) {
    throw new Error("Identity service returned no usable response.");
  }

  const [first] = known as [BackendIdentity, ...BackendIdentity[]];
  return {
    userId: first.userId,
    email: known.find((entry) => entry.email)?.email ?? null,
    displayName: known.find((entry) => entry.displayName)?.displayName ?? null,
    // The platform flag is global (D-051), so any backend asserting it is enough.
    isSuperadmin: known.some((entry) => entry.isSuperadmin),
    memberships: known.flatMap((entry) => entry.memberships),
  };
}
