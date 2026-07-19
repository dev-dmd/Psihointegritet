import { describe, expect, it } from "vitest";

import {
  COMPANY_GOALS,
  COMPANY_PRICE_ON_REQUEST,
  COMPANY_SIZES,
  companyModels,
  companySteps,
  recommendCompanyModel,
  type CompanyAnswers,
} from "./company";

function answers(partial: Partial<CompanyAnswers>): CompanyAnswers {
  return {
    employees: null,
    goals: [],
    topics: [],
    format: null,
    ...partial,
  };
}

describe("recommendCompanyModel", () => {
  // Mandatory case 12: company 20–50 + workshop -> team workshop, price on request.
  it("maps a 20-50 company asking for a workshop to the team workshop", () => {
    const model = recommendCompanyModel(
      answers({
        employees: COMPANY_SIZES.s20_50,
        goals: [COMPANY_GOALS.workshop],
      }),
    );
    expect(model.name).toBe("Interaktivna radionica za tim");
    expect(COMPANY_PRICE_ON_REQUEST).toBe("Cena po ponudi");
  });

  // Mandatory case 13: >200 employees -> custom program with mandatory contact.
  it("routes companies over 200 employees to the custom program with contact", () => {
    const model = recommendCompanyModel(
      answers({
        employees: COMPANY_SIZES.over200,
        goals: [COMPANY_GOALS.lecture],
      }),
    );
    expect(model.name).toBe("Program po meri");
    expect(model.contactRequired).toBe(true);
  });

  it("routes three or more distinct goals to the custom program", () => {
    const model = recommendCompanyModel(
      answers({
        employees: COMPANY_SIZES.upTo20,
        goals: [
          COMPANY_GOALS.lecture,
          COMPANY_GOALS.workshop,
          COMPANY_GOALS.needsAssessment,
        ],
      }),
    );
    expect(model.name).toBe("Program po meri");
    expect(model.contactRequired).toBe(true);
  });

  it("maps long-term plus individual support to the employee support program", () => {
    const model = recommendCompanyModel(
      answers({
        employees: COMPANY_SIZES.s50_200,
        goals: [COMPANY_GOALS.longTerm, COMPANY_GOALS.individualSupport],
      }),
    );
    expect(model.name).toBe("Program podrške zaposlenima");
  });

  it("maps a needs assessment to the introductory assessment", () => {
    const model = recommendCompanyModel(
      answers({
        employees: COMPANY_SIZES.upTo20,
        goals: [COMPANY_GOALS.needsAssessment],
      }),
    );
    expect(model.name).toBe("Uvodna procena potreba organizacije");
  });

  it("maps individual support alone to the flexible fund", () => {
    const model = recommendCompanyModel(
      answers({
        employees: COMPANY_SIZES.s20_50,
        goals: [COMPANY_GOALS.individualSupport],
      }),
    );
    expect(model.name).toBe("Fleksibilni fond individualnih termina");
  });

  it("maps a lecture alone to the custom lecture or webinar", () => {
    const model = recommendCompanyModel(
      answers({
        employees: COMPANY_SIZES.upTo20,
        goals: [COMPANY_GOALS.lecture],
      }),
    );
    expect(model.name).toBe("Predavanje ili vebinar po meri");
  });

  it("falls back to the custom program when no goal is selected", () => {
    const model = recommendCompanyModel(
      answers({ employees: COMPANY_SIZES.upTo20 }),
    );
    expect(model.name).toBe("Program po meri");
  });

  it("ignores topics when picking the model", () => {
    const base = answers({
      employees: COMPANY_SIZES.s20_50,
      goals: [COMPANY_GOALS.workshop],
    });
    const withTopics = { ...base, topics: ["Burnout", "Stres"] };
    expect(recommendCompanyModel(withTopics).slug).toBe(
      recommendCompanyModel(base).slug,
    );
  });

  it("only returns models that exist in the catalog", () => {
    const known = new Set(Object.keys(companyModels));
    const combos: CompanyAnswers[] = [
      answers({}),
      answers({ employees: COMPANY_SIZES.over200 }),
      answers({ goals: Object.values(COMPANY_GOALS).slice(0, 2) }),
      answers({ goals: [COMPANY_GOALS.workshop] }),
    ];
    for (const combo of combos) {
      expect(known).toContain(recommendCompanyModel(combo).slug);
    }
  });

  it("keeps the four-step question flow in the agreed order", () => {
    expect(companySteps.map((step) => step.key)).toEqual([
      "employees",
      "goals",
      "topics",
      "format",
    ]);
    expect(companySteps[1]?.multi).toBe(true);
    expect(companySteps[2]?.multi).toBe(true);
  });
});
