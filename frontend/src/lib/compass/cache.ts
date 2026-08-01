import type { CompassRouteKind } from "./types";

/** Shared by taxonomy collections, canonical aggregates and card results. */
export const PUBLIC_COMPASS_CACHE_TAG = "compass:public:sr-Latn";

export const PUBLIC_COMPASS_REVALIDATE_SECONDS = 300;

export function publicCompassPageCacheTag(
  routeKind: CompassRouteKind,
  slug: string,
): string {
  return `compass:taxonomy:page:sr-Latn:${routeKind}:${slug}`;
}

export function publicCompassFetchCache(extraTags: readonly string[] = []): {
  revalidate: number;
  tags: string[];
} {
  return {
    revalidate: PUBLIC_COMPASS_REVALIDATE_SECONDS,
    tags: [...new Set([PUBLIC_COMPASS_CACHE_TAG, ...extraTags])],
  };
}
