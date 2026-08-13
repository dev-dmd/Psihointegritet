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

  it("reads old published primitives and new wrappers without rewriting JSON", () => {
    const provider = new CmsContentProvider(staticContentProvider, [
      {
        ...publishedService,
        slotData: {
          hero: {
            mode: "override",
            fields: {
              title: { mode: "custom", value: "Wrapper naslov" },
              lead: "",
            },
          },
        },
      },
    ]);
    const fallback = staticContentProvider.getEntity(
      "service",
      "service:individualna-psihoterapija",
    );
    const entity = provider.getEntity(
      "service",
      "service:individualna-psihoterapija",
    );

    expect(entity?.source.name).toBe("Wrapper naslov");
    expect(entity?.source.description).toBe(fallback?.source.description);
  });

  it("distinguishes an optional hidden field from inherit", () => {
    const provider = new CmsContentProvider(staticContentProvider, [
      {
        ...publishedService,
        slotData: {
          hero: {
            mode: "override",
            fields: {
              title: { mode: "hidden" },
              lead: { mode: "hidden" },
            },
          },
        },
      },
    ]);
    const fallback = staticContentProvider.getEntity(
      "service",
      "service:individualna-psihoterapija",
    );
    const entity = provider.getEntity(
      "service",
      "service:individualna-psihoterapija",
    );

    // Bad historical data cannot hide the required H1; the public resolver
    // fails safe even though the backend rejects publishing this shape.
    expect(entity?.source.name).toBe(fallback?.source.name);
    expect(entity?.source.description).toBe("");
  });

  it("removes an inherited optional program field when explicitly hidden", () => {
    const fallback = staticContentProvider
      .listAll()
      .find((item) => item.type === "program" && Boolean(item.source.details));
    expect(fallback?.type).toBe("program");
    if (!fallback || fallback.type !== "program") return;

    const provider = new CmsContentProvider(staticContentProvider, [
      {
        contentType: "program",
        management: "system",
        slug: fallback.canonicalSlug,
        locale: "sr-Latn",
        template: "program_detail",
        slotData: {
          facts: {
            mode: "override",
            fields: { details: { mode: "hidden" } },
          },
        },
        seo: fallback.seo,
        publishedAt: "2026-08-14T00:00:00Z",
      },
    ]);
    const entity = provider.getEntity("program", fallback.id);

    expect(entity?.source.details).toBeUndefined();
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
