"use client";

import { useAuth, useUser } from "@clerk/nextjs";

import type { IdentityState } from "@/lib/auth/identity";

import { parseRoleMetadata } from "./public-metadata";

/**
 * Maps the Clerk client session onto the provider-neutral `Identity` contract.
 *
 * Roles come from Clerk `publicMetadata` (interim source, D-026) through the
 * same parser the server adapter uses. Display only — real authorization is
 * the server-side guard chain (`lib/auth/guards.ts`), and this source is
 * replaced by backend `GET /api/v1/me` in M2.1.
 */
export function useIdentity(): IdentityState {
  const { isLoaded, isSignedIn, userId } = useAuth();
  const { user } = useUser();

  if (!isLoaded) {
    return { isLoaded: false, isSignedIn: false, identity: null };
  }

  if (!isSignedIn || !userId) {
    return { isLoaded: true, isSignedIn: false, identity: null };
  }

  const meta = parseRoleMetadata(user?.publicMetadata);

  return {
    isLoaded: true,
    isSignedIn: true,
    identity: {
      userId,
      email: user?.primaryEmailAddress?.emailAddress ?? null,
      isSuperadmin: meta.superadmin,
      memberships:
        meta.roles.length > 0
          ? [{ organizationId: meta.org, roles: meta.roles }]
          : [],
    },
  };
}
