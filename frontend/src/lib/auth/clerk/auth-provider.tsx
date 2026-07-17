import type { ReactNode } from "react";

import { ClerkProvider } from "@clerk/nextjs";

import { clerkAppearance } from "@/lib/auth/clerk/appearance";
import { AFTER_AUTH_URL, SIGN_IN_URL, SIGN_UP_URL } from "@/lib/auth/routes";

/**
 * The single place `ClerkProvider` is mounted (ARCHITECTURAL_RULES §10.1 — all
 * Clerk-specific frontend code stays under `lib/auth/clerk/`). The rest of the
 * app wraps with `<AuthProvider>`, never `<ClerkProvider>` directly.
 *
 * The publishable key is read from `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` by Clerk
 * automatically; it is validated at startup in `lib/validation/env.ts`.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  return (
    <ClerkProvider
      appearance={clerkAppearance}
      signInUrl={SIGN_IN_URL}
      signUpUrl={SIGN_UP_URL}
      signInFallbackRedirectUrl={AFTER_AUTH_URL}
      signUpFallbackRedirectUrl={AFTER_AUTH_URL}
    >
      {children}
    </ClerkProvider>
  );
}
