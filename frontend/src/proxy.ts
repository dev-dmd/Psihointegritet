import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { PROTECTED_ROUTE_PREFIXES, SIGN_IN_URL } from "@/lib/auth/routes";
import {
  decideProxyRoute,
  proxyFallbackLocale,
} from "@/lib/routes/proxy-locale";

/**
 * Next.js 16 renamed the `middleware` convention to `proxy`; Clerk v7 supports
 * running `clerkMiddleware()` from `proxy.ts`.
 *
 * Two jobs, in this order:
 *
 * 1. **Locale routing.** Workspace paths rewrite onto their physical English
 *    routes; registered public paths rewrite onto their existing physical
 *    Serbian routes. Both locale spellings resolve to one page while the
 *    browser keeps the URL selected by the rendered link.
 * 2. **Authentication gate.** Coarse only — it redirects unauthenticated
 *    visitors on protected routes to sign-in. It is never the final
 *    authorization layer; role and ownership checks live in FastAPI per use
 *    case (ARCHITECTURAL_RULES §10.3, v0.3 §5.4).
 *
 * Locale first, auth second, deliberately. `redirect_url` must carry the
 * **external, pre-rewrite** path so the visitor returns to their own URL after
 * signing in instead of receiving the filesystem route.
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

  const decision = decideProxyRoute(
    externalPath,
    search,
    proxyFallbackLocale(process.env.DEFAULT_ORGANIZATION_SLUG),
  );

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

  // **Auth before the response is constructed.** `auth.protect()` performs
  // Clerk's session handshake and decorates the response the handler returns.
  // Building the rewrite first and returning that object meant the handshake's
  // headers were attached to something we then threw away: the first render
  // after sign-in had no resolved session and the panel only appeared after a
  // manual refresh, once the cookie had been set by some later response.
  //
  // Nothing is rewritten for an unauthenticated visitor anyway — `protect`
  // redirects, so the lines below never run.
  if (isProtectedPath(externalPath)) {
    const signInUrl = new URL(SIGN_IN_URL, request.url);
    // Clerk's <SignIn/> reads `redirect_url` and returns the user there after
    // a successful sign-in, overriding signInFallbackRedirectUrl. Without it
    // every protected route bounced back to the account area regardless of
    // where the visitor was actually headed (found during superadmin smoke
    // testing, 2026-07-20). It must stay the **external** path, so the visitor
    // lands back on their own URL rather than the rewrite target.
    signInUrl.searchParams.set("redirect_url", externalPath + search);
    await auth.protect({ unauthenticatedUrl: signInUrl.toString() });
  }

  return decision.kind === "rewrite"
    ? NextResponse.rewrite(new URL(decision.internal, request.url))
    : NextResponse.next();
});

export const config = {
  matcher: [
    // Run on all app routes except Next internals and static files with an extension.
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run on API routes.
    "/(api|trpc)(.*)",
  ],
};
