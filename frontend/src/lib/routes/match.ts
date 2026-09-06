import { SUPPORTED_UI_LOCALES, type UiLocale } from "@/i18n/locales";
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
