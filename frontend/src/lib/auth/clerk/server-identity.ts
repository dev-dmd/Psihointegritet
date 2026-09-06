import "server-only";

import { auth, currentUser } from "@clerk/nextjs/server";

import type { Identity } from "@/lib/auth/identity";

import { serverEnv } from "@/lib/validation/env";

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
  const response = await fetch(`${serverEnv.NEXT_PUBLIC_API_URL}/api/v1/me`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!response.ok) {
    if (response.status === 404) {
      throw new Error(
        "Identity endpoint /api/v1/me is missing. Restart or redeploy the backend from the same revision as the frontend.",
      );
    }
    throw new Error(`Identity service failed: HTTP ${response.status}`);
  }
  const backend = (await response.json()) as {
    userId: string;
    email: string | null;
    displayName: string | null;
    isSuperadmin: boolean;
    memberships: Identity["memberships"];
  };
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
