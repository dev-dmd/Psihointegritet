import "server-only";

import type { Route } from "next";
import { notFound, permanentRedirect } from "next/navigation";

import { resolvePublicTaxonomyPage } from "./public-taxonomy";
import type { CompassRouteKind, PublicTaxonomyPageAggregate } from "./types";

/**
 * Next navigation sentinels intentionally live outside the adapter and any
 * adapter try/catch. Network/server failures therefore keep propagating as
 * real errors instead of being converted into a public 404.
 */
export async function loadPublicTaxonomyPage(
  routeKind: CompassRouteKind,
  slug: string,
): Promise<PublicTaxonomyPageAggregate> {
  const resolution = await resolvePublicTaxonomyPage(routeKind, slug);
  switch (resolution.kind) {
    case "term":
      return resolution.data;
    case "alias":
      permanentRedirect(resolution.location as Route);
    case "missing":
      notFound();
  }
}
