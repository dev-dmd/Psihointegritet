import { describe, expect, it, vi } from "vitest";

import { fetchCompassFlows } from "./compass-flow-api";

/**
 * A refused Kompas request must reach the panel with the reason the backend
 * gave. This client originally read `detail.message`, a shape this API never
 * sends, so every explained refusal arrived as "Kompas zahtev nije uspeo
 * (403)" and an operator could not tell a missing account from a missing role.
 */
function problemResponse(status: number, body: unknown): Response {
  return {
    ok: false,
    status,
    json: async () => body,
  } as unknown as Response;
}

describe("compass flow admin client", () => {
  it("surfaces the backend's explanation instead of the bare status", async () => {
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

    await expect(fetchCompassFlows()).rejects.toThrow(
      /nije upisan u bazu koju server koristi/,
    );
    vi.unstubAllGlobals();
  });

  it("falls back to the status when the body is not a problem envelope", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(problemResponse(500, "<html>proxy error</html>")),
    );

    await expect(fetchCompassFlows()).rejects.toThrow(
      "Kompas zahtev nije uspeo (500).",
    );
    vi.unstubAllGlobals();
  });
});
