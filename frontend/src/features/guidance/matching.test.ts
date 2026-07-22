import { describe, expect, it } from "vitest";

import {
  ADULT_SUBJECT_AGE_BAND,
  GOALS,
  LOCATIONS,
  PARTICIPANTS,
  REASONS,
  RECOMMENDED_SERVICES,
  REQUESTER_ROLES,
  SUBJECT_AGE_BANDS,
  WORK_FORMATS,
  activeIntakeSteps,
  emptyIntakeAnswers,
  evaluateIntake,
  type IntakeAnswers,
} from "./matching";

const ANJA = "anja-stamenkovic";
const MARIJA = "marija-stamenkovic";
const MARJAN = "marjan-jankovic";

function answers(partial: Partial<IntakeAnswers> = {}): IntakeAnswers {
  return {
    ...emptyIntakeAnswers,
    requesterRole: REQUESTER_ROLES.selfAdult,
    subjectAgeBand: ADULT_SUBJECT_AGE_BAND,
    ...partial,
  };
}

function topSlugs(result: ReturnType<typeof evaluateIntake>): string[] {
  return result.recommendedTherapists.map((match) => match.therapist.slug);
}

describe("evaluateIntake", () => {
  it("recommends bračno savetovanje to a couple without exposing a score", () => {
    const result = evaluateIntake(
      answers({
        reason: REASONS.partnerRelationship,
        participants: PARTICIPANTS.partner,
        goal: GOALS.improvePartner,
        format: WORK_FORMATS.online,
      }),
    );

    expect(topSlugs(result).slice(0, 2).sort()).toEqual([ANJA, MARJAN].sort());
    expect(result.recommendedService).toBe(RECOMMENDED_SERVICES.couples);
    expect(result.showBoth).toBe(true);
    for (const match of result.recommendedTherapists) {
      expect(match.reasons).toHaveLength(3);
      expect(match.reasons.join(" ")).not.toMatch(/poena|bodova|%/i);
    }
  });

  it("keeps addiction-related support internal rather than a public question", () => {
    expect(Object.values(REASONS)).not.toContain("Zavisnost");
  });

  it("treats location and format as hard constraints", () => {
    const result = evaluateIntake(
      answers({
        reason: REASONS.depression,
        participants: PARTICIPANTS.alone,
        goal: GOALS.emotions,
        format: WORK_FORMATS.inPerson,
        location: LOCATIONS.nis,
      }),
    );

    expect(topSlugs(result)).toEqual([ANJA]);
    expect(result.onlineFallback).toBe(false);
  });

  it("uses the online fallback for an unsupported in-person location", () => {
    const result = evaluateIntake(
      answers({
        reason: REASONS.anxiety,
        participants: PARTICIPANTS.alone,
        goal: GOALS.stress,
        format: WORK_FORMATS.inPerson,
        location: LOCATIONS.other,
      }),
    );

    expect(result.onlineFallback).toBe(true);
    expect(result.recommendedTherapists.length).toBeGreaterThan(0);
  });

  it("routes a guardian request for someone under 16 to controlled team review", () => {
    const result = evaluateIntake(
      answers({
        requesterRole: REQUESTER_ROLES.guardian,
        participants: PARTICIPANTS.parentChild,
        subjectAgeBand: SUBJECT_AGE_BANDS[1],
        reason: REASONS.parenting,
        goal: GOALS.improveChild,
        format: WORK_FORMATS.online,
      }),
    );

    expect(result.controlledMinorFlow).toBe(true);
    expect(result.needsManualReview).toBe(true);
    expect(result.recommendedTherapists).toEqual([]);
    expect(result.primaryRecommendation).toBeNull();
  });

  it("allows a 16-17 guardian path to be explainable but still requires team review", () => {
    const result = evaluateIntake(
      answers({
        requesterRole: REQUESTER_ROLES.guardian,
        participants: PARTICIPANTS.parentChild,
        subjectAgeBand: SUBJECT_AGE_BANDS[2],
        reason: REASONS.parenting,
        goal: GOALS.improveChild,
        format: WORK_FORMATS.online,
      }),
    );

    expect(result.controlledMinorFlow).toBe(true);
    expect(result.needsManualReview).toBe(true);
    expect(topSlugs(result)).toContain(MARIJA);
    expect(topSlugs(result)).toContain(ANJA);
    expect(topSlugs(result)).toContain(MARJAN);
  });

  it("keeps the adolescent self path individual and controlled", () => {
    const result = evaluateIntake(
      answers({
        requesterRole: REQUESTER_ROLES.adolescent,
        participants: PARTICIPANTS.alone,
        subjectAgeBand: SUBJECT_AGE_BANDS[2],
        reason: REASONS.adolescent,
        goal: GOALS.emotions,
        format: WORK_FORMATS.online,
      }),
    );

    expect(result.recommendedService).toBe(RECOMMENDED_SERVICES.individual);
    expect(result.controlledMinorFlow).toBe(true);
    expect(result.needsManualReview).toBe(true);
  });
});

describe("activeIntakeSteps", () => {
  it("keeps each requester branch short and collects only its needed answers", () => {
    expect(
      activeIntakeSteps(emptyIntakeAnswers).map((step) => step.key),
    ).toEqual(["requesterRole", "reason", "goal", "format"]);
    expect(
      activeIntakeSteps(
        answers({ requesterRole: REQUESTER_ROLES.selfAdult }),
      ).map((step) => step.key),
    ).toEqual(["requesterRole", "reason", "participants", "goal", "format"]);
    expect(
      activeIntakeSteps(
        answers({
          requesterRole: REQUESTER_ROLES.guardian,
          participants: PARTICIPANTS.parentChild,
          subjectAgeBand: SUBJECT_AGE_BANDS[0],
        }),
      ).map((step) => step.key),
    ).toEqual(["requesterRole", "reason", "subjectAgeBand", "goal", "format"]);
    expect(
      activeIntakeSteps(
        answers({ requesterRole: REQUESTER_ROLES.adolescent }),
      ).map((step) => step.key),
    ).toEqual(["requesterRole", "reason", "goal", "format"]);
    expect(
      activeIntakeSteps(
        answers({ requesterRole: REQUESTER_ROLES.informationOnly }),
      ).map((step) => step.key),
    ).toEqual(["requesterRole"]);
  });
});
