import { beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

import { JsonRequestError, requestJson } from "./request-json";

const fetchMock = vi.fn();

describe("requestJson", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  it("preserves the safe fields from an application/problem+json error", async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          type: "about:blank",
          title: "Izbor nije validan.",
          status: 422,
          code: "validation_error",
          detail: "Proverite označeno polje.",
          correlationId: "correlation-1",
          fieldPath: "topicIds",
          fieldErrors: { topicIds: ["Najviše dve teme."] },
          internalDebugValue: "must not cross the adapter boundary",
        }),
        {
          status: 422,
          headers: {
            "content-type": "application/problem+json; charset=utf-8",
          },
        },
      ),
    );

    const error = await requestJson(
      "/api/compass/recommendations",
      { method: "POST" },
      z.object({ ok: z.boolean() }),
    ).catch((reason: unknown) => reason);

    expect(error).toBeInstanceOf(JsonRequestError);
    expect(error).toMatchObject({
      status: 422,
      message: "Izbor nije validan. Proverite označeno polje.",
      code: "validation_error",
      fieldPath: "topicIds",
      fieldErrors: { topicIds: ["Najviše dve teme."] },
    });
    expect(error).not.toHaveProperty("internalDebugValue");
  });

  it("keeps supporting the narrow same-origin error envelope", async () => {
    fetchMock.mockResolvedValue(
      Response.json({ error: "Servis nije dostupan." }, { status: 503 }),
    );

    await expect(
      requestJson("/api/example", {}, z.object({ ok: z.boolean() })),
    ).rejects.toMatchObject({
      status: 503,
      message: "Servis nije dostupan.",
    });
  });
});
