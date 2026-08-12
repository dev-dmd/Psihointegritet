import { describe, expect, it } from "vitest";

import {
  compassBreadcrumbJsonLd,
  compassPageDiscoverability,
  compassSitemapEntries,
  createCompassMetadata,
  mergeSitemapEntries,
} from "./discoverability";
import type {
  PublicTaxonomyCollection,
  PublicTaxonomyPageAggregate,
} from "./types";

const aggregate: PublicTaxonomyPageAggregate = {
  taxonomyVersion: "kompas-taxonomy-v1",
  locale: "sr-Latn",
  term: {
    termId: "00000000-0000-4000-8000-000000000002",
    axis: "topic",
    stableId: "topic-burnout",
    canonicalPath: "/kompas/tema/sagorevanje",
    publicLabel: "Sagorevanje",
    shortDescription: "Kako razumeti sagorevanje.",
    parentStableId: "area-stress",
    sortOrder: 1,
    searchTerms: [],
    relatedStableIds: [],
  },
  parent: {
    termId: "00000000-0000-4000-8000-000000000001",
    axis: "topic_group",
    stableId: "area-stress",
    canonicalPath: "/kompas/oblast/stres",
    publicLabel: "Stres",
    shortDescription: "Opis oblasti.",
    sortOrder: 1,
    searchTerms: [],
    relatedStableIds: [],
  },
  children: [],
  relatedTerms: [],
  contentCards: [],
};

describe("Compass discoverability projection", () => {
  it("projects a canonical topic and its area breadcrumb", () => {
    const record = compassPageDiscoverability(aggregate, "tema");
    expect(record.route).toBe("/kompas/tema/sagorevanje");
    expect(record.breadcrumbs.map((item) => item.label)).toEqual([
      "Početna",
      "Oblasti",
      "Stres",
      "Sagorevanje",
    ]);
  });

  it("indexes published public taxonomy only in production", () => {
    const record = compassPageDiscoverability(aggregate, "tema");
    expect(createCompassMetadata(record, "development").robots).toEqual({
      index: false,
      follow: false,
    });
    expect(createCompassMetadata(record, "production")).toMatchObject({
      alternates: { canonical: "/kompas/tema/sagorevanje" },
      robots: { index: true, follow: true },
    });
  });

  it("emits BreadcrumbList and no other JSON-LD kind", () => {
    const data = compassBreadcrumbJsonLd(
      compassPageDiscoverability(aggregate, "tema"),
      new URL("https://example.test"),
    );
    expect(data).toHaveLength(1);
    expect(data[0]).toMatchObject({
      "@type": "BreadcrumbList",
      itemListElement: expect.arrayContaining([
        expect.objectContaining({
          name: "Sagorevanje",
          item: "https://example.test/kompas/tema/sagorevanje",
        }),
      ]),
    });
  });

  it("adds each canonical public taxonomy URL to production sitemap once", () => {
    const collection: PublicTaxonomyCollection = {
      taxonomyVersion: "kompas-taxonomy-v1",
      locale: "sr-Latn",
      terms: [aggregate.parent!, aggregate.term, { ...aggregate.term }],
    };
    const entries = compassSitemapEntries(
      collection,
      new URL("https://example.test"),
      "production",
    );
    expect(entries).toEqual([
      { url: "https://example.test/kompas/oblast/stres" },
      { url: "https://example.test/kompas/tema/sagorevanje" },
    ]);
    expect(entries.some((entry) => entry.url.endsWith("/kompas"))).toBe(false);
    expect(compassSitemapEntries(collection, undefined, "staging")).toEqual([]);
  });

  it("deduplicates taxonomy canonicals already present in another sitemap group", () => {
    expect(
      mergeSitemapEntries(
        [{ url: "https://example.test/kompas/tema/sagorevanje" }],
        [
          { url: "https://example.test/kompas/tema/sagorevanje" },
          { url: "https://example.test/kompas/oblast/stres" },
        ],
      ),
    ).toEqual([
      { url: "https://example.test/kompas/tema/sagorevanje" },
      { url: "https://example.test/kompas/oblast/stres" },
    ]);
  });
});
