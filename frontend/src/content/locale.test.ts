import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { findOrganizationLocaleSettings } from "@/lib/tenant/organizations";

import { deploymentContentLocale } from "./locale";

const FRONTEND_ROOT = join(__dirname, "..", "..");

describe("deploymentContentLocale", () => {
  it("follows the deployment's organization", () => {
    const slug = process.env.DEFAULT_ORGANIZATION_SLUG ?? "psihointegritet";
    expect(deploymentContentLocale()).toBe(
      findOrganizationLocaleSettings(slug)?.defaultContentLocale,
    );
  });

  /**
   * The fix for a bug that only existed in the browser.
   *
   * This module is imported by Client Components, and `process.env` in the
   * browser is a shim holding `NEXT_PUBLIC_*` and nothing else. So the read
   * returned `undefined` there, the `?? "psihointegritet"` fallback took over,
   * and an English deployment hydrated Serbian content over its own English
   * server render.
   *
   * Nothing already here could see it: on the server — where every test runs —
   * the variable is set and the code is correct. Only the bundle was wrong.
   * Listing the variable under `env` in next.config.ts makes Next inline it at
   * build time, so both sides read the same slug.
   *
   * Asserting on a config file is unusual, but that line is the whole fix, and
   * deleting it is silent everywhere else.
   */
  it("has its env var inlined into the client bundle", () => {
    const config = readFileSync(join(FRONTEND_ROOT, "next.config.ts"), "utf8");
    const env = config.match(/env:\s*\{([\s\S]*?)\}/);

    expect(env?.[1], "next.config.ts has no env block").toBeDefined();
    expect(env?.[1]).toContain("DEFAULT_ORGANIZATION_SLUG");
  });
});
