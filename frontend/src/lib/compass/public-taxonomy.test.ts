import { beforeEach, describe, expect, it, vi } from "vitest";

const { fetchMock } = vi.hoisted(() => ({ fetchMock: vi.fn() }));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/validation/env", () => ({
  serverEnv: {
    NEXT_PUBLIC_API_URL: "https://api.example.test",
  },
}));

import {
  getPublicTaxonomy,
  resolvePublicTaxonomyPage,
} from "./public-taxonomy";
import { PublicCompassApiError } from "./types";

const area = {
  termId: "00000000-0000-4000-8000-000000000001",
  axis: "topic_group",
  stableId: "area-stress",
  canonicalPath: "/kompas/oblast/stres",
  publicLabel: "Stres",
  shortDescription: "Opis oblasti.",
  parentStableId: null,
  journeyIntent: null,
  sortOrder: 10,
  iconKey: null,
  assetId: null,
  searchTerms: [],
  relatedStableIds: [],
};

const pageAggregate = {
  taxonomyVersion: "kompas-taxonomy-v1",
  locale: "sr-Latn",
  term: area,
  parent: null,
  children: [],
  relatedTerms: [],
  contentCards: [],
};

function response(status: number, body?: unknown, location?: string): Response {
  return new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: {
      ...(body === undefined ? {} : { "content-type": "application/json" }),
      ...(location ? { location } : {}),
    },
  });
}

describe("public Compass server adapter", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  it("returns a validated canonical page and requests redirects manually", async () => {
    fetchMock.mockResolvedValue(response(200, pageAggregate));

    await expect(resolvePublicTaxonomyPage("oblast", "stres")).resolves.toEqual(
      { kind: "term", data: pageAggregate },
    );

    const [url, options] = fetchMock.mock.calls[0] as [URL, RequestInit];
    expect(url.pathname).toBe(
      "/api/v1/public/compass/taxonomy/pages/oblast/stres",
    );
    expect(url.searchParams.get("locale")).toBe("sr-Latn");
    expect(options.redirect).toBe("manual");
    expect(options.next).toMatchObject({
      revalidate: 300,
      tags: expect.arrayContaining([
        "compass:public:sr-Latn",
        "compass:taxonomy:page:sr-Latn:oblast:stres",
      ]),
    });
  });

  it("separates a valid alias from a missing route", async () => {
    fetchMock.mockResolvedValueOnce(
      response(308, undefined, "/kompas/oblast/stres"),
    );
    await expect(
      resolvePublicTaxonomyPage("oblast", "stari-stres"),
    ).resolves.toEqual({
      kind: "alias",
      location: "/kompas/oblast/stres",
    });

    fetchMock.mockResolvedValueOnce(response(404));
    await expect(
      resolvePublicTaxonomyPage("oblast", "ne-postoji"),
    ).resolves.toEqual({ kind: "missing", reason: "not_found" });
  });

  it.each([
    "https://evil.test/kompas/oblast/stres",
    "//evil.test/kompas/oblast/stres",
    "/kompas/oblast/stres?from=alias",
    "/kompas/tema/stres",
    "/kompas/oblast/stari-stres",
  ])(
    "turns an invalid 308 Location into an invalid missing result",
    async (location) => {
      fetchMock.mockResolvedValue(response(308, undefined, location));
      await expect(
        resolvePublicTaxonomyPage("oblast", "stari-stres"),
      ).resolves.toEqual({ kind: "missing", reason: "invalid_redirect" });
    },
  );

  it("does not fetch a malformed slug", async () => {
    await expect(
      resolvePublicTaxonomyPage("tema", "Nije-dobar"),
    ).resolves.toEqual({ kind: "missing", reason: "invalid_slug" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rethrows backend and network failures instead of producing a 404", async () => {
    fetchMock.mockResolvedValueOnce(response(503));
    await expect(
      resolvePublicTaxonomyPage("oblast", "stres"),
    ).rejects.toMatchObject({
      code: "server",
      status: 503,
    } satisfies Partial<PublicCompassApiError>);

    fetchMock.mockRejectedValueOnce(new TypeError("network down"));
    await expect(
      resolvePublicTaxonomyPage("oblast", "stres"),
    ).rejects.toMatchObject({
      code: "network",
    } satisfies Partial<PublicCompassApiError>);
  });

  it("rejects a malformed 200 aggregate as a server contract failure", async () => {
    fetchMock.mockResolvedValue(response(200, { terms: [] }));
    await expect(
      resolvePublicTaxonomyPage("oblast", "stres"),
    ).rejects.toMatchObject({
      code: "invalid_response",
      status: 200,
    } satisfies Partial<PublicCompassApiError>);
  });

  it("loads and validates the public taxonomy collection", async () => {
    const collection = {
      taxonomyVersion: "kompas-taxonomy-v1",
      locale: "sr-Latn",
      terms: [area],
    };
    fetchMock.mockResolvedValue(response(200, collection));
    await expect(getPublicTaxonomy()).resolves.toEqual(collection);
  });
});
