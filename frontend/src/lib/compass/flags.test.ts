import { afterEach, describe, expect, it, vi } from "vitest";

import { visibleHeaderNavLinks } from "@/content/site-navigation";

import { isCompassPublicEnabled } from "./flags";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("public Kompas activation (D-059)", () => {
  it("stays off unless the flag is the exact string true", () => {
    vi.stubEnv("NEXT_PUBLIC_COMPASS_ENABLED", undefined);
    expect(isCompassPublicEnabled()).toBe(false);

    // A misconfigured value must not read as "on" — an environment without a
    // published flow would otherwise expose a Kompas that cannot answer.
    for (const value of ["", "false", "1", "TRUE", "yes"]) {
      vi.stubEnv("NEXT_PUBLIC_COMPASS_ENABLED", value);
      expect(isCompassPublicEnabled()).toBe(false);
    }

    vi.stubEnv("NEXT_PUBLIC_COMPASS_ENABLED", "true");
    expect(isCompassPublicEnabled()).toBe(true);
  });

  it("drops the header link when Kompas is off and keeps every other one", () => {
    const label = (key: string) => key;
    const enabled = visibleHeaderNavLinks(true, label);
    const disabled = visibleHeaderNavLinks(false, label);

    expect(enabled.some((link) => link.href === "/kompas")).toBe(true);
    expect(disabled.some((link) => link.href === "/kompas")).toBe(false);
    expect(disabled).toHaveLength(enabled.length - 1);
  });
});
