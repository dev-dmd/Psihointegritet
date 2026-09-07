import type { ReactNode } from "react";

import { ClerkProvider } from "@clerk/nextjs";

import { clerkAppearance } from "@/lib/auth/clerk/appearance";
import { clerkDomainConfig } from "@/lib/auth/clerk/multi-domain";
import { POST_AUTH_LANDING_PATH } from "@/lib/routes/auth-paths";

/**
 * The single place `ClerkProvider` is mounted (ARCHITECTURAL_RULES §10.1 — all
 * Clerk-specific frontend code stays under `lib/auth/clerk/`). The rest of the
 * app wraps with `<AuthProvider>`, never `<ClerkProvider>` directly.
 *
 * The publishable key is read from `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` by Clerk
 * automatically; it is validated at startup in `lib/validation/env.ts`.
 *
 * # This component must never read the request
 *
 * It is mounted in the root layout, so it wraps **every** page including the
 * public tree. Calling `headers()` here opts the entire app out of static
 * rendering: measured, it took the build from 30 prerendered routes to 3 and
 * put the whole public site on SSR — exactly what D-077's rendering contract
 * forbids, arrived at through a component nobody would think to check.
 *
 * # Why the satellite declaration is not here yet
 *
 * `isSatellite`/`domain` are per-host, and this component may not read the
 * host. Clerk's `(url) => …` form solves that in principle, but a function
 * cannot cross a Server-to-Client Component boundary — the build fails with
 * "Functions cannot be passed directly to Client Components". Mounting the
 * provider as a client component would work and is the likely shape, but it
 * cannot be validated against anything until the Clerk instance's primary
 * domain actually moves.
 *
 * So the decision logic lives, tested, in `multi-domain.ts`, and everything
 * that is safe today — the sign-in URLs, the redirect origins, the role-aware
 * landing — is wired here. Declaring satellites is a step in the Clerk cutover
 * itself (§9.2 of the migration plan), landing in the same change as the
 * Dashboard switch rather than waiting in production for it.
 *
 * # The landing was a constant, and could not stay one
 *
 * `signInFallbackRedirectUrl` pointed at `/nalog`, which is right only while
 * every host belongs to a tenant. On the platform host `/nalog` is deliberately
 * 404, so anybody opening `/prijava` there would have been sent to a page that
 * does not exist. It now points at a dispatcher that reads roles and decides.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const config = clerkDomainConfig();

  return (
    <ClerkProvider
      appearance={clerkAppearance}
      signInUrl={config.signInUrl}
      signUpUrl={config.signUpUrl}
      allowedRedirectOrigins={config.allowedRedirectOrigins}
      // Role-aware, not a path: the dispatcher resolves where this person
      // belongs. A protected route still overrides it with `redirect_url`,
      // which is why this is the *fallback*.
      signInFallbackRedirectUrl={POST_AUTH_LANDING_PATH}
      signUpFallbackRedirectUrl={POST_AUTH_LANDING_PATH}
    >
      {children}
    </ClerkProvider>
  );
}
