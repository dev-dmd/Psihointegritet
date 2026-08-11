import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { PROTECTED_ROUTE_PREFIXES, SIGN_IN_URL } from "@/lib/auth/routes";
import { decideProxyRoute, proxyUiLocale } from "@/lib/routes/proxy-locale";

/**
 * Next.js 16 renamed the `middleware` convention to `proxy`; Clerk v7 supports
 * running `clerkMiddleware()` from `proxy.ts`.
 *
 * Two jobs, in this order:
 *
 * 1. **Locale routing.** The physical routes are English (`/workspace/...`).
 *    A Serbian organization's URLs (`/radni-prostor/...`) are rewritten onto
 *    them, so the browser keeps the Serbian path while one page renders. A path
 *    in the wrong locale for this organization gets a 308 to the equivalent.
 * 2. **Authentication gate.** Coarse only — it redirects unauthenticated
 *    visitors on protected routes to sign-in. It is never the final
 *    authorization layer; role and ownership checks live in FastAPI per use
 *    case (ARCHITECTURAL_RULES §10.3, v0.3 §5.4).
 *
 * Locale first, auth second, deliberately. `redirect_url` must carry the
 * **external, pre-rewrite** path so the visitor returns to their own URL after
 * signing in, and running the locale step first means that path is already
 * canonical — otherwise a bookmark in the wrong locale would sign in, land,
 * and only then bounce through a 308.
 */
function isProtectedPath(pathname: string): boolean {
  return PROTECTED_ROUTE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export default clerkMiddleware(async (auth, request) => {
  // Captured before anything else: `NextResponse.rewrite` does not mutate
  // `request.nextUrl`, but relying on that leaves the invariant implicit. The
  // auth gate below must see what the visitor typed, not where we sent it.
  const externalPath = request.nextUrl.pathname;
  const search = request.nextUrl.search;

  const uiLocale = proxyUiLocale(process.env.DEFAULT_ORGANIZATION_SLUG);
  const decision = decideProxyRoute(externalPath, search, uiLocale);

  if (decision.kind === "redirect") {
    const response = NextResponse.redirect(
      new URL(decision.target, request.url),
      308,
    );
    // The target depends on the organization, so a shared CDN caching one
    // tenant's 308 would hand it to another. Never cache this publicly.
    response.headers.set("Cache-Control", "private, no-store");
    return response;
  }

  const response =
    decision.kind === "rewrite"
      ? NextResponse.rewrite(new URL(decision.internal, request.url))
      : NextResponse.next();

  if (isProtectedPath(externalPath)) {
    const signInUrl = new URL(SIGN_IN_URL, request.url);
    // Clerk's <SignIn/> reads `redirect_url` and returns the user there after
    // a successful sign-in, overriding signInFallbackRedirectUrl. Without it
    // every protected route bounced back to the account area regardless of
    // where the visitor was actually headed (found during superadmin smoke
    // testing, 2026-07-20).
    signInUrl.searchParams.set("redirect_url", externalPath + search);
    await auth.protect({ unauthenticatedUrl: signInUrl.toString() });
  }

  return response;
});

export const config = {
  matcher: [
    // Run on all app routes except Next internals and static files with an extension.
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run on API routes.
    "/(api|trpc)(.*)",
  ],
};
