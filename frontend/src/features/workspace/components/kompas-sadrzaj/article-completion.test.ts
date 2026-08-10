import { describe, expect, it } from "vitest";

import type { ApiContentFinding, ApiContentRevision } from "../../content-api";
import {
  deriveArticleCompletion,
  type ArticleCompletionState,
} from "./article-completion";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function steps(state: ArticleCompletionState) {
  return state.steps as [
    ArticleCompletionState["steps"][number],
    ArticleCompletionState["steps"][number],
    ArticleCompletionState["steps"][number],
    ArticleCompletionState["steps"][number],
    ArticleCompletionState["steps"][number],
  ];
}

function revision(
  overrides: Partial<{
    slotData: Record<string, unknown>;
    discovery: Partial<ApiContentRevision["discovery"]>;
    status: ApiContentRevision["status"];
  }> = {},
): Pick<ApiContentRevision, "slotData" | "discovery" | "status"> {
  return {
    slotData: overrides.slotData ?? {},
    discovery: {
      topicGroupTermId: null,
      topicTermIds: [],
      audienceTermIds: [],
      contentGoalTermIds: [],
      journeyIntentTermId: null,
      contentFormatTermId: null,
      accessLevelTermId: null,
      relatedContentEntryIds: [],
      ...overrides.discovery,
    },
    status: overrides.status ?? "draft",
  };
}

function slot(mode = "override", fields: Record<string, unknown> = {}) {
  return { mode, fields };
}

function hero(title: string, lead?: string) {
  return slot("override", { title, lead: lead ?? "" });
}

function byline(therapistSlug: string) {
  return slot("override", {
    author: {
      action: "VIEW_THERAPIST",
      label: "Test Therapist",
      targetId: `therapist:${therapistSlug}`,
    },
  });
}

function bodyIntro(blockCount = 1) {
  return slot("override", {
    body: {
      blocks: Array.from({ length: blockCount }, (_, i) => ({
        id: `b${i}`,
        type: "paragraph",
        spans: [],
      })),
    },
  });
}

function finding(
  overrides: Partial<ApiContentFinding> = {},
): ApiContentFinding {
  return {
    ruleId: "MODEL-001",
    ruleVersion: "v1",
    severity: "error",
    message: "Missing required field",
    remediation: "Add the field",
    fieldPath: null,
    requiresApproval: null,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("deriveArticleCompletion", () => {
  // ── Empty state ──────────────────────────────────────────────────────

  it("returns all steps incomplete for an empty entry", () => {
    const state = deriveArticleCompletion(revision());
    expect(state.steps).toHaveLength(5);
    expect(steps(state)[0].done).toBe(false); // basics
    expect(steps(state)[1].done).toBe(false); // text
    expect(steps(state)[2].done).toBe(false); // taxonomy
    expect(steps(state)[3].done).toBe(false); // kompas
    expect(state.canSubmitForReview).toBe(false);
  });

  it("currentStep is basics when empty", () => {
    const state = deriveArticleCompletion(revision());
    expect(state.currentStep).toBe("basics");
  });

  it("has correct nextAction for empty state", () => {
    const state = deriveArticleCompletion(revision());
    expect(state.nextAction).not.toBeNull();
    expect(state.nextAction!.step).toBe("basics");
    expect(state.nextAction!.label).toContain("osnovne podatke");
  });

  // ── Basics step ─────────────────────────────────────────────────────

  it("marks basics done when title and author exist", () => {
    const entry = revision({
      slotData: {
        hero: hero("Test Title"),
        byline: byline("maria-bullock"),
      },
    });
    const state = deriveArticleCompletion(entry);
    expect(steps(state)[0].done).toBe(true);
    expect(steps(state)[0].label).toBe("Osnovni podaci");
  });

  it("basics not done without title", () => {
    const entry = revision({
      slotData: { byline: byline("maria-bullock") },
    });
    const state = deriveArticleCompletion(entry);
    expect(steps(state)[0].done).toBe(false);
    // blocking task for title should exist
    expect(state.blockingTasks.some((t) => t.id === "missing-hero-title")).toBe(
      true,
    );
  });

  it("basics not done without author", () => {
    const entry = revision({
      slotData: { hero: hero("Test Title") },
    });
    const state = deriveArticleCompletion(entry);
    expect(steps(state)[0].done).toBe(false);
    expect(
      state.blockingTasks.some((t) => t.id === "missing-byling-author"),
    ).toBe(true);
  });

  // ── Text step ───────────────────────────────────────────────────────

  it("marks text done when body has blocks", () => {
    const entry = revision({
      slotData: {
        hero: hero("Test Title"),
        byline: byline("maria-bullock"),
        body_intro: bodyIntro(3),
      },
    });
    const state = deriveArticleCompletion(entry);
    expect(steps(state)[1].done).toBe(true);
  });

  it("text not done when body is empty", () => {
    const entry = revision({
      slotData: {
        hero: hero("Test Title"),
        byline: byline("maria-bullock"),
        body_intro: bodyIntro(0),
      },
    });
    const state = deriveArticleCompletion(entry);
    expect(steps(state)[1].done).toBe(false);
    expect(state.blockingTasks.some((t) => t.id === "missing-body")).toBe(true);
  });

  // ── Taxonomy step ───────────────────────────────────────────────────

  it("marks taxonomy done when topicGroupId and topicTermIds are set", () => {
    const entry = revision({
      slotData: {
        hero: hero("Test Title"),
        byline: byline("maria-bullock"),
        body_intro: bodyIntro(1),
      },
      discovery: {
        topicGroupTermId: "stress-overload",
        topicTermIds: ["burnout"],
      },
    });
    const state = deriveArticleCompletion(entry);
    expect(steps(state)[2].done).toBe(true);
  });

  it("taxonomy not done without topic group", () => {
    const entry = revision({
      slotData: {
        hero: hero("Test Title"),
        byline: byline("maria-bullock"),
        body_intro: bodyIntro(1),
      },
      discovery: {
        topicTermIds: ["burnout"],
      },
    });
    const state = deriveArticleCompletion(entry);
    expect(steps(state)[2].done).toBe(false);
    expect(
      state.blockingTasks.some((t) => t.id === "missing-topic-group"),
    ).toBe(true);
  });

  it("taxonomy not done without any topics", () => {
    const entry = revision({
      slotData: {
        hero: hero("Test Title"),
        byline: byline("maria-bullock"),
        body_intro: bodyIntro(1),
      },
      discovery: {
        topicGroupTermId: "stress-overload",
      },
    });
    const state = deriveArticleCompletion(entry);
    expect(steps(state)[2].done).toBe(false);
    expect(state.blockingTasks.some((t) => t.id === "missing-topics")).toBe(
      true,
    );
  });

  // ── Kompas step ─────────────────────────────────────────────────────

  it("marks kompas done when audience, goals and journey are set", () => {
    const entry = revision({
      slotData: {
        hero: hero("Test Title"),
        byline: byline("maria-bullock"),
        body_intro: bodyIntro(1),
      },
      discovery: {
        topicGroupTermId: "stress-overload",
        topicTermIds: ["burnout"],
        audienceTermIds: ["self"],
        contentGoalTermIds: ["understand"],
        journeyIntentTermId: "explore",
      },
    });
    const state = deriveArticleCompletion(entry);
    expect(steps(state)[3].done).toBe(true);
  });

  // ── canSubmitForReview ──────────────────────────────────────────────

  it("canSubmitForReview is true when all four steps are done", () => {
    const entry = revision({
      slotData: {
        hero: hero("Test Title"),
        byline: byline("maria-bullock"),
        body_intro: bodyIntro(1),
      },
      discovery: {
        topicGroupTermId: "stress-overload",
        topicTermIds: ["burnout"],
        audienceTermIds: ["self"],
        contentGoalTermIds: ["understand"],
        journeyIntentTermId: "explore",
      },
    });
    const state = deriveArticleCompletion(entry);
    expect(state.canSubmitForReview).toBe(true);
    expect(state.nextAction!.step).toBe("review");
  });

  it("canSubmitForReview is false when blocking tasks exist", () => {
    const entry = revision({
      slotData: {
        hero: hero("Test Title"),
        byline: byline("maria-bullock"),
        body_intro: bodyIntro(1),
      },
      discovery: {
        topicGroupTermId: "stress-overload",
        topicTermIds: ["burnout"],
        audienceTermIds: ["self"],
        contentGoalTermIds: ["understand"],
        journeyIntentTermId: "explore",
      },
    });
    const state = deriveArticleCompletion(entry, [
      finding({ ruleId: "MODEL-004", message: "Hero must not exceed limit" }),
    ]);
    expect(state.canSubmitForReview).toBe(false);
  });

  // ── Health findings ─────────────────────────────────────────────────

  it("converts KOMPAS-ELIGIBILITY-001 findings to advisory tasks", () => {
    const entry = revision({
      slotData: {
        hero: hero("Test Title"),
        byline: byline("maria-bullock"),
        body_intro: bodyIntro(1),
      },
      discovery: {
        topicGroupTermId: "stress-overload",
        topicTermIds: [],
        audienceTermIds: [],
        contentGoalTermIds: [],
      },
    });
    const state = deriveArticleCompletion(entry, [
      finding({
        ruleId: "KOMPAS-ELIGIBILITY-001",
        fieldPath: "discovery.topicTermIds",
        message: "Missing topics",
        remediation: "Select at least one topic",
        severity: "error",
      }),
    ]);
    // Should be in advisory (the KOMPAS-ELIGIBILITY block in findingsToTasks)
    const task = state.advisoryTasks.find(
      (t) => t.id === "KOMPAS-ELIGIBILITY-001-discovery.topicTermIds",
    );
    expect(task).toBeDefined();
    expect(task!.step).toBe("kompas");
    expect(task!.blocking).toBe(true);
  });

  it("converts MODEL findings to blocking tasks", () => {
    const entry = revision();
    const state = deriveArticleCompletion(entry, [
      finding({ ruleId: "MODEL-004", fieldPath: "hero.title" }),
    ]);
    expect(
      state.blockingTasks.some((t) => t.id === "MODEL-004-hero.title"),
    ).toBe(true);
  });

  it("converts RICH findings to advisory tasks in text step", () => {
    const entry = revision({
      slotData: {
        hero: hero("Test Title"),
        byline: byline("maria-bullock"),
        body_intro: bodyIntro(1),
      },
    });
    const state = deriveArticleCompletion(entry, [
      finding({
        ruleId: "RICH-001",
        fieldPath: "body_intro.body",
        severity: "warning",
      }),
    ]);
    const task = state.advisoryTasks.find(
      (t) => t.id === "RICH-001-body_intro.body",
    );
    expect(task).toBeDefined();
    expect(task!.step).toBe("text");
    expect(task!.blocking).toBe(false);
  });

  // ── Step ordering ──────────────────────────────────────────────────

  it("step 1 is basics, step 2 is text, step 3 is taxonomy, step 4 is kompas, step 5 is review", () => {
    const state = deriveArticleCompletion(revision());
    expect(steps(state)[0].id).toBe("basics");
    expect(steps(state)[1].id).toBe("text");
    expect(steps(state)[2].id).toBe("taxonomy");
    expect(steps(state)[3].id).toBe("kompas");
    expect(steps(state)[4].id).toBe("review");
  });

  it("all steps have ordinals 1-5", () => {
    const state = deriveArticleCompletion(revision());
    state.steps.forEach((step, i) => {
      expect(step.ordinal).toBe(i + 1);
    });
  });

  // ── Blocked steps ──────────────────────────────────────────────────

  it("step 2 (text) is blocked when basics not done", () => {
    const state = deriveArticleCompletion(revision());
    expect(steps(state)[1].blocked).toBe(true);
  });

  it("step 3 (taxonomy) is not blocked when basics and text are done", () => {
    const entry = revision({
      slotData: {
        hero: hero("Test Title"),
        byline: byline("maria-bullock"),
        body_intro: bodyIntro(1),
      },
    });
    const state = deriveArticleCompletion(entry);
    expect(steps(state)[2].blocked).toBe(false);
  });

  // ── Deduplication ──────────────────────────────────────────────────

  it("does not duplicate tasks with the same id", () => {
    const entry = revision({
      slotData: {
        hero: hero("Test Title"),
        byline: byline("maria-bullock"),
        body_intro: bodyIntro(1),
      },
      discovery: {
        topicGroupTermId: "stress-overload",
        topicTermIds: ["burnout"],
        audienceTermIds: ["self"],
        contentGoalTermIds: ["understand"],
        journeyIntentTermId: "explore",
      },
    });
    // The derived missing-topics task won't exist because topics are set,
    // but a health finding with the same ruleId+fieldPath would.
    const state = deriveArticleCompletion(entry, [
      finding({
        ruleId: "MODEL-004",
        fieldPath: "hero.title",
        message: "Title required",
      }),
      finding({
        ruleId: "MODEL-004",
        fieldPath: "hero.title",
        message: "Title required (duplicate)",
      }),
    ]);
    const tasks = state.blockingTasks.filter(
      (t) => t.id === "MODEL-004-hero.title",
    );
    expect(tasks).toHaveLength(1);
  });
});
