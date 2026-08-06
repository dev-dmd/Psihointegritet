import { describe, expect, it } from "vitest";

import type { ApiContentRevision } from "./content-api";
import { kompasArticleRows } from "./kompas-content-list-view";
import type { TaxonomyTerm } from "./taxonomy-api";

function term(overrides: Partial<TaxonomyTerm> & { termId: string }) {
  return {
    axis: "topic",
    canonicalPath: null,
    compassEnabled: true,
    createdAt: "2026-08-01T10:00:00Z",
    decisions: [],
    events: [],
    locale: "sr-Latn",
    lockVersion: 1,
    organizationId: null,
    publicLabel: "Termin",
    publicVisible: true,
    relations: [],
    revisionId: `revision-${overrides.termId}`,
    searchTerms: [],
    shortDescription: "",
    sortOrder: 0,
    stableId: overrides.termId,
    status: "published",
    systemDefined: false,
    updatedAt: "2026-08-01T10:00:00Z",
    versionLabel: "v1",
    ...overrides,
  } as TaxonomyTerm;
}

const registry: TaxonomyTerm[] = [
  term({
    termId: "area",
    axis: "topic_group",
    publicLabel: "Gubitak i životne promene",
  }),
  term({
    termId: "topic",
    primaryParentTermId: "area",
    publicLabel: "Tugovanje",
  }),
];

function entry(overrides: Partial<ApiContentRevision> = {}) {
  return {
    entryId: "entry-1",
    revisionId: "revision-1",
    contentType: "article",
    management: "system",
    slug: "tugovanje",
    locale: "sr-Latn",
    template: "article_detail",
    slotData: {
      hero: { mode: "override", fields: { title: "Tugovanje" } },
      byline: {
        mode: "override",
        fields: {
          author: {
            action: "VIEW_THERAPIST",
            targetId: "therapist:anja-simic",
          },
        },
      },
    },
    seo: { title: "", description: "" },
    discovery: {
      topicGroupTermId: "area",
      topicTermIds: ["topic"],
      audienceTermIds: [],
      contentGoalTermIds: [],
      journeyIntentTermId: null,
      contentFormatTermId: null,
      accessLevelTermId: null,
      relatedContentEntryIds: [],
    },
    status: "draft",
    versionLabel: "v1",
    lockVersion: 1,
    decisions: [],
    createdBy: null,
    updatedBy: null,
    updatedAt: "2026-08-04T10:00:00Z",
    ...overrides,
  } as ApiContentRevision;
}

const all = { filter: "all" as const, search: "" };

describe("the Kompas content list", () => {
  it("shows Kompas material only — never the pages of the site", () => {
    const rows = kompasArticleRows(
      [
        entry(),
        entry({ entryId: "page", contentType: "static_page", slug: "o-nama" }),
        entry({ entryId: "usluga", contentType: "service", slug: "usluge" }),
      ],
      registry,
      all,
    );
    expect(rows.map((row) => row.entryId)).toEqual(["entry-1"]);
  });

  it("says who signs the text and where it belongs", () => {
    const [row] = kompasArticleRows([entry()], registry, all);
    expect(row?.title).toBe("Tugovanje");
    expect(row?.authorSlug).toBe("anja-simic");
    expect(row?.areaLabel).toBe("Gubitak i životne promene");
    expect(row?.topicLabels).toEqual(["Tugovanje"]);
  });

  it("puts the most recently touched article first", () => {
    const rows = kompasArticleRows(
      [
        entry({ entryId: "old", updatedAt: "2026-08-01T09:00:00Z" }),
        entry({ entryId: "new", updatedAt: "2026-08-04T18:00:00Z" }),
      ],
      registry,
      all,
    );
    expect(rows.map((row) => row.entryId)).toEqual(["new", "old"]);
  });

  it("groups draft and approved under „Radne verzije\" — both are still the author's move", () => {
    const entries = [
      entry({ entryId: "draft", status: "draft" }),
      entry({ entryId: "approved", status: "approved" }),
      entry({ entryId: "review", status: "in_review" }),
      entry({ entryId: "live", status: "published" }),
    ];
    const ids = (filter: "draft" | "review" | "published") =>
      kompasArticleRows(entries, registry, { filter, search: "" })
        .map((row) => row.entryId)
        .sort();

    expect(ids("draft")).toEqual(["approved", "draft"]);
    expect(ids("review")).toEqual(["review"]);
    expect(ids("published")).toEqual(["live"]);
  });

  it("searches the words the author sees, not the identifiers", () => {
    const search = (needle: string) =>
      kompasArticleRows([entry()], registry, {
        filter: "all",
        search: needle,
      }).length;

    expect(search("gubitak")).toBe(1);
    expect(search("Tugovanje")).toBe(1);
    expect(search("entry-1")).toBe(0);
  });
});
