"use client";

import { useAuth, useUser } from "@clerk/nextjs";
import { useEffect, useState } from "react";

import type { Identity, IdentityState } from "@/lib/auth/identity";

/**
 * Maps the Clerk client session onto the provider-neutral `Identity` contract.
 * Roles are loaded from PostgreSQL through the same `/api/v1/me` endpoint the
 * server guards use; Clerk metadata is never an authorization input here.
 */
export function useIdentity(): IdentityState {
  const { isLoaded, isSignedIn, userId } = useAuth();
  const { user } = useUser();
  const [backend, setBackend] = useState<{
    userId: string;
    identity: Identity | null;
  } | null>(null);

  useEffect(() => {
    if (!isLoaded || !isSignedIn || !userId) return;
    let cancelled = false;
    void fetch("/api/me", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("Identity request failed");
        return (await response.json()) as Identity;
      })
      .then((identity) => {
        if (!cancelled) setBackend({ userId, identity });
      })
      .catch(() => {
        if (!cancelled) setBackend({ userId, identity: null });
      });
    return () => {
      cancelled = true;
    };
  }, [isLoaded, isSignedIn, userId]);

  if (!isLoaded || (isSignedIn && backend?.userId !== userId)) {
    return { isLoaded: false, isSignedIn: false, identity: null };
  }

  if (!isSignedIn || !userId) {
    return { isLoaded: true, isSignedIn: false, identity: null };
  }

  if (!backend?.identity) {
    return { isLoaded: true, isSignedIn: true, identity: null };
  }

  return {
    isLoaded: true,
    isSignedIn: true,
    identity: {
      ...backend.identity,
      email:
        backend.identity.email ??
        user?.primaryEmailAddress?.emailAddress ??
        null,
      displayName:
        backend.identity.displayName ??
        user?.fullName ??
        ([user?.firstName, user?.lastName].filter(Boolean).join(" ") || null),
    },
  };
}
