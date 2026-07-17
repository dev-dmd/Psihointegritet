"use client";

import { useAuth, useUser } from "@clerk/nextjs";

import type { IdentityState } from "@/lib/auth/identity";

/**
 * Maps the Clerk client session onto the provider-neutral `Identity` contract.
 *
 * `role` is intentionally `null`: authorization is never read from Clerk
 * (ARCHITECTURAL_RULES §10.3). It will be populated from the backend
 * `GET /api/v1/me` once the identity slice is wired.
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

  return {
    isLoaded: true,
    isSignedIn: true,
    identity: {
      userId,
      email: user?.primaryEmailAddress?.emailAddress ?? null,
      // TODO(identity-backend): populate isSuperadmin + memberships from GET /api/v1/me
      isSuperadmin: false,
      memberships: [],
    },
  };
}
