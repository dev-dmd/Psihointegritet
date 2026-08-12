import "server-only";

import type { Route } from "next";
import { notFound, permanentRedirect } from "next/navigation";

import { resolvePublicTaxonomyPage } from "./public-taxonomy";
import type { CompassRouteKind, PublicTaxonomyPageAggregate } from "./types";

/**
 * Next navigation sentinels intentionally live outside the adapter and any
 * adapter try/catch. Network/server failures therefore keep propagating as
 * real errors instead of being converted into a public 404.
 *
 * `fallback` is injected rather than imported so this module keeps its
 * `lib → features` dependency direction. It is consulted only when the backend
 * genuinely has no such term, never to mask an outage: a network or 5xx failure
 * throws before reaching it.
 */
export async function loadPublicTaxonomyPage(
  routeKind: CompassRouteKind,
  slug: string,
  fallback?: () => PublicTaxonomyPageAggregate | null,
): Promise<PublicTaxonomyPageAggregate> {
  const resolution = await resolvePublicTaxonomyPage(routeKind, slug);
  switch (resolution.kind) {
    case "term":
      return resolution.data;
    case "alias":
      permanentRedirect(resolution.location as Route);
    case "missing": {
      const fallbackAggregate = fallback?.() ?? null;
      if (fallbackAggregate) return fallbackAggregate;
      notFound();
    }
  }
}
