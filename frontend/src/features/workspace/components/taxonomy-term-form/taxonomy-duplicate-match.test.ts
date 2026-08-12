import { describe, expect, it } from "vitest";

import type { TaxonomyTerm } from "../../taxonomy-api";

import {
  broadSearchTerms,
  findTaxonomyDuplicates,
  looksLikeContentTitle,
} from "./taxonomy-duplicate-match";

function term(overrides: Partial<TaxonomyTerm> = {}): TaxonomyTerm {
  return {
    termId: crypto.randomUUID(),
    revisionId: crypto.randomUUID(),
    organizationId: null,
    axis: "topic",
    stableId: "burnout",
    publicLabel: "Sagorevanje",
    shortDescription: "",
    searchTerms: [],
    status: "published",
    systemDefined: false,
    locale: "sr-Latn",
    sortOrder: 10,
    lockVersion: 1,
    publicVisible: true,
    compassEnabled: true,
    canonicalPath: null,
    relations: [],
    decisions: [],
    events: [],
    versionLabel: "v1",
    createdAt: "2026-08-04T00:00:00Z",
    updatedAt: "2026-08-04T00:00:00Z",
    ...overrides,
  } as TaxonomyTerm;
}

describe("finding an existing area or topic before creating a second one", () => {
  it("matches across diacritics and casing, because that is how the duplicate gets typed", () => {
    const matches = findTaxonomyDuplicates({
      candidateLabel: "  SAGOREVANJE  ",
      axis: "topic",
      terms: [term()],
    });

    expect(matches).toHaveLength(1);
    expect(matches[0]?.reason).toBe("same-name");
  });

  it("recognises a name that folds onto an existing internal id", () => {
    // The therapist no longer sees `stableId`, so this is the only place a
    // collision with it can be caught before the server answers TAX-ID-001.
    const matches = findTaxonomyDuplicates({
      candidateLabel: "Burnout",
      axis: "topic",
      terms: [term()],
    });

    expect(matches[0]?.reason).toBe("same-id");
  });

  it("still reports an archived match — that is exactly when a duplicate is created", () => {
    const matches = findTaxonomyDuplicates({
      candidateLabel: "Sagorevanje",
      axis: "topic",
      terms: [term({ status: "archived" })],
    });

    expect(matches[0]?.status).toBe("archived");
  });

  it("names the other registry instead of hiding a cross-axis collision", () => {
    // An area and a topic with the same name do not violate any constraint,
    // but they do collide in the visitor's head.
    const matches = findTaxonomyDuplicates({
      candidateLabel: "Sagorevanje",
      axis: "topic_group",
      terms: [term({ axis: "topic" })],
    });

    expect(matches[0]?.axis).toBe("topic");
    expect(matches[0]?.reason).toBe("same-name");
  });

  it("finds a term whose search terms already claim the name", () => {
    const matches = findTaxonomyDuplicates({
      candidateLabel: "Teskoba",
      axis: "topic",
      terms: [
        term({
          publicLabel: "Anksioznost",
          stableId: "anxiety",
          searchTerms: ["teskoba"],
        }),
      ],
    });

    expect(matches[0]?.reason).toBe("search-term");
  });

  it("stays quiet for a short prefix that would match everything", () => {
    expect(
      findTaxonomyDuplicates({
        candidateLabel: "sa",
        axis: "topic",
        terms: [term()],
      }),
    ).toEqual([]);
  });

  it("ranks an exact name above a loose similarity", () => {
    const matches = findTaxonomyDuplicates({
      candidateLabel: "Sagorevanje",
      axis: "topic",
      terms: [
        term({
          publicLabel: "Sagorevanje na poslu",
          stableId: "burnout-at-work",
        }),
        term(),
      ],
    });

    expect(matches[0]?.reason).toBe("same-name");
  });
});

describe("advisory warnings that never block a save", () => {
  it("recognises an article headline offered as a registry name", () => {
    expect(looksLikeContentTitle("Anksioznost nije vaš neprijatelj")).toBe(
      true,
    );
  });

  it("leaves a legitimate multi-word area alone", () => {
    expect(looksLikeContentTitle("Stres i preopterećenost")).toBe(false);
    expect(looksLikeContentTitle("Anksioznost")).toBe(false);
  });

  it("flags search terms so broad they would bury the results", () => {
    expect(broadSearchTerms(["teskoba", "emocije", "pomoć"])).toEqual([
      "emocije",
      "pomoć",
    ]);
  });
});
