import type { Metadata, MetadataRoute } from "next";

import { faqItems } from "@/content/homepage";
import { siteSettings } from "@/content/site-settings";

import { isSitemapEligible } from "./validation";
import { isProductionEnvironment, type DeploymentEnvironment } from "./runtime";
import { isKnownPublicRoute, staticContentProvider } from "./static-provider";
import type { ContentEntity, ContentProvider } from "./types";

export type JsonLdNode = Record<string, unknown>;

const defaultOrigin = "http://localhost:3007";

export function publicOrigin(origin = process.env.NEXT_PUBLIC_APP_URL): URL {
  return new URL(origin ?? defaultOrigin);
}

export function absolutePublicUrl(
  path: string,
  origin = publicOrigin(),
): string {
  return new URL(path, origin).toString();
}

export function pageMayBeIndexed(
  entity: ContentEntity,
  environment: DeploymentEnvironment = "development",
): boolean {
  return (
    isProductionEnvironment(environment) &&
    entity.publicationStatus === "published" &&
    entity.indexingPolicy === "index"
  );
}

export function createPageMetadata(
  entity: ContentEntity,
  environment = deploymentEnvironmentFromRuntime(),
): Metadata {
  const index = pageMayBeIndexed(entity, environment);
  const ogImage = entity.seo.ogImageAssetId ?? "/opengraph-image";

  return {
    title: entity.seo.title,
    description: entity.seo.description,
    alternates: { canonical: entity.route },
    robots: { index, follow: index },
    openGraph: {
      title: entity.seo.title,
      description: entity.seo.description,
      url: entity.route,
      type: "website",
      images: [{ url: ogImage, width: 1200, height: 630 }],
    },
  };
}

function deploymentEnvironmentFromRuntime(): DeploymentEnvironment {
  return process.env.DEPLOYMENT_ENV === "production"
    ? "production"
    : process.env.DEPLOYMENT_ENV === "staging"
      ? "staging"
      : process.env.DEPLOYMENT_ENV === "preview"
        ? "preview"
        : "development";
}

export function metadataForRoute(route: string): Metadata {
  const entity = staticContentProvider.getPageByRoute(route);
  if (!entity) {
    throw new Error(`No governed content record exists for ${route}.`);
  }
  return createPageMetadata(entity);
}

export function metadataForEntity(entity: ContentEntity): Metadata {
  return createPageMetadata(entity);
}

export function sitemapEntries(
  provider: ContentProvider = staticContentProvider,
  origin = publicOrigin(),
  environment = deploymentEnvironmentFromRuntime(),
): MetadataRoute.Sitemap {
  if (!isProductionEnvironment(environment)) return [];

  const context = { provider, isKnownPublicRoute };
  return provider
    .listPublished()
    .filter((entity) => isSitemapEligible(entity, context))
    .map((entity) => ({ url: absolutePublicUrl(entity.route, origin) }));
}

export function robotsPolicy(
  origin = publicOrigin(),
  environment = deploymentEnvironmentFromRuntime(),
): MetadataRoute.Robots {
  if (!isProductionEnvironment(environment)) {
    return {
      rules: { userAgent: "*", disallow: "/" },
    };
  }

  return {
    rules: { userAgent: "*", allow: "/" },
    sitemap: absolutePublicUrl("/sitemap.xml", origin),
  };
}

function breadcrumbJsonLd(
  entity: ContentEntity,
  origin: URL,
): JsonLdNode | null {
  if (!entity.breadcrumbs?.length) return null;

  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: entity.breadcrumbs.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.label,
      item: absolutePublicUrl(item.path, origin),
    })),
  };
}

export function jsonLdForEntity(
  entity: ContentEntity,
  origin = publicOrigin(),
): JsonLdNode[] {
  if (entity.publicationStatus !== "published") return [];

  const records: JsonLdNode[] = [];
  if (entity.jsonLdKinds.includes("breadcrumb")) {
    const breadcrumb = breadcrumbJsonLd(entity, origin);
    if (breadcrumb) records.push(breadcrumb);
  }

  if (entity.type === "static_page" && entity.route === "/") {
    if (entity.jsonLdKinds.includes("organization")) {
      records.push({
        "@context": "https://schema.org",
        "@type": "Organization",
        name: siteSettings.name,
        url: absolutePublicUrl("/", origin),
        description: siteSettings.description,
      });
    }
    if (entity.jsonLdKinds.includes("website")) {
      records.push({
        "@context": "https://schema.org",
        "@type": "WebSite",
        name: siteSettings.name,
        url: absolutePublicUrl("/", origin),
      });
    }
    if (entity.jsonLdKinds.includes("faq")) {
      records.push({
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: faqItems.map((item) => ({
          "@type": "Question",
          name: item.question,
          acceptedAnswer: { "@type": "Answer", text: item.answer },
        })),
      });
    }
  }

  if (entity.type === "service" && entity.jsonLdKinds.includes("service")) {
    records.push({
      "@context": "https://schema.org",
      "@type": "Service",
      name: entity.source.name,
      description: entity.source.description,
      url: absolutePublicUrl(entity.route, origin),
      areaServed: [...siteSettings.locations, "online"],
    });
  }

  if (entity.type === "therapist" && entity.jsonLdKinds.includes("person")) {
    records.push({
      "@context": "https://schema.org",
      "@type": "Person",
      name: entity.source.name,
      jobTitle: entity.source.title,
      url: absolutePublicUrl(entity.route, origin),
      image: absolutePublicUrl(entity.source.image, origin),
    });
  }

  return records;
}

export function jsonLdForRoute(route: string): JsonLdNode[] {
  const entity = staticContentProvider.getPageByRoute(route);
  return entity ? jsonLdForEntity(entity) : [];
}
