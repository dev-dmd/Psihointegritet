import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { PROTECTED_ROUTE_PREFIXES, SIGN_IN_URL } from "@/lib/auth/routes";
import { PLATFORM_SESSION_COOKIE } from "@/lib/auth/session/cookies";
import {
  PLATFORM_HOME_ROUTE,
  TENANT_ROUTE_PREFIX,
  TENANT_SLUG_HEADER,
  TENANT_SURFACE_HEADER,
  isTemporaryAccessHost,
  resolveHostBinding,
} from "@/lib/tenant/domain-registry";
import {
  hasRoutePrefix,
  isSurfaceAllowedOnHost,
  normalizePathname,
  platformRoutePrefixes,
} from "@/lib/routes/match";
import {
  decideProxyRoute,
  proxyFallbackLocale,
} from "@/lib/routes/proxy-locale";
import { servedFromTenantSegment } from "@/lib/routes/tenant-rewrite";
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
const PLATFORM_PATH_PREFIXES = platformRoutePrefixes();

function isPlatformPath(pathname: string): boolean {
  return hasRoutePrefix(pathname, PLATFORM_PATH_PREFIXES);
}

export default async function proxy(request: NextRequest) {
  // Captured before anything else: `NextResponse.rewrite` does not mutate
  // `request.nextUrl`, but relying on that leaves the invariant implicit. The
  // auth gate below must see what the visitor typed, not where we sent it.
  const externalPath = request.nextUrl.pathname;
  const search = request.nextUrl.search;
  const host = request.headers.get("host");

  // The internal tenant tree must never be reachable as a URL of its own — it
  // would be the same pages served a second time, indexable beside the real
  // domain. Refused before anything else so no later branch can undo it.
  if (
    externalPath.startsWith(`${TENANT_ROUTE_PREFIX}/`) ||
    normalizePathname(externalPath) === PLATFORM_HOME_ROUTE
  ) {
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

  // The platform host serves its own front page, never a tenant's. `app/(public)`
  // still holds the founding tenant's ~26 pages, and falling through to those
  // here would put Psihointegritet's home page on the platform's address — the
  // identity D-080 retired and the hole phase 2b closed.
  //
  // A rewrite rather than a redirect, so the platform answers 200 at its own
  // root instead of bouncing every visitor to sign-in. A host that is *also* a
  // tenant keeps its own home page, which is why this reads `!tenant` rather
  // than naming a hostname.
  if (onPlatformHost && !tenant && normalizePathname(externalPath) === "/") {
    return withSurface(
      NextResponse.rewrite(new URL(PLATFORM_HOME_ROUTE + search, request.url)),
      "platform",
      null,
      host,
    );
  }

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

  // Protected routes bounce to sign-in when no session cookie is present.
  //
  // **Presence, not verification, and deliberately so.** The proxy runs on every
  // request and cannot reach the database; asking it to validate would mean a
  // network round trip per navigation, or a token it could check itself — which
  // is a JWT, which is a session nobody can revoke. So this is a coarse gate
  // that saves an obvious round trip, and nothing more.
  //
  // A forged cookie gets past it and reaches the page, where `getServerIdentity`
  // presents the token to the backend, the backend finds no live row in
  // `auth_sessions`, and the guard redirects. Authorization is the backend's
  // answer, never the proxy's (rules v0.3 §5.4) — the proxy is an optimisation
  // that must never be the thing standing between somebody and a panel.
  if (
    isProtectedPath(externalPath) &&
    !request.cookies.has(PLATFORM_SESSION_COOKIE)
  ) {
    const signInUrl = new URL(SIGN_IN_URL, request.url);
    // The **external**, pre-rewrite path. `/prijava` reads `redirect_url` to
    // return the visitor where they were actually headed; without it every
    // protected route sent them to the account area instead (found during
    // superadmin smoke testing, 2026-07-20).
    signInUrl.searchParams.set("redirect_url", externalPath + search);
    const response = NextResponse.redirect(signInUrl);
    // Same reason as the 308 above: the target depends on the host, and a
    // shared CDN caching one host's bounce would hand it to another.
    response.headers.set("Cache-Control", "private, no-store");
    return response;
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
      host,
    );
  }

  if (!tenant) return NextResponse.next();

  // Not everything on a tenant host lives under that tenant's segment: the auth
  // pages and the Route Handlers are top-level files, the client area is scoped
  // by the stamp instead, and the founding tenant's public tree has not moved
  // yet. `servedFromTenantSegment` states all three in one place, beside the
  // reason each one is there.
  //
  // What matters either way is that the *host* decides the tenant: a client who
  // signs in on `sanjaneuer.com` stays in Sanja's space and never meets another
  // tenant's account page. The stamp carries that, not the URL shape.
  if (!servedFromTenantSegment(internalPath, tenant)) {
    return withSurface(
      decision.kind === "rewrite"
        ? NextResponse.rewrite(new URL(internalPath + search, request.url))
        : NextResponse.next(),
      "tenant",
      tenant.organizationSlug,
      host,
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
    host,
  );
}

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
  host: string | null,
): NextResponse {
  response.headers.set(TENANT_SURFACE_HEADER, surface);
  if (slug) response.headers.set(TENANT_SLUG_HEADER, slug);
  // A temporary stand-in host must not compete with the domain it stands in
  // for. The tenant placeholder already carries `robots: noindex`, but that is
  // one page's metadata; the header covers every response this host returns,
  // including the ones that are not HTML and never get a `<meta>` tag.
  //
  // Stamped from the registry rather than from a hostname literal, so deleting
  // `temporaryAccessUrl` retires it automatically.
  if (isTemporaryAccessHost(host)) {
    response.headers.set("X-Robots-Tag", "noindex, nofollow");
  }
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
