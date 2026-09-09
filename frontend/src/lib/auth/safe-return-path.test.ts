import { describe, expect, it } from "vitest";

import { safeReturnPath } from "./safe-return-path";

const FALLBACK = "/api/auth/landing";

describe("where sign-in may send somebody afterwards", () => {
  it("keeps a same-site path", () => {
    expect(safeReturnPath("/radni-prostor", FALLBACK)).toBe("/radni-prostor");
    expect(safeReturnPath("/radni-prostor?tab=danas", FALLBACK)).toBe(
      "/radni-prostor?tab=danas",
    );
  });

  it("refuses anything that leaves the site", () => {
    // Each of these is a way to turn our own sign-in page into a phishing
    // hand-off — complete with a real sign-in first, which is what makes it
    // convincing.
    const attacks = [
      "https://evil.example",
      "http://evil.example",
      // Protocol-relative: browsers treat it as absolute, and it survives a
      // naive "starts with /" check.
      "//evil.example",
      "/\\evil.example",
      "\\\\evil.example",
      "javascript:alert(1)",
      "evil.example",
      // A newline would let a value smuggle a header wherever this is echoed.
      "/ok\nLocation: https://evil.example",
    ];
    for (const attack of attacks) {
      expect(safeReturnPath(attack, FALLBACK)).toBe(FALLBACK);
    }
  });

  it("falls back rather than throwing on an absent or repeated parameter", () => {
    // `?redirect_url=a&redirect_url=b` arrives as an array. A malformed return
    // path is not worth failing a sign-in over.
    expect(safeReturnPath(undefined, FALLBACK)).toBe(FALLBACK);
    expect(safeReturnPath("", FALLBACK)).toBe(FALLBACK);
    expect(safeReturnPath(["/a", "/b"], FALLBACK)).toBe(FALLBACK);
  });
});
