"use client";

import type { IdentityState } from "@/lib/auth/identity";

/**
 * The signed-in person, as the browser sees them.
 *
 * Returns the same provider-neutral `IdentityState` the Clerk adapter returned,
 * so every consumer keeps its shape. Today it always answers "loaded, and
 * nobody is signed in" — Clerk is gone (D-083) and the PDC auth engine is a
 * later slice.
 *
 * **`isLoaded: true` is deliberate.** The alternative — pretending the session
 * is still loading — would leave every avatar and menu in a permanent skeleton
 * state. "We know, and the answer is nobody" is the truth, and it renders the
 * signed-out branch each consumer already has.
 *
 * When the auth engine lands this reads the session from `/api/me` exactly as
 * the Clerk version did; the roles were always PostgreSQL's answer, never the
 * provider's, which is why that half needs no redesign.
 */
export function useSession(): IdentityState {
  return { isLoaded: true, isSignedIn: false, identity: null };
}
