import type { ReactNode } from "react";

import { ClerkProvider } from "@clerk/nextjs";

import { clerkAppearance } from "@/lib/auth/clerk/appearance";
import { getUiLocale } from "@/i18n/locale-boundary";
import { SIGN_IN_URL, SIGN_UP_URL } from "@/lib/auth/routes";
import { localizedPath } from "@/lib/routes/localized-path";

/**
 * The single place `ClerkProvider` is mounted (ARCHITECTURAL_RULES §10.1 — all
 * Clerk-specific frontend code stays under `lib/auth/clerk/`). The rest of the
 * app wraps with `<AuthProvider>`, never `<ClerkProvider>` directly.
 *
 * The publishable key is read from `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` by Clerk
 * automatically; it is validated at startup in `lib/validation/env.ts`.
 */
export async function AuthProvider({ children }: { children: ReactNode }) {
  // Where Clerk lands a user when nothing else specifies a target. It follows
  // the organization: an English organization must not be dropped on `/nalog`.
  // `signInUrl`/`signUpUrl` stay literals — auth and callback routes are not
  // localized (D-077 Amendment §10), so their contract with Clerk is stable.
  const afterAuthUrl = localizedPath("account.home", {
    locale: await getUiLocale(),
  });

  return (
    <ClerkProvider
      appearance={clerkAppearance}
      signInUrl={SIGN_IN_URL}
      signUpUrl={SIGN_UP_URL}
      signInFallbackRedirectUrl={afterAuthUrl}
      signUpFallbackRedirectUrl={afterAuthUrl}
    >
      {children}
    </ClerkProvider>
  );
}
