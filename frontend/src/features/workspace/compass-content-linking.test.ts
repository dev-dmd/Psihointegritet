import { describe, expect, it } from "vitest";

import {
  compassContentLink,
  missingCompassRequirements,
} from "./compass-content-linking";
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
  term({
    termId: "other-topic",
    primaryParentTermId: "other-area",
    publicLabel: "Nesanica",
  }),
  term({ termId: "audience", axis: "audience" }),
  term({ termId: "goal", axis: "content_goal" }),
  term({ termId: "journey", axis: "journey_intent" }),
  term({ termId: "format", axis: "content_format" }),
  term({ termId: "public", axis: "access_level", stableId: "public" }),
  term({ termId: "staff", axis: "access_level", stableId: "staff_only" }),
];

function discovery(
  overrides: Partial<ApiContentDiscovery> = {},
): ApiContentDiscovery {
  return {
    topicGroupTermId: "area",
    topicTermIds: ["topic"],
    audienceTermIds: ["audience"],
    contentGoalTermIds: ["goal"],
    journeyIntentTermId: "journey",
    contentFormatTermId: "format",
    accessLevelTermId: "public",
    relatedContentEntryIds: [],
    ...overrides,
  };
}

function entry(
  overrides: Partial<
    Pick<ApiContentRevision, "contentType" | "discovery" | "status">
  > = {},
) {
  return {
    contentType: "static_page" as const,
    discovery: discovery(),
    status: "published" as const,
    ...overrides,
  };
}

describe("what the panel says about an entry's place in Kompas", () => {
  it("separates never-linked from half-linked, because the next action differs", () => {
    const untouched = compassContentLink(
      entry({
        discovery: discovery({
          topicGroupTermId: null,
          topicTermIds: [],
          audienceTermIds: [],
          contentGoalTermIds: [],
          journeyIntentTermId: null,
          contentFormatTermId: null,
          accessLevelTermId: null,
        }),
      }),
      registry,
    );
    expect(untouched.stage).toBe("not-linked");
    expect(untouched.missing).toEqual([]);

    const started = compassContentLink(
      entry({ discovery: discovery({ audienceTermIds: [] }) }),
      registry,
    );
    expect(started.stage).toBe("incomplete");
    expect(started.missing.map((item) => item.id)).toEqual(["audiences"]);
  });

  it("reports the CMS lifecycle only once nothing is missing", () => {
    for (const [status, stage] of [
      ["draft", "draft"],
      ["in_review", "in-review"],
      ["approved", "ready"],
      ["published", "published"],
      ["archived", "archived"],
    ] as const) {
      expect(compassContentLink(entry({ status }), registry).stage).toBe(stage);
    }

    // An incomplete entry is incomplete whatever the lifecycle says — being
    // published does not make it recommendable.
    expect(
      compassContentLink(
        entry({
          status: "published",
          discovery: discovery({ topicTermIds: [] }),
        }),
        registry,
      ).stage,
    ).toBe("incomplete");
  });

  it("names every rule the server would silently skip the entry for", () => {
    const missing = missingCompassRequirements(
      discovery({
        topicGroupTermId: null,
        topicTermIds: [],
        audienceTermIds: [],
        contentGoalTermIds: [],
        journeyIntentTermId: null,
        contentFormatTermId: null,
        accessLevelTermId: null,
      }),
      registry,
    );
    expect(missing.map((item) => item.id)).toEqual([
      "topicGroup",
      "topics",
      "audiences",
      "goals",
      "journeyIntent",
      "contentFormat",
      "accessLevel",
    ]);
  });

  it("catches a topic that belongs to another area — the rule nobody guesses", () => {
    const missing = missingCompassRequirements(
      discovery({ topicTermIds: ["topic", "other-topic"] }),
      registry,
    );
    expect(missing.map((item) => item.id)).toEqual(["topicParent"]);
    expect(missing[0]?.label).toContain("Nesanica");
    expect(missing[0]?.label).toContain("Strah i brige");
  });

  it("treats a non-public access level as a decision to state, not a bug", () => {
    const missing = missingCompassRequirements(
      discovery({ accessLevelTermId: "staff" }),
      registry,
    );
    expect(missing.map((item) => item.id)).toEqual(["accessLevel"]);
    expect(missing[0]?.label).toContain("Javno");
  });

  it("says an article will not be recommended even when everything is filled in", () => {
    const link = compassContentLink(
      entry({ contentType: "article", status: "published" }),
      registry,
    );
    expect(link.stage).toBe("published");
    expect(link.advisory).toContain("Kompas još ne preporučuje");

    // The six system types carry no such caveat.
    expect(compassContentLink(entry(), registry).advisory).toBeNull();

    // A therapist page is excluded for a different reason and says so.
    expect(
      compassContentLink(entry({ contentType: "therapist" }), registry)
        .advisory,
    ).toContain("Vođeni izbor");
  });

  it("never puts an id, a UUID or an axis name in front of the author (D-062)", () => {
    const sentences = missingCompassRequirements(
      discovery({
        topicGroupTermId: null,
        topicTermIds: [],
        audienceTermIds: [],
        contentGoalTermIds: [],
        journeyIntentTermId: null,
        contentFormatTermId: null,
        accessLevelTermId: null,
      }),
      registry,
    )
      .map((item) => item.label)
      .join(" ");
    for (const forbidden of [
      "termId",
      "UUID",
      "uuid",
      "axis",
      "topic_group",
      "content_goal",
      "access_level",
      "API",
    ]) {
      expect(sentences).not.toContain(forbidden);
    }
  });
});
