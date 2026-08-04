import { describe, expect, it } from "vitest";

import type { ApiContentRevision } from "./content-api";
import {
  articleAuthorTargetId,
  articlePublicPath,
  articleSteps,
  articleTitle,
  therapistSlugFromTargetId,
} from "./kompas-article-view";

function entry(overrides: Partial<ApiContentRevision> = {}) {
  return {
    entryId: "entry-1",
    revisionId: "revision-1",
    contentType: "article",
    management: "system",
    slug: "tugovanje",
    locale: "sr-Latn",
    template: "article_detail",
    slotData: {},
    seo: { title: "", description: "" },
    discovery: {
      topicGroupTermId: null,
      topicTermIds: [],
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

const authored = {
  hero: {
    mode: "override",
    fields: { title: "Tugovanje nije nešto što treba preboljeti" },
  },
  byline: {
    mode: "override",
    fields: {
      author: { action: "VIEW_THERAPIST", targetId: "therapist:anja-simic" },
    },
  },
  body_intro: {
    mode: "override",
    fields: {
      body: {
        schemaVersion: 1,
        blocks: [{ type: "paragraph", id: "b1", spans: [] }],
      },
    },
  },
};

describe("reading an article the way its own screen needs it", () => {
  it("takes the title from the article, not from the SEO field", () => {
    expect(articleTitle(entry({ slotData: authored }))).toBe(
      "Tugovanje nije nešto što treba preboljeti",
    );
    // SEO is the fallback, and the address is the last resort.
    expect(
      articleTitle(entry({ seo: { title: "SEO naslov", description: "" } })),
    ).toBe("SEO naslov");
    expect(articleTitle(entry())).toBe("tugovanje");
  });

  it("ignores a title that is only inherited, because an article has no fallback", () => {
    // The six system types fall back to code; an article inheriting means the
    // slot is empty, and showing a title there would be a lie.
    expect(
      articleTitle(
        entry({ slotData: { hero: { mode: "inherit" } }, slug: "prazan" }),
      ),
    ).toBe("prazan");
  });

  it("reads the public byline and turns the stored target into a slug", () => {
    expect(articleAuthorTargetId(entry({ slotData: authored }))).toBe(
      "therapist:anja-simic",
    );
    expect(articleAuthorTargetId(entry())).toBeNull();

    expect(therapistSlugFromTargetId("therapist:anja-simic")).toBe(
      "anja-simic",
    );
    // Anything that is not a therapist reference is not an author.
    expect(therapistSlugFromTargetId("service:individualna")).toBeNull();
    expect(therapistSlugFromTargetId("therapist:")).toBeNull();
    expect(therapistSlugFromTargetId(null)).toBeNull();
  });

  it("names the address the article will live at", () => {
    expect(articlePublicPath(entry())).toBe("/znanje/tugovanje");
  });

  it("reports an empty article as four open steps, each with its next action", () => {
    const steps = articleSteps(entry());
    expect(steps.map((step) => step.id)).toEqual([
      "what",
      "where",
      "write",
      "kompas",
    ]);
    expect(steps.every((step) => !step.done)).toBe(true);
    expect(steps[0]?.missing).toContain("naslov");
    expect(steps[1]?.missing).toContain("oblast");
    expect(steps[2]?.missing).toContain("tekst");
    expect(steps[3]?.missing).toContain("namenjen");
  });

  it("closes each step only when that step's own data is there", () => {
    const half = entry({
      slotData: authored,
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
    });
    const done = Object.fromEntries(
      articleSteps(half).map((step) => [step.id, step.done]),
    );
    expect(done).toEqual({
      what: true,
      where: true,
      write: true,
      kompas: false,
    });
  });

  it("does not count an empty rich body as written", () => {
    const emptyBody = entry({
      slotData: {
        ...authored,
        body_intro: {
          mode: "override",
          fields: { body: { schemaVersion: 1, blocks: [] } },
        },
      },
    });
    expect(articleSteps(emptyBody).find((s) => s.id === "write")?.done).toBe(
      false,
    );
  });
});
