import { clerkMiddleware } from "@clerk/nextjs/server";

import { PROTECTED_ROUTE_PREFIXES, SIGN_IN_URL } from "@/lib/auth/routes";

/**
 * Next.js 16 renamed the `middleware` convention to `proxy`; Clerk v7 supports
 * running `clerkMiddleware()` from `proxy.ts`.
 *
 * This is only a coarse authentication gate — it redirects unauthenticated
 * visitors on protected routes to our sign-in page. It is never the final
 * authorization layer; role/ownership checks live in the FastAPI backend per
 * use case (ARCHITECTURAL_RULES §10.3, v0.3 §5.4).
 *
 * We do the prefix match ourselves rather than with Clerk's `createRouteMatcher`
 * (deprecated in v7) — the proxy's job here is exactly this path-based redirect.
 */
function isProtectedPath(pathname: string): boolean {
  return PROTECTED_ROUTE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export default clerkMiddleware(async (auth, request) => {
  if (isProtectedPath(request.nextUrl.pathname)) {
    await auth.protect({
      unauthenticatedUrl: new URL(SIGN_IN_URL, request.url).toString(),
    });
  }
});

export const config = {
  matcher: [
    // Run on all app routes except Next internals and static files with an extension.
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run on API routes.
    "/(api|trpc)(.*)",
  ],
};
