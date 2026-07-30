import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import {
  isAllowedHref,
  richDocText,
  richDocTextLength,
  validateRichDoc,
  type RichDoc,
  type RichDocValidationLimits,
} from "./rich-doc";

/**
 * Parity loader (CG-B7, deferred by D-047, closed 2026-07-30 per D-050):
 * reads the SAME physical fixture file as
 * backend/tests/unit/test_rich_doc_fixtures.py. TS and Python are separate
 * implementations of one governed contract (ADR-017); a diverging result for
 * any caseId fails CI on whichever side drifted.
 */

interface HrefCheckCase {
  caseId: string;
  description: string;
  action: "href-check";
  input: { href: string };
  expectedAllowed: boolean;
}

interface TextExtractCase {
  caseId: string;
  description: string;
  action: "text-extract";
  input: { doc: RichDoc };
  expectedText: string;
  expectedLength: number;
}

interface ExpectedFinding {
  ruleId: string;
  severity: "info" | "warning" | "error";
  field: string;
  message: string;
  recommendation: string;
}

interface ValidateCheckCase {
  caseId: string;
  description: string;
  action: "validate-check";
  input: { doc: RichDoc; limits: RichDocValidationLimits };
  expectedFindings: ExpectedFinding[];
}

type FixtureCase = HrefCheckCase | TextExtractCase | ValidateCheckCase;

interface FixtureFile {
  fixtureSchemaVersion: string;
  cases: FixtureCase[];
}

const fixturePath = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../../../../contracts/fixtures/richdoc.v1.json",
);

// Repo-internal trusted file; the cast is the boundary adapter for JSON.parse.
const fixtures = JSON.parse(readFileSync(fixturePath, "utf-8")) as FixtureFile;

describe(`richdoc parity fixtures (schema v${fixtures.fixtureSchemaVersion})`, () => {
  it("loaded a non-empty case list", () => {
    expect(fixtures.cases.length).toBeGreaterThan(0);
  });

  for (const fixtureCase of fixtures.cases) {
    const { caseId, description, action } = fixtureCase;
    const name = `${caseId}: ${description}`;

    if (action === "href-check") {
      it(name, () => {
        expect(isAllowedHref(fixtureCase.input.href)).toBe(
          fixtureCase.expectedAllowed,
        );
      });
      continue;
    }

    if (action === "text-extract") {
      it(name, () => {
        const { doc } = fixtureCase.input;
        expect(richDocText(doc)).toBe(fixtureCase.expectedText);
        expect(richDocTextLength(doc)).toBe(fixtureCase.expectedLength);
      });
      continue;
    }

    if (action === "validate-check") {
      it(name, () => {
        const { doc, limits } = fixtureCase.input;
        const findings = validateRichDoc(doc, limits);
        expect(findings).toEqual(fixtureCase.expectedFindings);
      });
      continue;
    }

    it(name, () => {
      throw new Error(`Unknown fixture action: ${action as string}`);
    });
  }
});
