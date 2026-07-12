import { describe, expect, it } from "vitest";

import { isApiProblem } from "./api-problem";

describe("isApiProblem", () => {
  it("accepts a valid problem envelope", () => {
    expect(
      isApiProblem({
        type: "about:blank",
        title: "Not Found",
        status: 404,
        code: "not_found",
        correlationId: "abc-123",
      }),
    ).toBe(true);
  });

  it("rejects arbitrary error payloads", () => {
    expect(isApiProblem({ message: "boom" })).toBe(false);
    expect(isApiProblem(null)).toBe(false);
    expect(isApiProblem("error")).toBe(false);
  });
});
