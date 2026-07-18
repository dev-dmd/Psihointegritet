import { describe, expect, it } from "vitest";

import {
  MONTHLY_SESSIONS,
  NEEDS,
  SCHEDULE_MODELS,
  TEAM_SIZES,
  companyPlans,
  recommendCompanyPlan,
  type CompanyAnswers,
} from "./company";

function answers(partial: Partial<CompanyAnswers>): CompanyAnswers {
  return {
    needs: [],
    teamSize: null,
    scheduleModel: null,
    funding: null,
    period: null,
    monthlySessions: null,
    delivery: null,
    ...partial,
  };
}

describe("recommendCompanyPlan", () => {
  it("recommends the custom program when workshops are the focus", () => {
    expect(
      recommendCompanyPlan(
        answers({ needs: [NEEDS.workshops], teamSize: TEAM_SIZES.s3_9 }),
      ).slug,
    ).toBe("company-custom");
    expect(
      recommendCompanyPlan(
        answers({
          scheduleModel: SCHEDULE_MODELS.workshops,
          teamSize: TEAM_SIZES.s10_30,
        }),
      ).slug,
    ).toBe("company-custom");
  });

  it("recommends the individual voucher for 1–2 people", () => {
    expect(
      recommendCompanyPlan(answers({ teamSize: TEAM_SIZES.s1_2 })).slug,
    ).toBe("individual-voucher");
  });

  it("recommends reserved capacity when that model is chosen", () => {
    expect(
      recommendCompanyPlan(
        answers({
          teamSize: TEAM_SIZES.s10_30,
          scheduleModel: SCHEDULE_MODELS.reserved,
        }),
      ).slug,
    ).toBe("reserved-capacity");
  });

  it("recommends company partner for the hybrid model", () => {
    expect(
      recommendCompanyPlan(
        answers({
          teamSize: TEAM_SIZES.s10_30,
          scheduleModel: SCHEDULE_MODELS.hybrid,
        }),
      ).slug,
    ).toBe("company-partner");
  });

  it("recommends Team Flex 4 for a small team with standard usage", () => {
    expect(
      recommendCompanyPlan(
        answers({
          teamSize: TEAM_SIZES.s3_9,
          scheduleModel: SCHEDULE_MODELS.flexible,
        }),
      ).slug,
    ).toBe("team-flex-4");
  });

  it("upgrades a small team to Team Flex 8 when monthly usage is higher", () => {
    expect(
      recommendCompanyPlan(
        answers({
          teamSize: TEAM_SIZES.s3_9,
          scheduleModel: SCHEDULE_MODELS.flexible,
          monthlySessions: MONTHLY_SESSIONS.s8,
        }),
      ).slug,
    ).toBe("team-flex-8");
  });

  it("recommends Company Flex 10 for 10–30 people", () => {
    expect(
      recommendCompanyPlan(
        answers({
          teamSize: TEAM_SIZES.s10_30,
          scheduleModel: SCHEDULE_MODELS.flexible,
        }),
      ).slug,
    ).toBe("company-flex-10");
  });

  it("never auto-prices teams over 30 — routes them to the custom program", () => {
    for (const size of [
      TEAM_SIZES.s31_100,
      TEAM_SIZES.s100plus,
      TEAM_SIZES.unknown,
    ]) {
      const plan = recommendCompanyPlan(
        answers({ teamSize: size, scheduleModel: SCHEDULE_MODELS.flexible }),
      );
      expect(plan.slug).toBe("company-custom");
      expect(plan.quoteOnly).toBe(true);
    }
  });

  it("only returns plans that exist in the catalog", () => {
    const known = new Set(Object.keys(companyPlans));
    const plan = recommendCompanyPlan(
      answers({
        teamSize: TEAM_SIZES.s3_9,
        scheduleModel: SCHEDULE_MODELS.flexible,
      }),
    );
    expect(known).toContain(plan.slug);
  });
});
