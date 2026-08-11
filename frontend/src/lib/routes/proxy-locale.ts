import { type UiLocale, isUiLocale } from "@/i18n/locales";
import { internalPath, localizedPath } from "@/lib/routes/localized-path";
import {
  ROUTE_ALIASES,
  type PlatformRouteId,
} from "@/lib/routes/platform-routes";
import { matchPlatformPath, normalizePathname } from "@/lib/routes/match";
import {
  FALLBACK_ORGANIZATION_LOCALE_SETTINGS,
  findOrganizationLocaleSettings,
} from "@/lib/tenant/organizations";

/**
 * The locale decision the proxy makes, expressed as data so it can be unit
 * tested without a running Next server.
 *
 * `proxy.ts` itself stays a thin adapter: read the request, call this, act. The
 * two failure modes that matter here — an unauthenticated Control Center and a
 * redirect loop — are both cheaper to prove against a pure function than
 * against an edge runtime.
 */
export type ProxyRouteDecision =
  | { kind: "pass" }
  | { kind: "rewrite"; internal: string }
  | { kind: "redirect"; target: string };

/**
 * Locale for the proxy, read without any request-scoped input.
 *
 * Cannot import `lib/tenant/org-context.ts` — that module is `server-only` and
 * the proxy runs on the edge. It reads the same env var and the same table, and
 * `proxy-locale.test.ts` asserts the two agree, so there is one answer rather
 * than two implementations that drift.
 */
export function proxyUiLocale(orgSlug: string | undefined): UiLocale {
  const settings = orgSlug
    ? findOrganizationLocaleSettings(orgSlug)
    : undefined;
  // The proxy is the wrong place to crash: it runs before any error boundary,
  // and throwing here answers every request with a blank 500 including the
  // sign-in page. `org-context.ts` still throws during render, so a bad slug is
  // loud — just not in a way that takes the whole site down first.
  return (settings ?? FALLBACK_ORGANIZATION_LOCALE_SETTINGS)
    .defaultContentLocale;
}

/** Paths the proxy never touches: API, Next internals, auth and callbacks. */
function isExempt(pathname: string): boolean {
  return (
    pathname === "/api" ||
    pathname.startsWith("/api/") ||
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/prijava") ||
    pathname.startsWith("/registracija")
  );
}

function aliasTarget(pathname: string): PlatformRouteId | undefined {
  return ROUTE_ALIASES[pathname];
}

/**
 * Decide what to do with an incoming external path.
 *
 * Order matters and is the loop-safety argument:
 *
 * 1. exempt paths pass untouched — API routes are never localized;
 * 2. a retired alias redirects to its route's canonical path;
 * 3. a path whose locale disagrees with the organization's gets a **308** to
 *    the equivalent path, dynamic params and query preserved;
 * 4. a canonical non-English path is **rewritten** onto the physical English
 *    route — the browser keeps the Serbian URL, Next renders one page;
 * 5. anything unregistered passes through.
 *
 * Step 3 cannot fire twice: it only runs when `pathLocale !== uiLocale`, and the
 * path it redirects to is built by `localizedPath` for `uiLocale`, so the next
 * request matches. That holds only if
 * `matchPlatformPath(localizedPath(id, p, L))` round-trips exactly, which is
 * the property test in `platform-routes.test.ts`.
 *
 * Step 4 cannot re-enter: Next runs the proxy once per incoming request, and a
 * rewrite to an internal path does not re-dispatch it.
 */
export function decideProxyRoute(
  pathname: string,
  search: string,
  uiLocale: UiLocale,
): ProxyRouteDecision {
  const normalized = normalizePathname(pathname);
  if (isExempt(normalized)) return { kind: "pass" };

  const alias = aliasTarget(normalized);
  if (alias !== undefined) {
    return {
      kind: "redirect",
      target: localizedPath(alias, { locale: uiLocale }) + search,
    };
  }

  const match = matchPlatformPath(normalized);
  if (match === null) return { kind: "pass" };

  if (match.pathLocale !== uiLocale) {
    // `as never` only because the params bag is dynamic here; the route's own
    // param names came out of `matchPlatformPath`, so they are exactly the ones
    // `localizedPath` requires.
    const target = localizedPath(match.routeId, {
      locale: uiLocale,
      params: match.params,
    } as never);

    // Never redirect to the path we are already on.
    //
    // This is not defensive padding — it closes a real infinite loop found by
    // the round-trip property test. A locale-neutral route (`/superadmin`) has
    // the same path in every locale, so `matchPlatformPath` reports whichever
    // locale it compiled first. On a Serbian organization that is `en`, the
    // locale check above fires, and the redirect target is byte-identical to
    // the request: every superadmin page would have bounced until the browser
    // gave up.
    //
    // Comparing the computed target is stronger than special-casing
    // `localeNeutral`, because it also holds for any future route whose two
    // locale paths happen to coincide.
    if (normalizePathname(target) !== normalized) {
      return { kind: "redirect", target: target + search };
    }
  }

  // Rewrite whenever the external path differs from the physical one — not
  // "whenever the locale is not English". The workspace moved to English
  // segments but the client panel has not, so `/account` is external-only while
  // `/nalog` is both. A locale-shaped condition would silently 404 one of them;
  // comparing the two paths is the thing that is actually true.
  const internal = internalPath(match.routeId, {
    params: match.params,
  } as never);
  if (internal === normalized) return { kind: "pass" };

  return { kind: "rewrite", internal: internal + search };
}

export { isUiLocale };
