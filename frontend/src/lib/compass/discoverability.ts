import type { Metadata, MetadataRoute } from "next";

import {
  absolutePublicUrl,
  publicOrigin,
  type JsonLdNode,
} from "@/lib/content-governance/discoverability";
import {
  deploymentEnvironment,
  isProductionEnvironment,
  type DeploymentEnvironment,
} from "@/lib/content-governance/runtime";

import { publicTermsForRouteKind, routablePublicTerm } from "./taxonomy-view";
import type {
  CompassRouteKind,
  PublicTaxonomyCollection,
  PublicTaxonomyPageAggregate,
} from "./types";

export interface CompassBreadcrumb {
  label: string;
  path: string;
}

export interface CompassDiscoverabilityRecord {
  route: string;
  title: string;
  description: string;
  breadcrumbs: readonly CompassBreadcrumb[];
}

const listRecords: Record<CompassRouteKind, CompassDiscoverabilityRecord> = {
  oblast: {
    route: "/kompas/oblasti",
    title: "Kompas oblasti",
    description:
      "Pregled objavljenih oblasti koje pomažu da istražite teme i dostupne sadržaje u Kompasu.",
    breadcrumbs: [
      { label: "Početna", path: "/" },
      { label: "Oblasti", path: "/kompas/oblasti" },
    ],
  },
  tema: {
    route: "/kompas/teme",
    title: "Kompas teme",
    description:
      "Pregled i pretraga objavljenih tema i povezanih sadržaja u Kompasu.",
    breadcrumbs: [
      { label: "Početna", path: "/" },
      { label: "Teme", path: "/kompas/teme" },
    ],
  },
};

export function compassListDiscoverability(
  routeKind: CompassRouteKind,
): CompassDiscoverabilityRecord {
  return listRecords[routeKind];
}

export function compassPageDiscoverability(
  aggregate: PublicTaxonomyPageAggregate,
  routeKind: CompassRouteKind,
): CompassDiscoverabilityRecord {
  const term = routablePublicTerm(aggregate.term, routeKind);
  if (!term) throw new Error("Compass term has no valid canonical path.");

  const parent = aggregate.parent
    ? routablePublicTerm(aggregate.parent, "oblast")
    : null;
  const breadcrumbs: CompassBreadcrumb[] = [{ label: "Početna", path: "/" }];

  if (routeKind === "oblast") {
    breadcrumbs.push({ label: "Oblasti", path: "/kompas/oblasti" });
  } else if (parent) {
    breadcrumbs.push(
      { label: "Oblasti", path: "/kompas/oblasti" },
      { label: parent.publicLabel, path: parent.canonicalPath },
    );
  } else {
    breadcrumbs.push({ label: "Teme", path: "/kompas/teme" });
  }

  breadcrumbs.push({ label: term.publicLabel, path: term.canonicalPath });
  return {
    route: term.canonicalPath,
    title: term.publicLabel,
    description: term.shortDescription,
    breadcrumbs,
  };
}

export function createCompassMetadata(
  record: CompassDiscoverabilityRecord,
  environment: DeploymentEnvironment = deploymentEnvironment(),
): Metadata {
  const index = isProductionEnvironment(environment);
  return {
    title: record.title,
    description: record.description,
    alternates: { canonical: record.route },
    robots: { index, follow: index },
    openGraph: {
      title: record.title,
      description: record.description,
      url: record.route,
      type: "website",
      images: [{ url: "/opengraph-image", width: 1200, height: 630 }],
    },
  };
}

/** Kompas emits BreadcrumbList only; it does not invent a CollectionPage. */
export function compassBreadcrumbJsonLd(
  record: CompassDiscoverabilityRecord,
  origin = publicOrigin(),
): JsonLdNode[] {
  if (record.breadcrumbs.length === 0) return [];
  return [
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: record.breadcrumbs.map((item, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: item.label,
        item: absolutePublicUrl(item.path, origin),
      })),
    },
  ];
}

export function compassSitemapEntries(
  collection: PublicTaxonomyCollection,
  origin = publicOrigin(),
  environment: DeploymentEnvironment = deploymentEnvironment(),
): MetadataRoute.Sitemap {
  if (!isProductionEnvironment(environment)) return [];

  const paths = [
    ...publicTermsForRouteKind(collection, "oblast"),
    ...publicTermsForRouteKind(collection, "tema"),
  ].map((term) => term.canonicalPath);

  return [...new Set(paths)].map((path) => ({
    url: absolutePublicUrl(path, origin),
  }));
}

export function mergeSitemapEntries(
  ...groups: readonly MetadataRoute.Sitemap[]
): MetadataRoute.Sitemap {
  const byUrl = new Map<string, MetadataRoute.Sitemap[number]>();
  for (const group of groups) {
    for (const entry of group) {
      if (!byUrl.has(entry.url)) byUrl.set(entry.url, entry);
    }
  }
  return [...byUrl.values()];
}
