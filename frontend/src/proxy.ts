import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { PROTECTED_ROUTE_PREFIXES, SIGN_IN_URL } from "@/lib/auth/routes";
import {
  TENANT_ROUTE_PREFIX,
  TENANT_SLUG_HEADER,
  TENANT_SURFACE_HEADER,
  resolveHostBinding,
} from "@/lib/tenant/domain-registry";
import {
  clientRoutePrefixes,
  hasRoutePrefix,
  isSurfaceAllowedOnHost,
  platformRoutePrefixes,
} from "@/lib/routes/match";
import {
  decideProxyRoute,
  proxyFallbackLocale,
} from "@/lib/routes/proxy-locale";
import { deploymentSlugFromEnv } from "@/lib/tenant/deployment-slug";

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

/**
 * Surfaces that belong to the platform, not to any tenant: the owners' work
 * area and the operator console. They answer on the platform host and are never
 * rewritten onto a tenant segment, because which organization an owner is
 * working in comes from their membership rather than from the address bar.
 */
const CLIENT_PATH_PREFIXES = clientRoutePrefixes();
const PLATFORM_PATH_PREFIXES = platformRoutePrefixes();

function isClientPath(pathname: string): boolean {
  return hasRoutePrefix(pathname, CLIENT_PATH_PREFIXES);
}

function isPlatformPath(pathname: string): boolean {
  return hasRoutePrefix(pathname, PLATFORM_PATH_PREFIXES);
}

export default clerkMiddleware(async (auth, request) => {
  // Captured before anything else: `NextResponse.rewrite` does not mutate
  // `request.nextUrl`, but relying on that leaves the invariant implicit. The
  // auth gate below must see what the visitor typed, not where we sent it.
  const externalPath = request.nextUrl.pathname;
  const search = request.nextUrl.search;
  const host = request.headers.get("host");

  // The internal tenant tree must never be reachable as a URL of its own — it
  // would be the same pages served a second time, indexable beside the real
  // domain. Refused before anything else so no later branch can undo it.
  if (externalPath.startsWith(`${TENANT_ROUTE_PREFIX}/`)) {
    return new NextResponse("Not found", { status: 404 });
  }

  // A host that resolves to nobody is refused. That is what stops a stray
  // domain pointed at this project from serving some tenant's site — and on a
  // preview deployment, whose hostname no table can list, it is what lets the
  // deployment's own tenant binding still answer.
  const binding = resolveHostBinding(host, {
    env: process.env.DEPLOYMENT_ENV,
    slug: deploymentSlugFromEnv(),
  });
  if (!binding) {
    return new NextResponse("Not found", { status: 404 });
  }
  const { tenant, isPlatform: onPlatformHost } = binding;

  // Each surface answers on the host that owns it, and nowhere else. Checked
  // before the auth gate on purpose: sending someone to sign in on a domain
  // that will not serve the page afterwards is a worse answer than 404.
  if (
    !isSurfaceAllowedOnHost(externalPath, {
      isTenant: tenant !== undefined,
      isPlatform: onPlatformHost,
    })
  ) {
    return new NextResponse("Not found", { status: 404 });
  }

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

  // Path after the locale layer has canonicalised it; the tenant rewrite goes
  // on top so both spellings of a route reach the same tenant page.
  const internalPath =
    decision.kind === "rewrite" ? decision.internal : externalPath;

  // Owner surfaces stay where they are. Their organization comes from the
  // signed-in person, so wrapping them in a tenant segment would assert the
  // wrong thing — that the domain decides which tenant an owner is managing.
  // On a host that is both — the founding tenant's domain today — only the
  // owner surfaces are the platform's. Its public pages and its clients belong
  // to the tenant, and must be stamped as such.
  if (onPlatformHost && (isPlatformPath(externalPath) || !tenant)) {
    return withSurface(
      decision.kind === "rewrite"
        ? NextResponse.rewrite(new URL(internalPath + search, request.url))
        : NextResponse.next(),
      "platform",
      null,
    );
  }

  if (!tenant) return NextResponse.next();

  // The client area stays where it is and is scoped by the stamp instead of by
  // a rewrite. These routes are behind authentication and request-time already,
  // so the guard can read which tenant the visitor arrived at; moving five
  // pages under the tenant segment would buy nothing this slice needs.
  //
  // What matters is that it is the *host* that decides: a client who signs in
  // on `sanjaneuer.com` stays in Sanja's space and never meets another
  // tenant's account page.
  const isClientSurface = isClientPath(internalPath);

  // The founding tenant's ~26 public pages still live in `app/(public)` with
  // copy written for that one organization; PDC-1 moves them under the tenant
  // segment together with the page model. Until then they pass through.
  if (isClientSurface || tenant.usesLegacyPublicTree) {
    return withSurface(
      decision.kind === "rewrite"
        ? NextResponse.rewrite(new URL(internalPath + search, request.url))
        : NextResponse.next(),
      "tenant",
      tenant.organizationSlug,
    );
  }

  const tenantUrl = new URL(
    `${TENANT_ROUTE_PREFIX}/${tenant.organizationSlug}${internalPath}${search}`,
    request.url,
  );
  return withSurface(
    NextResponse.rewrite(tenantUrl),
    "tenant",
    tenant.organizationSlug,
  );
});

/**
 * Stamp which surface this request is on, and for a tenant surface, which one.
 *
 * Read only by request-time code — the guards and the identity fetch — so it
 * never reaches a prerendered page. Public pages take the tenant from their
 * route param instead, which is what keeps them static.
 */
function withSurface(
  response: NextResponse,
  surface: "tenant" | "platform",
  slug: string | null,
): NextResponse {
  response.headers.set(TENANT_SURFACE_HEADER, surface);
  if (slug) response.headers.set(TENANT_SLUG_HEADER, slug);
  return response;
}

export const config = {
  matcher: [
    // Run on all app routes except Next internals and static files with an extension.
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run on API routes.
    "/(api|trpc)(.*)",
  ],
};
