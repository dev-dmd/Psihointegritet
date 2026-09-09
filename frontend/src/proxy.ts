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
import { isSurfaceAllowedOnHost, normalizePathname } from "@/lib/routes/match";
import {
  decideProxyRoute,
  proxyFallbackLocale,
} from "@/lib/routes/proxy-locale";
import {
  isInternalOnlyPath,
  servedFromTenantSegment,
  tenantPathPrefix,
} from "@/lib/routes/tenant-rewrite";
import { tenantPathsEnabled } from "@/lib/tenant/domain-registry";

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
 *
 * # Two paths, and keeping them apart is the whole trick
 *
 * Outside production a tenant is named by the first path segment
 * (`staging.example.com/sanja-neuer/nalog`), because a subdomain there would
 * need wildcard DNS and a wildcard certificate to exist. So there are two paths
 * and they mean different things:
 *
 * - **`requestPath`** — what the visitor typed. The auth gate's `redirect_url`
 *   is built from it, so signing in returns them to the address they were at,
 *   tenant prefix included.
 * - **`surfacePath`** — the same path with the tenant prefix removed. *Every*
 *   routing decision reads this one, which is what makes the pipeline below
 *   identical to production's: after the strip, a path-addressed tenant and a
 *   domain-addressed tenant are the same request.
 *
 * In production `tenantPathsEnabled` is false, no prefix is ever found, the two
 * are the same string, and this file behaves exactly as it did before.
 */
function isProtectedPath(pathname: string): boolean {
  return PROTECTED_ROUTE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export default async function proxy(request: NextRequest) {
  // Captured before anything else: `NextResponse.rewrite` does not mutate
  // `request.nextUrl`, but relying on that leaves the invariant implicit. The
  // auth gate below must see what the visitor typed, not where we sent it.
  const requestPath = request.nextUrl.pathname;
  const search = request.nextUrl.search;
  const host = request.headers.get("host");
  const env = process.env.DEPLOYMENT_ENV;

  // The internal tenant tree must never be reachable as a URL of its own — it
  // would be the same pages served a second time, indexable beside the real
  // domain. Refused before anything else so no later branch can undo it.
  if (isInternalOnlyPath(requestPath)) {
    return new NextResponse("Not found", { status: 404 });
  }

  // A host that resolves to nobody is refused. That is what stops a stray
  // domain pointed at this project from serving some tenant's site, and what
  // makes `nepostojeci.localhost` a 404 rather than an empty tenant.
  const hostBinding = resolveHostBinding(host, { env });
  if (!hostBinding) {
    return new NextResponse("Not found", { status: 404 });
  }

  // Outside production, a first path segment naming a registered tenant turns
  // this platform request into that tenant's. Only on the platform surface: a
  // tenant's own domain already names its tenant, and letting a path override
  // that would be one domain serving another tenant's site.
  const prefixed =
    hostBinding.kind === "platform" && tenantPathsEnabled(env)
      ? tenantPathPrefix(requestPath)
      : null;
  const binding = prefixed
    ? ({ kind: "tenant", tenant: prefixed.tenant } as const)
    : hostBinding;
  const prefix = prefixed?.prefix ?? "";
  const surfacePath = prefixed?.path ?? requestPath;

  // `/sanja-neuer/s/x`, `/sanja-neuer/platform-home` — invisible to the check
  // above, which only saw the prefix. Same rule, applied to what is left.
  if (prefix !== "" && isInternalOnlyPath(surfacePath)) {
    return new NextResponse("Not found", { status: 404 });
  }

  // The platform host serves its own front page, never a tenant's. `app/(public)`
  // still holds the founding tenant's ~26 pages, and falling through to those
  // here would put Psihointegritet's home page on the platform's address — the
  // identity D-080 retired and the hole phase 2b closed.
  //
  // A rewrite rather than a redirect, so the platform answers 200 at its own
  // root instead of bouncing every visitor to sign-in.
  if (binding.kind === "platform" && normalizePathname(surfacePath) === "/") {
    return withSurface(
      NextResponse.rewrite(new URL(PLATFORM_HOME_ROUTE + search, request.url)),
      "platform",
      null,
      host,
      prefix,
    );
  }

  // Each surface answers on the host that owns it, and nowhere else. Checked
  // before the auth gate on purpose: sending someone to sign in on a domain
  // that will not serve the page afterwards is a worse answer than 404.
  //
  // On the stripped path, so `/sanja-neuer/radni-prostor` is refused for the
  // same reason `sanjaneuer.com/radni-prostor` is: an owner surface on a
  // tenant's address.
  if (!isSurfaceAllowedOnHost(surfacePath, binding.kind)) {
    return new NextResponse("Not found", { status: 404 });
  }

  const decision = decideProxyRoute(
    surfacePath,
    proxyFallbackLocale(process.env.DEFAULT_ORGANIZATION_SLUG),
  );

  if (decision.kind === "redirect") {
    const response = NextResponse.redirect(
      // The prefix goes back on: a redirect that dropped it would move the
      // visitor out of the tenant they were in, onto the platform.
      new URL(prefix + decision.target + search, request.url),
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
  //
  // Decided on `surfacePath`: `/sanja-neuer/nalog` is the client area, and the
  // unstripped path matches no protected prefix at all — it would have walked
  // straight past the gate.
  if (
    isProtectedPath(surfacePath) &&
    !request.cookies.has(PLATFORM_SESSION_COOKIE)
  ) {
    const signInUrl = new URL(SIGN_IN_URL, request.url);
    // The **external**, pre-rewrite path — `requestPath`, so the tenant prefix
    // survives the round trip. `/prijava` reads `redirect_url` to return the
    // visitor where they were actually headed; without it every protected route
    // sent them to the account area instead (found during superadmin smoke
    // testing, 2026-07-20).
    signInUrl.searchParams.set("redirect_url", requestPath + search);
    const response = NextResponse.redirect(signInUrl);
    // Same reason as the 308 above: the target depends on the host, and a
    // shared CDN caching one host's bounce would hand it to another.
    response.headers.set("Cache-Control", "private, no-store");
    return response;
  }

  // Path after the locale layer has canonicalised it, still without the query:
  // `servedFromTenantSegment` below compares whole segments, and a `?tab=x`
  // riding along made it miss the client area and rewrite `/account?tab=x` onto
  // a tenant segment where nothing exists. The query is attached once, at the
  // moment a URL is actually built.
  const internalPath =
    decision.kind === "rewrite" ? decision.internal : surfacePath;

  // A prefixed request can never pass through: the filesystem has no
  // `/sanja-neuer/...`, so `next()` would 404 the page we just resolved.
  const rewrittenPath = internalPath + search;
  const passThrough = prefix === "" && decision.kind !== "rewrite";

  // Owner surfaces stay where they are. Their organization comes from the
  // signed-in person, so wrapping them in a tenant segment would assert the
  // wrong thing — that the domain decides which tenant an owner is managing.
  if (binding.kind === "platform") {
    return withSurface(
      passThrough
        ? NextResponse.next()
        : NextResponse.rewrite(new URL(rewrittenPath, request.url)),
      "platform",
      null,
      host,
      prefix,
    );
  }

  const { tenant } = binding;

  // Not everything on a tenant host lives under that tenant's segment: the auth
  // pages and the Route Handlers are top-level files, the client area is scoped
  // by the stamp instead, and the founding tenant's public tree has not moved
  // yet. `servedFromTenantSegment` states all three in one place, beside the
  // reason each one is there.
  //
  // What matters either way is that the *request* decides the tenant — the host
  // in production, the path prefix elsewhere — and never the page. A client who
  // signs in on `sanjaneuer.com` stays in Sanja's space and never meets another
  // tenant's account page. The stamp carries that, not the URL shape.
  if (!servedFromTenantSegment(internalPath, tenant)) {
    return withSurface(
      passThrough
        ? NextResponse.next()
        : NextResponse.rewrite(new URL(rewrittenPath, request.url)),
      "tenant",
      tenant.organizationSlug,
      host,
      prefix,
    );
  }

  const tenantUrl = new URL(
    `${TENANT_ROUTE_PREFIX}/${tenant.organizationSlug}${rewrittenPath}`,
    request.url,
  );
  return withSurface(
    NextResponse.rewrite(tenantUrl),
    "tenant",
    tenant.organizationSlug,
    host,
    prefix,
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
  prefix: string,
): NextResponse {
  response.headers.set(TENANT_SURFACE_HEADER, surface);
  if (slug) response.headers.set(TENANT_SLUG_HEADER, slug);
  // Neither a temporary stand-in host nor a path-addressed tenant may compete
  // with the domain it stands in for. The tenant placeholder already carries
  // `robots: noindex`, but that is one page's metadata — and a finished tenant
  // site sets `index: true` unconditionally, so on staging it would otherwise
  // publish a full duplicate of the real thing. The header covers every
  // response, including the ones that are not HTML and never get a `<meta>`.
  //
  // Stamped from the registry rather than from a hostname literal, so deleting
  // `temporaryAccessUrl` retires that half automatically.
  if (prefix !== "" || isTemporaryAccessHost(host)) {
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
