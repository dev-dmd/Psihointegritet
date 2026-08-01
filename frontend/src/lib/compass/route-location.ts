import type { CompassCanonicalPath, CompassRouteKind } from "./types";

const slugPattern = "[a-z0-9]+(?:-[a-z0-9]+)*";

const canonicalPathPatterns: Record<CompassRouteKind, RegExp> = {
  oblast: new RegExp(`^/kompas/oblast/${slugPattern}$`),
  tema: new RegExp(`^/kompas/tema/${slugPattern}$`),
};

export function isCompassSlug(value: string): boolean {
  return new RegExp(`^${slugPattern}$`).test(value);
}

export function compassCanonicalPath(
  routeKind: CompassRouteKind,
  slug: string,
): CompassCanonicalPath {
  return `/kompas/${routeKind}/${slug}`;
}

/**
 * Accept only a literal, same-kind internal canonical path. Absolute and
 * protocol-relative URLs, encoded lookalikes, query/hash suffixes and extra
 * path segments all fail the anchored allowlist expression.
 */
export function parseCompassCanonicalPath(
  value: string | null,
  routeKind: CompassRouteKind,
): CompassCanonicalPath | null {
  if (!value || !canonicalPathPatterns[routeKind].test(value)) return null;
  return value as CompassCanonicalPath;
}

export function validateCompassRedirectLocation(
  location: string | null,
  routeKind: CompassRouteKind,
  currentPath: string,
): CompassCanonicalPath | null {
  const canonical = parseCompassCanonicalPath(location, routeKind);
  return canonical && canonical !== currentPath ? canonical : null;
}
