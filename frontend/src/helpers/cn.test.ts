import { describe, expect, it } from "vitest";

import { cn } from "./cn";

describe("cn", () => {
  it("merges conditional class names", () => {
    expect(cn("a", false && "b", "c")).toBe("a c");
  });

  it("resolves tailwind conflicts in favor of the last class", () => {
    expect(cn("p-2", "p-4")).toBe("p-4");
  });
});
