import { describe, expect, it } from "vitest";

import { sitemapEntries } from "./discoverability";
import {
  CmsContentProvider,
  type PublishedContentOverride,
} from "./cms-provider";
import { staticContentProvider } from "./static-provider";

const publishedService: PublishedContentOverride = {
  contentType: "service",
  management: "system",
  slug: "individualna-psihoterapija",
  locale: "sr-Latn",
  template: "service_detail",
  slotData: {
    hero: {
      mode: "override",
      fields: { title: "CMS naslov" },
    },
    description: {
      mode: "override",
      fields: {
        body: {
          schemaVersion: 1,
          blocks: [
            {
              id: "paragraph-1",
              type: "paragraph",
              spans: [{ text: "CMS opis publike." }],
            },
          ],
        },
      },
    },
  },
  seo: { title: "CMS SEO", description: "" },
  publishedAt: "2026-07-30T10:00:00Z",
};

describe("CmsContentProvider", () => {
  it("overrides only authored fields and preserves static field fallbacks", () => {
    const provider = new CmsContentProvider(staticContentProvider, [
      publishedService,
    ]);
    const fallback = staticContentProvider.getEntity(
      "service",
      "service:individualna-psihoterapija",
    );
    const entity = provider.getEntity(
      "service",
      "service:individualna-psihoterapija",
    );

    expect(entity?.publicationStatus).toBe("published");
    expect(entity?.source.name).toBe("CMS naslov");
    expect(entity?.source.audience).toBe("CMS opis publike.");
    expect(entity?.source.duration).toBe(fallback?.source.duration);
    expect(entity?.seo.title).toBe("CMS SEO");
    expect(entity?.seo.description).toBe(fallback?.seo.description);
  });

  it("keeps a clean static provider when there is no published override", () => {
    const provider = new CmsContentProvider(staticContentProvider, []);
    expect(provider.listAll()).toEqual(staticContentProvider.listAll());
    expect(provider.listPublished()).toEqual([]);
  });

  it("intentionally adds the first published override to the production sitemap", () => {
    const provider = new CmsContentProvider(staticContentProvider, [
      publishedService,
    ]);
    expect(
      sitemapEntries(provider, new URL("https://example.test"), "production"),
    ).toContainEqual({
      url: "https://example.test/usluge/individualna-psihoterapija",
    });
  });
});
