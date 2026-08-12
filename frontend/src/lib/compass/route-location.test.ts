import { describe, expect, it } from "vitest";

import {
  parseCompassCanonicalPath,
  validateCompassRedirectLocation,
} from "./route-location";

describe("Compass canonical route validation", () => {
  it.each([
    ["oblast", "/kompas/oblast/stres-i-preopterecenost"],
    ["tema", "/kompas/tema/sindrom-sagorevanja"],
  ] as const)("accepts an exact internal %s route", (routeKind, path) => {
    expect(parseCompassCanonicalPath(path, routeKind)).toBe(path);
  });

  it.each([
    "https://evil.test/kompas/tema/stres",
    "//evil.test/kompas/tema/stres",
    "/kompas/tema/stres?izbor=1",
    "/kompas/tema/stres#detalji",
    "/kompas/tema/stres/dodatno",
    "/kompas/tema/stres/",
    "/kompas/oblast/stres",
    "/kompas/tema/Stres",
    "/kompas/tema/stres%2Fdodatno",
  ])("rejects unsafe or wrong-kind Location %s", (location) => {
    expect(parseCompassCanonicalPath(location, "tema")).toBeNull();
  });

  it("rejects a redirect back to the current route", () => {
    expect(
      validateCompassRedirectLocation(
        "/kompas/tema/stres",
        "tema",
        "/kompas/tema/stres",
      ),
    ).toBeNull();
  });
});
