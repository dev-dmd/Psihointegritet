import { describe, expect, it } from "vitest";

import { compassContentRows } from "./compass-content-view";
import type { ApiContentDiscovery, ApiContentRevision } from "./content-api";
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
  term({ termId: "area", axis: "topic_group", publicLabel: "Strah i brige" }),
  term({
    termId: "topic",
    primaryParentTermId: "area",
    publicLabel: "Anksioznost",
  }),
  term({ termId: "audience", axis: "audience", publicLabel: "Odrasli" }),
  term({ termId: "goal", axis: "content_goal", publicLabel: "Razumevanje" }),
  term({ termId: "journey", axis: "journey_intent" }),
  term({ termId: "format", axis: "content_format" }),
  term({ termId: "public", axis: "access_level", stableId: "public" }),
];

const linked: ApiContentDiscovery = {
  topicGroupTermId: "area",
  topicTermIds: ["topic"],
  audienceTermIds: ["audience"],
  contentGoalTermIds: ["goal"],
  journeyIntentTermId: "journey",
  contentFormatTermId: "format",
  accessLevelTermId: "public",
  relatedContentEntryIds: [],
};

const empty: ApiContentDiscovery = {
  topicGroupTermId: null,
  topicTermIds: [],
  audienceTermIds: [],
  contentGoalTermIds: [],
  journeyIntentTermId: null,
  contentFormatTermId: null,
  accessLevelTermId: null,
  relatedContentEntryIds: [],
};

function entry(overrides: Partial<ApiContentRevision> = {}) {
  return {
    entryId: "entry-1",
    revisionId: "revision-1",
    contentType: "article",
    management: "system",
    slug: "anksioznost",
    locale: "sr-Latn",
    template: "article_detail",
    slotData: {},
    seo: { title: "Anksioznost nije vaš neprijatelj", description: "" },
    discovery: linked,
    status: "published",
    versionLabel: "v1",
    lockVersion: 1,
    decisions: [],
    createdBy: null,
    updatedBy: null,
    updatedAt: "2026-08-01T10:00:00Z",
    ...overrides,
  } as ApiContentRevision;
}

const all = { filter: "all" as const, search: "" };

describe("the rows the Kompas content workspace shows", () => {
  it("names an article by its authored title and falls back to the address", () => {
    const [titled] = compassContentRows([entry()], registry, all);
    expect(titled?.title).toBe("Anksioznost nije vaš neprijatelj");

    const [untitled] = compassContentRows(
      [entry({ seo: { title: "  ", description: "" } })],
      registry,
      all,
    );
    // A brand-new article has no title yet — an empty row would be unusable.
    expect(untitled?.title).toBe("anksioznost");
  });

  it("shows what the entry is linked to, in the registry's own words", () => {
    const [row] = compassContentRows([entry()], registry, all);
    expect(row?.areaLabel).toBe("Strah i brige");
    expect(row?.topicLabels).toEqual(["Anksioznost"]);
    expect(row?.audienceLabels).toEqual(["Odrasli"]);
    expect(row?.goalLabels).toEqual(["Razumevanje"]);
    expect(row?.link.stage).toBe("published");
  });

  it("leaves therapist pages out — the server drops that type before any rule", () => {
    const rows = compassContentRows(
      [
        entry(),
        entry({
          entryId: "entry-therapist",
          contentType: "therapist",
          slug: "john-francis",
        }),
      ],
      registry,
      all,
    );
    expect(rows.map((row) => row.entryId)).toEqual(["entry-1"]);
  });

  it("separates the three questions an author actually asks", () => {
    const entries = [
      entry({ entryId: "ready" }),
      entry({ entryId: "blank", slug: "nesanica", discovery: empty }),
      entry({
        entryId: "half",
        slug: "stres",
        discovery: { ...linked, audienceTermIds: [] },
      }),
    ];
    const ids = (filter: "unlinked" | "incomplete" | "linked") =>
      compassContentRows(entries, registry, { filter, search: "" }).map(
        (row) => row.entryId,
      );

    expect(ids("unlinked")).toEqual(["blank"]);
    expect(ids("incomplete")).toEqual(["half"]);
    expect(ids("linked")).toEqual(["ready"]);
  });

  it("searches the words on the row, not the identifiers behind it", () => {
    const entries = [
      entry(),
      entry({
        entryId: "other",
        slug: "nesanica",
        seo: { title: "Kada san ne dolazi", description: "" },
      }),
    ];
    const search = (needle: string) =>
      compassContentRows(entries, registry, {
        filter: "all",
        search: needle,
      }).map((row) => row.entryId);

    expect(search("strah")).toHaveLength(2);
    expect(search("Anksioznost nije")).toEqual(["entry-1"]);
    expect(search("entry-1")).toEqual([]);
  });
});
