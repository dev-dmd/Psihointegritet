import "server-only";

import { serverEnv } from "@/lib/validation/env";

import { publicCompassFetchCache, publicCompassPageCacheTag } from "./cache";
import {
  parsePublicTaxonomyCollection,
  parsePublicTaxonomyPageAggregate,
  parsePublicTaxonomyTerm,
} from "./contract";
import {
  compassCanonicalPath,
  isCompassSlug,
  parseCompassCanonicalPath,
  validateCompassRedirectLocation,
} from "./route-location";
import { publicTaxonomyPageContractIssue } from "./taxonomy-view";
import type {
  CompassRouteKind,
  PublicTaxonomyCollection,
  PublicTaxonomyPageAggregate,
  PublicTaxonomyResolution,
  PublicTaxonomyTerm,
} from "./types";
import { PublicCompassApiError } from "./types";

export const PUBLIC_COMPASS_LOCALE = "sr-Latn";

type JsonParser<T> = (value: unknown) => T;

function publicApiUrl(path: string): URL {
  const url = new URL(path, serverEnv.NEXT_PUBLIC_API_URL);
  url.searchParams.set("locale", PUBLIC_COMPASS_LOCALE);
  return url;
}

async function compassFetch(
  url: URL,
  options: {
    redirect: "error" | "manual";
    tags?: readonly string[];
  },
): Promise<Response> {
  try {
    return await fetch(url, {
      redirect: options.redirect,
      next: publicCompassFetchCache(options.tags),
    });
  } catch (cause) {
    throw new PublicCompassApiError(
      "Javni Kompas servis trenutno nije dostupan.",
      { code: "network", cause },
    );
  }
}

async function parseJsonResponse<T>(
  response: Response,
  parser: JsonParser<T>,
): Promise<T> {
  try {
    return parser(await response.json());
  } catch (cause) {
    throw new PublicCompassApiError(
      "Javni Kompas servis vratio je neispravan odgovor.",
      { code: "invalid_response", status: response.status, cause },
    );
  }
}

function throwForUnexpectedStatus(response: Response): never {
  throw new PublicCompassApiError(
    `Javni Kompas servis vratio je neočekivani status ${response.status}.`,
    {
      code: response.status >= 500 ? "server" : "unexpected_response",
      status: response.status,
    },
  );
}

async function resolveResponse<T>(
  response: Response,
  routeKind: CompassRouteKind,
  currentPath: string,
  parser: JsonParser<T>,
): Promise<PublicTaxonomyResolution<T>> {
  if (response.status === 404) {
    return { kind: "missing", reason: "not_found" };
  }

  if (response.status === 308) {
    const location = validateCompassRedirectLocation(
      response.headers.get("location"),
      routeKind,
      currentPath,
    );
    return location
      ? { kind: "alias", location }
      : { kind: "missing", reason: "invalid_redirect" };
  }

  if (response.status !== 200) throwForUnexpectedStatus(response);
  return { kind: "term", data: await parseJsonResponse(response, parser) };
}

function taxonomyRoutePath(
  suffix: "routes" | "pages",
  routeKind: CompassRouteKind,
  slug: string,
): string {
  return `/api/v1/public/compass/taxonomy/${suffix}/${routeKind}/${encodeURIComponent(slug)}`;
}

export async function getPublicTaxonomy(): Promise<PublicTaxonomyCollection> {
  const response = await compassFetch(
    publicApiUrl("/api/v1/public/compass/taxonomy"),
    { redirect: "error" },
  );
  if (response.status !== 200) throwForUnexpectedStatus(response);
  return parseJsonResponse(response, parsePublicTaxonomyCollection);
}

export async function resolvePublicTaxonomyTerm(
  routeKind: CompassRouteKind,
  slug: string,
): Promise<PublicTaxonomyResolution<PublicTaxonomyTerm>> {
  if (!isCompassSlug(slug)) {
    return { kind: "missing", reason: "invalid_slug" };
  }

  const currentPath = compassCanonicalPath(routeKind, slug);
  const response = await compassFetch(
    publicApiUrl(taxonomyRoutePath("routes", routeKind, slug)),
    {
      redirect: "manual",
      tags: [publicCompassPageCacheTag(routeKind, slug)],
    },
  );
  const resolution = await resolveResponse(
    response,
    routeKind,
    currentPath,
    parsePublicTaxonomyTerm,
  );
  if (resolution.kind !== "term") return resolution;

  const expectedAxis = routeKind === "oblast" ? "topic_group" : "topic";
  const canonicalPath = parseCompassCanonicalPath(
    resolution.data.canonicalPath,
    routeKind,
  );
  if (resolution.data.axis !== expectedAxis || canonicalPath !== currentPath) {
    throw new PublicCompassApiError(
      "Javni Kompas resolver vratio je termin za pogrešnu kanonsku putanju.",
      { code: "invalid_response", status: response.status },
    );
  }
  return resolution;
}

export async function resolvePublicTaxonomyPage(
  routeKind: CompassRouteKind,
  slug: string,
): Promise<PublicTaxonomyResolution<PublicTaxonomyPageAggregate>> {
  if (!isCompassSlug(slug)) {
    return { kind: "missing", reason: "invalid_slug" };
  }

  const currentPath = compassCanonicalPath(routeKind, slug);
  const response = await compassFetch(
    publicApiUrl(taxonomyRoutePath("pages", routeKind, slug)),
    {
      redirect: "manual",
      tags: [publicCompassPageCacheTag(routeKind, slug)],
    },
  );
  const resolution = await resolveResponse(
    response,
    routeKind,
    currentPath,
    parsePublicTaxonomyPageAggregate,
  );
  if (resolution.kind !== "term") return resolution;

  const issue = publicTaxonomyPageContractIssue(
    resolution.data,
    routeKind,
    currentPath,
  );
  if (issue) {
    throw new PublicCompassApiError(issue, {
      code: "invalid_response",
      status: response.status,
    });
  }
  return resolution;
}
