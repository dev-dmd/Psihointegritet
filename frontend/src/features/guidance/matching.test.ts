import { describe, expect, it } from "vitest";

import {
  CHILD_AGE_GROUPS,
  GOALS,
  LOCATIONS,
  PARTICIPANTS,
  PRIOR_THERAPY,
  REASONS,
  RECOMMENDED_SERVICES,
  WORK_FORMATS,
  activeIntakeSteps,
  emptyIntakeAnswers,
  evaluateIntake,
  type IntakeAnswers,
} from "./matching";

const ANJA = "anja-stamenkovic";
const MARIJA = "marija-stamenkovic";
const MARJAN = "marjan-jankovic";

function answers(partial: Partial<IntakeAnswers>): IntakeAnswers {
  return { ...emptyIntakeAnswers, ...partial };
}

function topSlugs(result: ReturnType<typeof evaluateIntake>): string[] {
  return result.recommendedTherapists.map((match) => match.therapist.slug);
}

describe("evaluateIntake — mandatory cases", () => {
  it("1. partner relationship + partner i ja → Anja/Marjan and Bračno savetovanje", () => {
    const result = evaluateIntake(
      answers({
        reason: REASONS.partnerRelationship,
        participants: PARTICIPANTS.partner,
        format: WORK_FORMATS.online,
      }),
    );
    expect(topSlugs(result).slice(0, 2).sort()).toEqual([ANJA, MARJAN].sort());
    expect(result.recommendedService).toBe(RECOMMENDED_SERVICES.couples);
    // Equal scores → both shown.
    expect(result.showBoth).toBe(true);
  });

  it("2. odnos sa adolescentom → Marija is the first result", () => {
    const result = evaluateIntake(
      answers({
        reason: REASONS.adolescent,
        participants: PARTICIPANTS.parentChild,
        format: WORK_FORMATS.online,
      }),
    );
    expect(result.primaryRecommendation?.therapist.slug).toBe(MARIJA);
    // 6+6+3 = 15 vs Anja 2 → clear primary.
    expect(result.showBoth).toBe(false);
  });

  it("3. burnout → Anja is the first result", () => {
    const result = evaluateIntake(
      answers({ reason: REASONS.burnout, participants: PARTICIPANTS.alone }),
    );
    expect(result.primaryRecommendation?.therapist.slug).toBe(ANJA);
    expect(result.showBoth).toBe(false);
  });

  it("4. zavisnost → Anja is the first result", () => {
    const result = evaluateIntake(
      answers({ reason: REASONS.addiction, participants: PARTICIPANTS.alone }),
    );
    expect(result.primaryRecommendation?.therapist.slug).toBe(ANJA);
    expect(result.showBoth).toBe(false);
  });

  it("5. depresivno raspoloženje → Marija and Marjan lead", () => {
    const result = evaluateIntake(
      answers({ reason: REASONS.depression, participants: PARTICIPANTS.alone }),
    );
    expect(topSlugs(result).slice(0, 2).sort()).toEqual(
      [MARIJA, MARJAN].sort(),
    );
    expect(result.showBoth).toBe(true);
  });

  it("6. gubitak ili žalovanje → Anja and Marjan lead", () => {
    const result = evaluateIntake(
      answers({ reason: REASONS.grief, participants: PARTICIPANTS.alone }),
    );
    expect(topSlugs(result).slice(0, 2).sort()).toEqual([ANJA, MARJAN].sort());
    expect(result.showBoth).toBe(true);
  });

  it("7. uživo + Niš → never recommends a therapist without in-person work in Niš", () => {
    const result = evaluateIntake(
      answers({
        reason: REASONS.depression, // would otherwise favour Marija/Marjan
        format: WORK_FORMATS.inPerson,
        location: LOCATIONS.nis,
      }),
    );
    expect(topSlugs(result)).toEqual([ANJA]);
    expect(result.primaryRecommendation?.therapist.slug).toBe(ANJA);
  });

  it("8. uživo + Leskovac → recommends Marija or Marjan by topic", () => {
    const adolescent = evaluateIntake(
      answers({
        reason: REASONS.adolescent,
        format: WORK_FORMATS.inPerson,
        location: LOCATIONS.leskovac,
      }),
    );
    expect(adolescent.primaryRecommendation?.therapist.slug).toBe(MARIJA);

    const situation = evaluateIntake(
      answers({
        reason: REASONS.trauma,
        goal: GOALS.concreteSituation,
        format: WORK_FORMATS.inPerson,
        location: LOCATIONS.leskovac,
      }),
    );
    expect(situation.primaryRecommendation?.therapist.slug).toBe(MARJAN);
    expect(topSlugs(situation)).not.toContain(ANJA);
  });

  it("9. prior-therapy answer never changes the score", () => {
    const base = answers({
      reason: REASONS.anxiety,
      participants: PARTICIPANTS.alone,
      goal: GOALS.stress,
    });
    const withYes = evaluateIntake({
      ...base,
      priorTherapy: PRIOR_THERAPY.yes,
    });
    const withNo = evaluateIntake({ ...base, priorTherapy: PRIOR_THERAPY.no });
    expect(withYes.scoreBreakdown).toEqual(withNo.scoreBreakdown);
  });

  it("10. a tie shows two therapists", () => {
    const result = evaluateIntake(
      answers({ reason: REASONS.anxiety, participants: PARTICIPANTS.alone }),
    );
    expect(result.showBoth).toBe(true);
    expect(result.alternativeRecommendation).not.toBeNull();
  });

  it("11. Drugo or an unclear result never shows an empty recommendation", () => {
    const other = evaluateIntake(
      answers({ reason: REASONS.other, participants: PARTICIPANTS.unsure }),
    );
    expect(other.primaryRecommendation).not.toBeNull();
    expect(other.needsManualReview).toBe(true);

    const unclear = evaluateIntake(answers({}));
    expect(unclear.primaryRecommendation).not.toBeNull();
  });
});

describe("evaluateIntake — supporting behaviour", () => {
  it("recommends roditeljsko savetovanje for parent-and-child work", () => {
    const result = evaluateIntake(
      answers({
        reason: REASONS.parenting,
        participants: PARTICIPANTS.parentChild,
      }),
    );
    expect(result.recommendedService).toBe(RECOMMENDED_SERVICES.parenting);
  });

  it("falls back to online (never empty) for Druga lokacija", () => {
    const result = evaluateIntake(
      answers({
        reason: REASONS.anxiety,
        format: WORK_FORMATS.inPerson,
        location: LOCATIONS.other,
      }),
    );
    expect(result.onlineFallback).toBe(true);
    expect(result.recommendedTherapists.length).toBe(3);
  });

  it("gives every shown therapist at most three plain-language reasons", () => {
    const result = evaluateIntake(
      answers({
        reason: REASONS.anxiety,
        participants: PARTICIPANTS.alone,
        format: WORK_FORMATS.online,
      }),
    );
    for (const match of result.recommendedTherapists) {
      expect(match.reasons.length).toBeGreaterThan(0);
      expect(match.reasons.length).toBeLessThanOrEqual(3);
      for (const sentence of match.reasons) {
        expect(sentence).not.toMatch(/\d+ ?(poena|bodova|%)/i);
      }
    }
  });

  it("inserts conditional steps only when triggered", () => {
    expect(
      activeIntakeSteps(emptyIntakeAnswers).map((step) => step.key),
    ).toEqual(["reason", "participants", "priorTherapy", "goal", "format"]);
    expect(
      activeIntakeSteps(
        answers({
          participants: PARTICIPANTS.parentChild,
          format: WORK_FORMATS.inPerson,
        }),
      ).map((step) => step.key),
    ).toEqual([
      "reason",
      "participants",
      "childAgeGroup",
      "priorTherapy",
      "goal",
      "format",
      "location",
    ]);
  });

  it("routes a minor child to Marija only (interim age rule)", () => {
    const result = evaluateIntake(
      answers({
        reason: REASONS.parenting,
        participants: PARTICIPANTS.parentChild,
        childAgeGroup: CHILD_AGE_GROUPS[0],
        format: WORK_FORMATS.online,
      }),
    );
    expect(topSlugs(result)).toEqual([MARIJA]);
  });

  it("keeps Anja and Marjan eligible when the child is 18+", () => {
    const result = evaluateIntake(
      answers({
        reason: REASONS.parenting,
        participants: PARTICIPANTS.parentChild,
        childAgeGroup: CHILD_AGE_GROUPS[3],
        format: WORK_FORMATS.online,
      }),
    );
    expect(topSlugs(result)).toContain(ANJA);
  });

  it("minor child + uzivo Nis falls back to Marija online, never empty", () => {
    const result = evaluateIntake(
      answers({
        reason: REASONS.parenting,
        participants: PARTICIPANTS.parentChild,
        childAgeGroup: CHILD_AGE_GROUPS[1],
        format: WORK_FORMATS.inPerson,
        location: LOCATIONS.nis,
      }),
    );
    expect(topSlugs(result)).toEqual([MARIJA]);
    expect(result.onlineFallback).toBe(true);
  });
});
