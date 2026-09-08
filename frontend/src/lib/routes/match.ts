import { SUPPORTED_UI_LOCALES, type UiLocale } from "@/i18n/locales";
import {
  ACCESS_DENIED_PATH,
  SIGN_IN_PATH,
  SIGN_UP_PATH,
} from "@/lib/routes/auth-paths";
import {
  PLATFORM_ROUTES,
  type PlatformRouteId,
  platformRouteIds,
  routeDefinition,
} from "@/lib/routes/platform-routes";

/**
 * Reverse matching: external path → the route it identifies.
 *
 * Needed by the proxy rewrite, the canonical 308, the language switcher (which
 * must land on the same screen in the new locale), active navigation, and
 * analytics — which should group `/workspace/services/123` and
 * `/radni-prostor/usluge/123` as one screen, not two.
 */

export interface PlatformPathMatch {
  routeId: PlatformRouteId;
  params: Record<string, string>;
  /** Which locale's path shape matched. Compared against the org's locale. */
  pathLocale: UiLocale;
}

interface CompiledRoute {
  routeId: PlatformRouteId;
  locale: UiLocale;
  segments: readonly string[];
  /** Static segment count — the ordering key. */
  staticCount: number;
}

/**
 * Trailing slashes are stripped before matching. Next's default is
 * `trailingSlash: false`, and an unnormalised `/workspace/settings/` is the
 * classic way a canonical redirect starts pointing at itself forever.
 */
export function normalizePathname(pathname: string): string {
  const withoutTrailing = pathname.replace(/\/+$/, "");
  return withoutTrailing === "" ? "/" : withoutTrailing;
}

function compile(): CompiledRoute[] {
  const compiled: CompiledRoute[] = [];
  for (const routeId of platformRouteIds()) {
    const definition = routeDefinition(routeId);
    for (const locale of SUPPORTED_UI_LOCALES) {
      const path = definition.paths[locale];
      const segments = path.split("/").filter(Boolean);
      compiled.push({
        routeId,
        locale,
        segments,
        staticCount: segments.filter((s) => !s.startsWith("[")).length,
      });
    }
  }
  // Longest first, then most-static first. Without this
  // `/compass/content/new` loses to `/compass/content/[entryId]`, which is the
  // same collision that already exists between `sadrzaj/novo` and
  // `sadrzaj/[entryId]` — a "new entry" page that silently renders an editor
  // for an entry whose id is the literal string "novo".
  return compiled.sort(
    (a, b) =>
      b.segments.length - a.segments.length || b.staticCount - a.staticCount,
  );
}

const COMPILED_ROUTES = compile();

export function matchPlatformPath(pathname: string): PlatformPathMatch | null {
  const segments = normalizePathname(pathname).split("/").filter(Boolean);

  for (const route of COMPILED_ROUTES) {
    if (route.segments.length !== segments.length) continue;

    const params: Record<string, string> = {};
    let matched = true;
    for (const [index, pattern] of route.segments.entries()) {
      const actual = segments[index] ?? "";
      if (pattern.startsWith("[") && pattern.endsWith("]")) {
        if (actual === "") {
          matched = false;
          break;
        }
        params[pattern.slice(1, -1)] = decodeURIComponent(actual);
      } else if (pattern !== actual) {
        matched = false;
        break;
      }
    }
    if (matched) {
      return { routeId: route.routeId, params, pathLocale: route.locale };
    }
  }
  return null;
}

/**
 * Whether a navigation item should render as active.
 *
 * Replaces four byte-identical copies of a `pathname === href ||
 * pathname.startsWith(href + "/")` helper, each with its own hardcoded root
 * special case. That special case is now the declarative `match: "exact"` flag,
 * and comparing route ids instead of strings means a localized path lights the
 * same item as its English twin.
 */
export function isRouteActive(
  pathname: string,
  routeId: PlatformRouteId,
): boolean {
  const match = matchPlatformPath(pathname);
  if (match === null) return false;
  if (match.routeId === routeId) return true;

  const definition = routeDefinition(routeId);
  if (definition.match === "exact") return false;

  // Path prefix, not route-id hierarchy. `workspace.content.list` and
  // `workspace.content.review` are siblings in the id namespace but parent and
  // child in the URL, and the URL is what the original four `isActive` copies
  // compared. Resolving the base in the *matched* locale is what makes an item
  // light identically from `/workspace/compass/...` and `/radni-prostor/kompas/...`.
  const base = definition.paths[match.pathLocale];
  return normalizePathname(pathname).startsWith(`${base}/`);
}

/**
 * External prefixes that require a session, derived from every locale path of
 * every protected route.
 *
 * Derived and never hand-listed: the proxy sees the external path, so a locale
 * added without its prefix is an unauthenticated Control Center, not a
 * cosmetic bug.
 */
export function protectedRoutePrefixes(): string[] {
  const prefixes = new Set<string>();
  for (const [routeId, definition] of Object.entries(PLATFORM_ROUTES)) {
    if (!("protected" in definition)) continue;
    void routeId;
    for (const path of Object.values(definition.paths)) {
      const root = path.split("/")[1];
      if (root) prefixes.add(`/${root}`);
    }
  }
  return [...prefixes].sort();
}

/**
 * Root prefixes of the surfaces that belong to the platform rather than to any
 * tenant: the owners' workspace and the operator console.
 *
 * Derived from the registry rather than written out, for the same reason
 * `protectedRoutePrefixes` is: a literal can name only one locale's spelling,
 * and the proxy sees whichever one the visitor arrived on — `/radni-prostor`
 * and `/workspace` are the same surface and must both be recognised before the
 * locale layer has canonicalised anything.
 *
 * The client area is deliberately absent. `/nalog` belongs to a tenant: a
 * client who signs in on a practitioner's domain stays in that practitioner's
 * space, and never needs to know the platform exists.
 */
export function platformRoutePrefixes(): string[] {
  const prefixes = new Set<string>();
  for (const [routeId, definition] of Object.entries(PLATFORM_ROUTES)) {
    if (
      !routeId.startsWith("workspace.") &&
      !routeId.startsWith("superadmin.")
    ) {
      continue;
    }
    for (const path of Object.values(definition.paths)) {
      const root = path.split("/")[1];
      if (root) prefixes.add(`/${root}`);
    }
  }
  return [...prefixes].sort();
}

/**
 * Root prefixes of the client area — the surface that belongs to a *tenant's*
 * clients rather than to the platform.
 *
 * Separate from `platformRoutePrefixes` because they answer opposite questions:
 * which organization a client is in comes from the domain they arrived at,
 * while which organization an owner is working in comes from their membership.
 */
export function clientRoutePrefixes(): string[] {
  const prefixes = new Set<string>();
  for (const [routeId, definition] of Object.entries(PLATFORM_ROUTES)) {
    if (!routeId.startsWith("account.")) continue;
    for (const path of Object.values(definition.paths)) {
      const root = path.split("/")[1];
      if (root) prefixes.add(`/${root}`);
    }
  }
  return [...prefixes].sort();
}

/**
 * Does `pathname` sit under one of `prefixes`?
 *
 * Whole segments only: `/nalogodavac` is not under `/nalog`.
 */
export function hasRoutePrefix(
  pathname: string,
  prefixes: readonly string[],
): boolean {
  return prefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

/**
 * Paths whose meaning does not depend on which host they arrive on.
 *
 * **Auth pages** are how somebody reaches any surface at all, on the platform
 * host and on every tenant domain alike. **Route Handlers** (`/api/...`) are
 * server endpoints rather than pages: the workspace and the operator console
 * call them from the platform host while a tenant's public site calls them from
 * its own domain, so refusing them by host would break the very surface that is
 * otherwise allowed. What they return is decided by the session and the tenant
 * context inside them — never by which hostname reached them.
 */
const HOST_NEUTRAL_PREFIXES: readonly string[] = [
  SIGN_IN_PATH,
  SIGN_UP_PATH,
  ACCESS_DENIED_PATH,
  "/api",
];

export function isHostNeutralPath(pathname: string): boolean {
  return hasRoutePrefix(pathname, HOST_NEUTRAL_PREFIXES);
}

/**
 * Which host may serve `pathname` (B2).
 *
 * Four answers, and the last one is the whole point:
 *
 * 1. **Host-neutral paths** — auth and Route Handlers — answer anywhere we
 *    serve at all.
 * 2. **Owner surfaces** answer on the platform host.
 * 3. **Client surfaces** answer on a tenant's own domain.
 * 4. **Everything else is some tenant's public site**, so it answers only on a
 *    host that owns a tenant.
 *
 * Rule 4 used to read `host.isTenant || host.isPlatform`, which was true while
 * the platform host was also the founding tenant's domain and became a hole the
 * moment it stopped being: a platform-only host owns no tenant, so there is no
 * correct public page to serve, and the incorrect one — whichever tenant's tree
 * happens to sit in `app/(public)` — is precisely the "Psihointegritet is the
 * platform" identity D-080 retired. The platform host gets its public root from
 * `proxy.ts` instead, explicitly.
 *
 * Stated as a property rather than as a list of slugs: **no tenant, no public
 * site.** Adding a page to the public tree cannot widen what a platform-only
 * host serves, because nothing here enumerates that tree.
 *
 * Refusing rather than redirecting is deliberate. The alternative sends someone
 * to sign in on a domain that will not serve the page afterwards, which reads
 * as a broken login rather than as the wrong address.
 */
export function isSurfaceAllowedOnHost(
  pathname: string,
  host: { isTenant: boolean; isPlatform: boolean },
): boolean {
  if (isHostNeutralPath(pathname)) return host.isTenant || host.isPlatform;
  if (hasRoutePrefix(pathname, platformRoutePrefixes())) return host.isPlatform;
  if (hasRoutePrefix(pathname, clientRoutePrefixes())) return host.isTenant;
  return host.isTenant;
}
