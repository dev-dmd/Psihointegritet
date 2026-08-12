import { describe, expect, it } from "vitest";

import { publicTermsForRouteKind } from "./taxonomy-view";
import type { PublicTaxonomyCollection } from "./types";

function area(stableId: string, canonicalPath: `/kompas/oblast/${string}`) {
  return {
    termId: `00000000-0000-4000-8000-0000000000${stableId === "area-a" ? "01" : "02"}`,
    axis: "topic_group" as const,
    stableId,
    canonicalPath,
    publicLabel: "Ista labela",
    shortDescription: "Opis.",
    parentStableId: null,
    journeyIntent: null,
    sortOrder: 10,
    iconKey: null,
    assetId: null,
    searchTerms: [],
    relatedStableIds: [],
  };
}

describe("public Compass taxonomy projection", () => {
  it("uses stableId as the final deterministic list tie-break", () => {
    const collection: PublicTaxonomyCollection = {
      taxonomyVersion: "kompas-taxonomy-v1",
      locale: "sr-Latn",
      terms: [
        area("area-b", "/kompas/oblast/oblast-b"),
        area("area-a", "/kompas/oblast/oblast-a"),
      ],
    };

    expect(
      publicTermsForRouteKind(collection, "oblast").map(
        (term) => term.stableId,
      ),
    ).toEqual(["area-a", "area-b"]);
  });
});
