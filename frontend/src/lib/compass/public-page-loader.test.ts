import { beforeEach, describe, expect, it, vi } from "vitest";

const { notFoundMock, permanentRedirectMock, resolvePageMock } = vi.hoisted(
  () => ({
    notFoundMock: vi.fn(() => {
      throw new Error("NEXT_NOT_FOUND");
    }),
    permanentRedirectMock: vi.fn((location: string) => {
      throw new Error(`NEXT_REDIRECT:${location}`);
    }),
    resolvePageMock: vi.fn(),
  }),
);

vi.mock("server-only", () => ({}));
vi.mock("next/navigation", () => ({
  notFound: notFoundMock,
  permanentRedirect: permanentRedirectMock,
}));
vi.mock("./public-taxonomy", () => ({
  resolvePublicTaxonomyPage: resolvePageMock,
}));

import { loadPublicTaxonomyPage } from "./public-page-loader";
import type { PublicTaxonomyPageAggregate } from "./types";

const page = { taxonomyVersion: "kompas-taxonomy-v1" } as
  PublicTaxonomyPageAggregate | never;

describe("public Compass page loader", () => {
  beforeEach(() => {
    resolvePageMock.mockReset();
    notFoundMock.mockClear();
    permanentRedirectMock.mockClear();
  });

  it("returns a canonical aggregate", async () => {
    resolvePageMock.mockResolvedValue({ kind: "term", data: page });
    await expect(loadPublicTaxonomyPage("tema", "stres")).resolves.toBe(page);
  });

  it("invokes the permanent redirect sentinel only after adapter resolution", async () => {
    resolvePageMock.mockResolvedValue({
      kind: "alias",
      location: "/kompas/tema/stres",
    });
    await expect(loadPublicTaxonomyPage("tema", "stari-stres")).rejects.toThrow(
      "NEXT_REDIRECT:/kompas/tema/stres",
    );
  });

  it("maps a missing resolution to the Next 404 sentinel", async () => {
    resolvePageMock.mockResolvedValue({
      kind: "missing",
      reason: "not_found",
    });
    await expect(loadPublicTaxonomyPage("tema", "nema")).rejects.toThrow(
      "NEXT_NOT_FOUND",
    );
  });

  it("does not catch or disguise an adapter server failure", async () => {
    const failure = new Error("backend unavailable");
    resolvePageMock.mockRejectedValue(failure);
    await expect(loadPublicTaxonomyPage("tema", "stres")).rejects.toBe(failure);
    expect(notFoundMock).not.toHaveBeenCalled();
    expect(permanentRedirectMock).not.toHaveBeenCalled();
  });
});
