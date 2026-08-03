import { PUBLIC_COMPASS_LOCALE } from "@/lib/compass/public-taxonomy";
import type {
  CompassCanonicalPath,
  CompassRouteKind,
  PublicTaxonomyPageAggregate,
  RoutablePublicTaxonomyTerm,
} from "@/lib/compass/types";

import { compassFallbackRegistry } from "./fallback-registry";

/** Marks an aggregate as coming from checked-in copy, never a published row. */
const FALLBACK_TAXONOMY_VERSION = "kompas-taxonomy-fallback";

export function compassDemoPreviewEnabled(): boolean {
  return (
    process.env.NODE_ENV !== "production" &&
    process.env.NEXT_PUBLIC_COMPASS_DEMO_PREVIEW === "true"
  );
}

/**
 * Projects the checked-in fallback registry into the wire shape the public
 * Kompas pages already render.
 *
 * The published registry holds zero areas and zero topics today, so
 * `/kompas/oblasti` and `/kompas/teme` would render an empty state while
 * `/kompas` shows the demo areas — an inconsistency a reviewer would read as a
 * bug. This bridge keeps every surface telling the same story until Anja's
 * table is entered and approved.
 *
 * These rows never travel back to the API and are never validated against the
 * response contract: `termId` carries the stable id rather than a fabricated
 * UUID, precisely so a fallback row can never be mistaken for a persisted one.
 */
function canonicalPath(
  kind: CompassRouteKind,
  slug: string,
): CompassCanonicalPath {
  return kind === "oblast" ? `/kompas/oblast/${slug}` : `/kompas/tema/${slug}`;
}

export function fallbackTermsForRouteKind(
  kind: CompassRouteKind,
): readonly RoutablePublicTaxonomyTerm[] {
  const registry = compassFallbackRegistry;

  if (kind === "oblast") {
    return registry.areas.map((area, index) => ({
      termId: area.stableId,
      axis: "topic_group",
      stableId: area.stableId,
      canonicalPath: canonicalPath("oblast", area.slug),
      publicLabel: area.label,
      shortDescription: area.description,
      parentStableId: null,
      journeyIntent: null,
      sortOrder: index,
      iconKey: null,
      assetId: null,
      searchTerms: [],
      relatedStableIds: [],
    }));
  }

  return registry.areas.flatMap((area) =>
    area.topics.map((topic, index) => ({
      termId: topic.stableId,
      axis: "topic" as const,
      stableId: topic.stableId,
      canonicalPath: canonicalPath("tema", topic.slug),
      publicLabel: topic.label,
      shortDescription: topic.description,
      parentStableId: area.stableId,
      journeyIntent: null,
      sortOrder: index,
      iconKey: null,
      assetId: null,
      searchTerms: [],
      relatedStableIds: [],
    })),
  );
}

/** Live terms when the registry has any; otherwise the fallback projection. */
export function withFallbackTerms(
  live: readonly RoutablePublicTaxonomyTerm[],
  kind: CompassRouteKind,
): readonly RoutablePublicTaxonomyTerm[] {
  return live.length > 0 || !compassDemoPreviewEnabled()
    ? live
    : fallbackTermsForRouteKind(kind);
}

/**
 * Builds the canonical-page aggregate for a fallback slug.
 *
 * Returns `null` when the slug is not in the fallback registry, so the caller
 * still renders a real 404 rather than inventing a page for any URL.
 * `contentCards` is empty by construction: no public endpoint returns content
 * filtered by taxonomy term yet, and the page has a designed empty state for it.
 */
export function fallbackTaxonomyPage(
  kind: CompassRouteKind,
  slug: string,
): PublicTaxonomyPageAggregate | null {
  if (!compassDemoPreviewEnabled()) return null;
  const registry = compassFallbackRegistry;
  const areas = fallbackTermsForRouteKind("oblast");
  const topics = fallbackTermsForRouteKind("tema");

  if (kind === "oblast") {
    const area = registry.areas.find((item) => item.slug === slug);
    if (!area) return null;
    const term = areas.find((item) => item.stableId === area.stableId);
    if (!term) return null;
    return {
      taxonomyVersion: FALLBACK_TAXONOMY_VERSION,
      locale: PUBLIC_COMPASS_LOCALE,
      term,
      parent: null,
      children: topics.filter((item) => item.parentStableId === area.stableId),
      relatedTerms: [],
      contentCards: [],
    };
  }

  const owner = registry.areas.find((item) =>
    item.topics.some((topic) => topic.slug === slug),
  );
  const topic = owner?.topics.find((item) => item.slug === slug);
  if (!owner || !topic) return null;
  const term = topics.find((item) => item.stableId === topic.stableId);
  const parent = areas.find((item) => item.stableId === owner.stableId);
  if (!term || !parent) return null;

  return {
    taxonomyVersion: FALLBACK_TAXONOMY_VERSION,
    locale: PUBLIC_COMPASS_LOCALE,
    term,
    parent,
    children: [],
    // Sibling topics, so the „Druge teme u oblasti" strip has something real.
    relatedTerms: topics.filter(
      (item) =>
        item.parentStableId === owner.stableId &&
        item.stableId !== topic.stableId,
    ),
    contentCards: [],
  };
}
