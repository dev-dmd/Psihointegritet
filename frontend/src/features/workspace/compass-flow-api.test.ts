import { describe, expect, it, vi } from "vitest";

import { JsonRequestError } from "@/lib/api/request-json";

import { fetchCompassFlows } from "./compass-flow-api";

/**
 * A refused request must use controlled frontend copy. Backend prose and
 * technical identifiers are never a user-facing message.
 */
function problemResponse(status: number, body: unknown): Response {
  return Response.json(body, { status });
}

describe("compass flow admin client", () => {
  it("does not surface backend prose or a correlation id", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        problemResponse(403, {
          type: "about:blank",
          title:
            "Vaša prijava je ispravna, ali ovaj nalog nije upisan u bazu koju server koristi.",
          status: 403,
          code: "http_error",
          correlationId: "abc123",
        }),
      ),
    );

    const error = await fetchCompassFlows().catch((reason: unknown) => reason);
    expect(error).toBeInstanceOf(JsonRequestError);
    expect(error).toMatchObject({
      status: 403,
      code: "http_error",
      message: "Request failed",
    });
    expect(JSON.stringify(error)).not.toMatch(/Vaša prijava|abc123/);
    vi.unstubAllGlobals();
  });

  it("falls back to the status when the body is not a problem envelope", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(problemResponse(500, "<html>proxy error</html>")),
    );

    await expect(fetchCompassFlows()).rejects.toMatchObject({
      status: 500,
      message: "Request failed",
    });
    vi.unstubAllGlobals();
  });
});
