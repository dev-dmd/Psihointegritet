import { staticContentProvider } from "./static-provider";
import type { ContentType } from "./types";

/** One tag for the public CMS read-model consumed by pages, metadata and sitemap. */
export const PUBLIC_CONTENT_CACHE_TAG = "content:published:sr-Latn";

const COLLECTION_ROUTES: Partial<Record<ContentType, string>> = {
  service: "/usluge",
  article: "/znanje",
  therapist: "/tim",
  program: "/radionice",
  company_plan: "/rad-sa-kompanijama",
  package_offer: "/cene",
};

const ROUTE_PREFIX: Record<ContentType, string> = {
  static_page: "",
  article: "/znanje",
  service: "/usluge",
  therapist: "/tim",
  program: "/radionice",
  company_plan: "/rad-sa-kompanijama",
  package_offer: "/cene",
};

export function routeForContentIdentity(
  contentType: ContentType,
  slug: string,
): string {
  const registered = staticContentProvider
    .listAll()
    .find(
      (entity) => entity.type === contentType && entity.canonicalSlug === slug,
    );
  if (registered) return registered.route;
  return `${ROUTE_PREFIX[contentType]}/${slug}`.replace(/^\/\//, "/");
}

/**
 * Paths whose rendered output can change when one revision is published or
 * archived. The tag invalidates the shared read-model; these paths invalidate
 * the corresponding page/metadata and aggregate listing.
 */
export function pathsForContentChange(
  contentType: ContentType,
  slug: string,
): string[] {
  const collectionRoute = COLLECTION_ROUTES[contentType];
  return [
    ...new Set([
      routeForContentIdentity(contentType, slug),
      ...(collectionRoute ? [collectionRoute] : []),
      "/sitemap.xml",
    ]),
  ];
}
