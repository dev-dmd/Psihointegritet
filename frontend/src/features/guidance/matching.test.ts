import { describe, expect, it } from "vitest";

import { therapists } from "@/content/therapists";

import {
  AREAS,
  AUDIENCE,
  FORMATS,
  PRIORITIES,
  recommendMatch,
  type MatchingAnswers,
} from "./matching";

/** Convenience builder: [audience, ageGroup, area, format, priority]. */
function answers(
  audience: string | null,
  ageGroup: string | null,
  area: string | null,
  format: string | null,
  priority: string | null,
): MatchingAnswers {
  return [audience, ageGroup, area, format, priority];
}

const ADULT = "26–45";

describe("recommendMatch — branches", () => {
  it("routes 'Rad sa kompanijama' straight to B2B, skipping matching", () => {
    const result = recommendMatch(
      answers(AUDIENCE.b2b, null, null, null, null),
    );
    expect(result.kind).toBe("b2b");
  });

  it("never auto-assigns crisis/violence recovery — hands it to the team", () => {
    const result = recommendMatch(
      answers(
        AUDIENCE.self,
        ADULT,
        AREAS.crisisRecovery,
        FORMATS.online,
        PRIORITIES.bestFit,
      ),
    );
    expect(result.kind).toBe("team");
  });

  it("routes to the team when the user asks for team confirmation", () => {
    const result = recommendMatch(
      answers(
        AUDIENCE.self,
        ADULT,
        AREAS.stress,
        FORMATS.online,
        PRIORITIES.teamConfirms,
      ),
    );
    expect(result.kind).toBe("team");
  });

  it("routes to the team when hard filters leave nobody (adolescent + uživo Niš)", () => {
    const result = recommendMatch(
      answers(
        AUDIENCE.adolescent,
        "13–15",
        AREAS.adolescence,
        FORMATS.nis,
        PRIORITIES.bestFit,
      ),
    );
    expect(result.kind).toBe("team");
  });
});

describe("recommendMatch — hard filters", () => {
  it("sends minors to Marija only, with the parent/guardian note", () => {
    const result = recommendMatch(
      answers(
        AUDIENCE.adolescent,
        "16–17",
        AREAS.adolescence,
        FORMATS.online,
        PRIORITIES.bestFit,
      ),
    );
    expect(result.kind).toBe("match");
    if (result.kind !== "match") return;
    expect(result.primary.therapist.slug).toBe("marija-stamenkovic");
    expect(result.alternatives).toHaveLength(0);
    expect(result.minorNote).toBe(true);
  });

  it("excludes Marija from couples (only Anja and Marjan work with couples)", () => {
    const result = recommendMatch(
      answers(
        AUDIENCE.couple,
        ADULT,
        AREAS.relationships,
        FORMATS.online,
        PRIORITIES.moreOptions,
      ),
    );
    expect(result.kind).toBe("match");
    if (result.kind !== "match") return;
    const slugs = [
      result.primary.therapist.slug,
      ...result.alternatives.map((match) => match.therapist.slug),
    ];
    expect(slugs).not.toContain("marija-stamenkovic");
    expect(slugs).toContain("anja-stamenkovic");
    expect(slugs).toContain("marjan-jankovic");
  });

  it("keeps only Anja for uživo — Niš", () => {
    const result = recommendMatch(
      answers(
        AUDIENCE.self,
        ADULT,
        AREAS.stress,
        FORMATS.nis,
        PRIORITIES.moreOptions,
      ),
    );
    expect(result.kind).toBe("match");
    if (result.kind !== "match") return;
    expect(result.primary.therapist.slug).toBe("anja-stamenkovic");
    expect(result.alternatives).toHaveLength(0);
  });

  it("keeps only Leskovac therapists for uživo — Leskovac", () => {
    const result = recommendMatch(
      answers(
        AUDIENCE.self,
        ADULT,
        AREAS.growth,
        FORMATS.leskovac,
        PRIORITIES.moreOptions,
      ),
    );
    expect(result.kind).toBe("match");
    if (result.kind !== "match") return;
    const slugs = [
      result.primary.therapist.slug,
      ...result.alternatives.map((match) => match.therapist.slug),
    ];
    expect(slugs).not.toContain("anja-stamenkovic");
    expect(slugs.every((slug) => slug !== "anja-stamenkovic")).toBe(true);
  });

  it("restricts a parent request to therapists who work with parents", () => {
    const result = recommendMatch(
      answers(
        AUDIENCE.parent,
        ADULT,
        AREAS.parenting,
        FORMATS.online,
        PRIORITIES.moreOptions,
      ),
    );
    expect(result.kind).toBe("match");
    if (result.kind !== "match") return;
    const slugs = [
      result.primary.therapist.slug,
      ...result.alternatives.map((match) => match.therapist.slug),
    ];
    expect(slugs).not.toContain("marjan-jankovic");
  });
});

describe("recommendMatch — ranking and reasons", () => {
  it("ranks the area-matching therapist first", () => {
    const result = recommendMatch(
      answers(
        AUDIENCE.self,
        ADULT,
        AREAS.parenting,
        FORMATS.online,
        PRIORITIES.bestFit,
      ),
    );
    expect(result.kind).toBe("match");
    if (result.kind !== "match") return;
    // Anja and Marija list parenting; Marjan does not — a parenting-matcher leads.
    expect(["anja-stamenkovic", "marija-stamenkovic"]).toContain(
      result.primary.therapist.slug,
    );
    expect(result.primary.reasons).toContain(
      "oblast rada odgovara izabranim potrebama",
    );
  });

  it("gives every shown therapist at least one reason and no numeric score", () => {
    const result = recommendMatch(
      answers(
        AUDIENCE.self,
        ADULT,
        AREAS.stress,
        FORMATS.online,
        PRIORITIES.moreOptions,
      ),
    );
    expect(result.kind).toBe("match");
    if (result.kind !== "match") return;
    for (const match of [result.primary, ...result.alternatives]) {
      expect(match.reasons.length).toBeGreaterThan(0);
      for (const reason of match.reasons) {
        expect(reason).not.toMatch(/\d/); // no "87%" style scores
      }
    }
  });

  it("flags the earliest-appointment note when that priority is chosen", () => {
    const result = recommendMatch(
      answers(
        AUDIENCE.self,
        ADULT,
        AREAS.stress,
        FORMATS.online,
        PRIORITIES.earliest,
      ),
    );
    expect(result.kind).toBe("match");
    if (result.kind !== "match") return;
    expect(result.earliestNote).toBe(true);
  });

  it("only ever returns slugs that exist in the therapist data", () => {
    const known = new Set(therapists.map((therapist) => therapist.slug));
    const result = recommendMatch(
      answers(
        AUDIENCE.self,
        ADULT,
        AREAS.growth,
        FORMATS.any,
        PRIORITIES.moreOptions,
      ),
    );
    expect(result.kind).toBe("match");
    if (result.kind !== "match") return;
    for (const match of [result.primary, ...result.alternatives]) {
      expect(known).toContain(match.therapist.slug);
    }
  });
});
