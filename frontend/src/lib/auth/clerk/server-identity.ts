import "server-only";

import { auth, currentUser } from "@clerk/nextjs/server";

import type { Identity } from "@/lib/auth/identity";

import { parseRoleMetadata } from "./public-metadata";

/**
 * Server-side Clerk → `Identity` adapter. Roles come from `publicMetadata`
 * via `parseRoleMetadata` (interim source, D-026).
 *
 * `currentUser()` is deduped per request by Next's fetch cache, so the
 * defense-in-depth pattern (layout guard + per-page guard) still costs a
 * single Clerk Backend API call per request. Deliberately no React `cache()`
 * wrapper — the fetch dedupe is sufficient and `cache` breaks under vitest.
 */
export async function getClerkServerIdentity(): Promise<Identity | null> {
  const { userId } = await auth();
  if (!userId) {
    return null;
  }

  const user = await currentUser();
  const meta = parseRoleMetadata(user?.publicMetadata);

  return {
    userId,
    email: user?.primaryEmailAddress?.emailAddress ?? null,
    isSuperadmin: meta.superadmin,
    memberships:
      meta.roles.length > 0
        ? [{ organizationId: meta.org, roles: meta.roles }]
        : [],
  };
}
