import { describe, expect, it } from "vitest";

import {
  parsePublicTaxonomyPageAggregate,
  parsePublicTaxonomyTerm,
} from "./contract";
import { publicTaxonomyPageContractIssue } from "./taxonomy-view";

const area = {
  termId: "00000000-0000-4000-8000-000000000001",
  axis: "topic_group",
  stableId: "area-stress",
  canonicalPath: "/kompas/oblast/stres",
  publicLabel: "Stres",
  shortDescription: "Kako prepoznati i razumeti stres.",
  parentStableId: null,
  journeyIntent: null,
  sortOrder: 10,
  iconKey: null,
  assetId: null,
  searchTerms: ["pritisak"],
  relatedStableIds: [],
} as const;

const topic = {
  ...area,
  termId: "00000000-0000-4000-8000-000000000002",
  axis: "topic",
  stableId: "topic-burnout",
  canonicalPath: "/kompas/tema/sagorevanje",
  publicLabel: "Sagorevanje",
  parentStableId: "area-stress",
} as const;

const aggregate = {
  taxonomyVersion: "kompas-taxonomy-v1",
  locale: "sr-Latn",
  term: topic,
  parent: area,
  children: [],
  relatedTerms: [],
  contentCards: [
    {
      itemKey: "service:individualna-psihoterapija",
      contentType: "service",
      slug: "individualna-psihoterapija",
      locale: "sr-Latn",
      template: "service_detail",
      seo: {
        title: "Individualna psihoterapija",
        description: "Objavljen sadržaj.",
      },
      contentFormat: "article",
      accessLevel: "public",
      publishedAt: "2026-08-01T12:00:00+00:00",
    },
  ],
} as const;

describe("public Compass response contract", () => {
  it("parses the existing generated public term shape", () => {
    expect(parsePublicTaxonomyTerm(topic)).toMatchObject({
      stableId: "topic-burnout",
      axis: "topic",
    });
  });

  it("parses the F2 aggregate and enforces public card access", () => {
    const parsed = parsePublicTaxonomyPageAggregate(aggregate);
    expect(parsed.contentCards[0]?.accessLevel).toBe("public");
    expect(
      publicTaxonomyPageContractIssue(
        parsed,
        "tema",
        "/kompas/tema/sagorevanje",
      ),
    ).toBeNull();
  });

  it("rejects an anonymous aggregate with a non-public content card", () => {
    expect(() =>
      parsePublicTaxonomyPageAggregate({
        ...aggregate,
        contentCards: [
          { ...aggregate.contentCards[0], accessLevel: "registered" },
        ],
      }),
    ).toThrow();
  });

  it("rejects raw CMS slot data at the anonymous card boundary", () => {
    expect(() =>
      parsePublicTaxonomyPageAggregate({
        ...aggregate,
        contentCards: [
          {
            ...aggregate.contentCards[0],
            slotData: {
              hiddenSection: { mode: "hidden", privateNote: "ne izlagati" },
            },
          },
        ],
      }),
    ).toThrow();
  });

  it("detects a mismatched canonical page even when JSON shape is valid", () => {
    const parsed = parsePublicTaxonomyPageAggregate(aggregate);
    expect(
      publicTaxonomyPageContractIssue(
        parsed,
        "tema",
        "/kompas/tema/druga-tema",
      ),
    ).toMatch(/requested canonical route/i);
  });
});
