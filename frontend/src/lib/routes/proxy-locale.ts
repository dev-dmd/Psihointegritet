import { type UiLocale, isUiLocale } from "@/i18n/locales";
import { internalPath, localizedPath } from "@/lib/routes/localized-path";
import {
  ROUTE_ALIASES,
  type PlatformRouteId,
} from "@/lib/routes/platform-routes";
import { matchPlatformPath, normalizePathname } from "@/lib/routes/match";
import { internalPublicPath, matchPublicPath } from "@/lib/routes/public-path";
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
 * The spelling the proxy reaches for when it has to *build* a path itself.
 *
 * Read from the static registry, with no request-scoped input: this module
 * cannot import `lib/tenant/org-context.ts` (`server-only`, and the proxy runs
 * on the edge), so it cannot see the live `ui_locale` an administrator set
 * through the panel.
 *
 * That limit is why this is no longer an authority over anyone's URL. It was:
 * the proxy used to 308 any path whose locale disagreed with this value, and
 * on a deployment whose organization had been switched to English in the panel
 * it sent every English path straight back to Serbian — the registry saying
 * `sr-Latn` at build time, the database saying `en` since. The proxy ran first,
 * so the registry won, and no amount of translating the screens could show
 * through. Now it only names the alias-redirect target, where either spelling
 * resolves anyway.
 *
 * It reports `ui_locale` rather than `default_content_locale` because the paths
 * it builds are workspace paths, and D-077 gives those to `ui_locale`.
 */
export function proxyFallbackLocale(orgSlug: string | undefined): UiLocale {
  const settings = orgSlug
    ? findOrganizationLocaleSettings(orgSlug)
    : undefined;
  // The proxy is the wrong place to crash: it runs before any error boundary,
  // and throwing here answers every request with a blank 500 including the
  // sign-in page. `org-context.ts` still throws during render, so a bad slug is
  // loud — just not in a way that takes the whole site down first.
  return (settings ?? FALLBACK_ORGANIZATION_LOCALE_SETTINGS).uiLocale;
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
 * 1. exempt paths pass untouched — API routes are never localized;
 * 2. a retired alias redirects to its route's canonical path;
 * 3. any registered path — in **either** locale's spelling — is rewritten onto
 *    the physical English route; the browser keeps the URL it asked for and
 *    Next renders one page;
 * 4. anything unregistered passes through.
 *
 * # Why there is no locale redirect here (D-077 Amendment 3)
 *
 * There was one: a path whose locale disagreed with the organization's got a
 * 308 to the equivalent. It could not be made correct. The only locale this
 * module can see is the build-time registry, and the live one lives in the
 * database, where an administrator changes it from the settings screen. Once
 * those two disagree the proxy rewrote every link the application had just
 * rendered — an English workspace whose every URL bounced back to Serbian.
 *
 * Accepting both spellings costs nothing that was actually being bought. The
 * canonical-URL argument for a 308 is an SEO argument, and workspace routes
 * carry `noindex`; the URL a user sees is the link they clicked. Registered
 * public marketing routes follow the same one-page rewrite rule, while their
 * links choose the active locale's spelling. Canonical/hreflang/sitemap policy
 * stays in the SEO layer rather than relying on the proxy's build-time locale.
 *
 * Step 3 cannot re-enter: Next runs the proxy once per incoming request, and a
 * rewrite to an internal path does not re-dispatch it.
 */
export function decideProxyRoute(
  pathname: string,
  search: string,
  fallbackLocale: UiLocale,
): ProxyRouteDecision {
  const normalized = normalizePathname(pathname);
  if (isExempt(normalized)) return { kind: "pass" };

  const alias = aliasTarget(normalized);
  if (alias !== undefined) {
    return {
      kind: "redirect",
      target: localizedPath(alias, { locale: fallbackLocale }) + search,
    };
  }

  const match = matchPlatformPath(normalized);
  if (match === null) {
    const publicMatch = matchPublicPath(normalized);
    if (publicMatch === null) return { kind: "pass" };
    const internal = internalPublicPath(
      publicMatch.routeId,
      publicMatch.params,
    );
    return internal === normalized
      ? { kind: "pass" }
      : { kind: "rewrite", internal: internal + search };
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
