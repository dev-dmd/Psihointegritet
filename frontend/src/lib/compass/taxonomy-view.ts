import { findSystemContentDefinition } from "@/lib/content-governance/system-content-catalog";

import { parseCompassCanonicalPath } from "./route-location";
import type {
  CompassCanonicalPath,
  CompassRouteKind,
  PublicCompassContentCard,
  PublicTaxonomyCollection,
  PublicTaxonomyPageAggregate,
  PublicTaxonomyTerm,
  RoutablePublicTaxonomyTerm,
} from "./types";

export interface PublicCompassContentCardView {
  itemKey: string;
  href: string;
  title: string;
  description: string;
  contentFormat: PublicCompassContentCard["contentFormat"];
  accessLevel: "public";
}

export function routeKindForTerm(
  term: Pick<PublicTaxonomyTerm, "axis">,
): CompassRouteKind | null {
  if (term.axis === "topic_group") return "oblast";
  if (term.axis === "topic") return "tema";
  return null;
}

export function routablePublicTerm(
  term: PublicTaxonomyTerm,
  expectedKind = routeKindForTerm(term),
): RoutablePublicTaxonomyTerm | null {
  if (!expectedKind || routeKindForTerm(term) !== expectedKind) return null;
  const canonicalPath = parseCompassCanonicalPath(
    term.canonicalPath,
    expectedKind,
  );
  return canonicalPath ? { ...term, canonicalPath } : null;
}

export function publicTermsForRouteKind(
  collection: PublicTaxonomyCollection,
  routeKind: CompassRouteKind,
): RoutablePublicTaxonomyTerm[] {
  return collection.terms
    .map((term) => routablePublicTerm(term, routeKind))
    .filter((term): term is RoutablePublicTaxonomyTerm => term !== null)
    .sort(
      (left, right) =>
        left.sortOrder - right.sortOrder ||
        left.publicLabel.localeCompare(right.publicLabel, collection.locale) ||
        left.stableId.localeCompare(right.stableId),
    );
}

/**
 * Returns the first semantic wire-contract violation. Schema validation is
 * handled separately; this checks route/axis coherence before any path is
 * rendered or exposed as canonical metadata.
 */
export function publicTaxonomyPageContractIssue(
  aggregate: PublicTaxonomyPageAggregate,
  routeKind: CompassRouteKind,
  currentPath: string,
): string | null {
  const term = routablePublicTerm(aggregate.term, routeKind);
  if (!term || term.canonicalPath !== currentPath) {
    return "Resolved term does not match the requested canonical route.";
  }

  if (aggregate.parent && !routablePublicTerm(aggregate.parent, "oblast")) {
    return "Aggregate parent is not a canonical public area.";
  }

  if (
    aggregate.children.some(
      (child) => routablePublicTerm(child, "tema") === null,
    )
  ) {
    return "Aggregate contains a child outside canonical public topics.";
  }

  if (
    aggregate.relatedTerms.some(
      (related) => routablePublicTerm(related, "tema") === null,
    )
  ) {
    return "Aggregate contains a related term outside canonical public topics.";
  }

  if (aggregate.contentCards.some((card) => card.accessLevel !== "public")) {
    return "Anonymous aggregate contains a non-public content card.";
  }

  return null;
}

/** No backend-provided or authored free-form route crosses this boundary. */
export function publicCompassContentCardView(
  card: PublicCompassContentCard,
): PublicCompassContentCardView | null {
  const definition = findSystemContentDefinition(card.contentType, card.slug);
  if (!definition) return null;

  return {
    itemKey: card.itemKey,
    href: definition.publicRoute,
    title: card.seo.title.trim() || definition.title,
    description: card.seo.description.trim(),
    contentFormat: card.contentFormat,
    accessLevel: card.accessLevel,
  };
}

export function termCanonicalPath(
  term: PublicTaxonomyTerm,
): CompassCanonicalPath | null {
  return routablePublicTerm(term)?.canonicalPath ?? null;
}
