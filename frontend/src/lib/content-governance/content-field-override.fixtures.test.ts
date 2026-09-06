import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import {
  hiddenContentFieldPaths,
  normalizeContentFieldOverride,
  resolveContentField,
} from "./content-field-override";

const fixturePath = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../../../../contracts/fixtures/content-field-override.v1.json",
);

type Fixture = {
  hideableFieldPaths: string[];
  cases: Array<{
    name: string;
    inputKind?: "missing";
    input?: unknown;
    mode: string;
    valid: boolean;
  }>;
};

const fixture = JSON.parse(readFileSync(fixturePath, "utf-8")) as Fixture;

describe("three-state content field override", () => {
  it.each(fixture.cases)("normalizes $name", (testCase) => {
    const raw = testCase.inputKind === "missing" ? undefined : testCase.input;
    const result = normalizeContentFieldOverride(raw);

    expect(result.mode).toBe(testCase.mode);
    expect(result.valid).toBe(testCase.valid);
  });

  it("keeps the field-level hidden whitelist in the shared contract", () => {
    expect([...hiddenContentFieldPaths].sort()).toEqual(
      fixture.hideableFieldPaths,
    );
    expect(hiddenContentFieldPaths).not.toContain("service_detail.hero.title");
    expect(hiddenContentFieldPaths).not.toContain("service_detail.cta.primary");
  });

  it("resolves inherit/custom/hidden without conflating hidden with fallback", () => {
    expect(resolveContentField(undefined, "Fallback")).toEqual({
      mode: "inherit",
      value: "Fallback",
    });
    expect(
      resolveContentField({ mode: "custom", value: "Tenant" }, "Fallback"),
    ).toEqual({ mode: "custom", value: "Tenant" });
    expect(resolveContentField({ mode: "hidden" }, "Fallback")).toEqual({
      mode: "hidden",
    });
  });
});
