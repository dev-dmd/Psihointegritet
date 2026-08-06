import { describe, expect, it } from "vitest";

import type { CompassSelection } from "./selection";
import {
  buildCompassRecommendationRequest,
  COMPASS_RULE_VERSION,
} from "./recommendation";

const partialSelection: CompassSelection = {
  topicGroupId: "stress-overload",
  topicIds: ["burnout", "nesanica"],
  audienceIds: [],
  goalIds: ["understand"],
  journeyIntent: null,
};

describe("Compass recommendation request", () => {
  it("builds a versioned POST body from partial local state", () => {
    expect(
      buildCompassRecommendationRequest(partialSelection, "kompas-taxonomy-v1"),
    ).toEqual({
      taxonomyVersion: "kompas-taxonomy-v1",
      ruleVersion: COMPASS_RULE_VERSION,
      locale: "sr-Latn",
      topicGroupId: "stress-overload",
      topicIds: ["burnout", "nesanica"],
      audienceId: null,
      goalIds: ["understand"],
      journeyIntent: null,
      limit: 12,
      offset: 0,
    });
  });

  it("rejects state that bypasses the max-two topic invariant", () => {
    expect(() =>
      buildCompassRecommendationRequest(
        {
          ...partialSelection,
          topicIds: ["one", "two", "three"],
        },
        "kompas-taxonomy-v1",
      ),
    ).toThrow(/at most two topics/i);
  });

  it("contains no URL, free text, contact, therapist or score field", () => {
    const serialized = JSON.stringify(
      buildCompassRecommendationRequest(partialSelection, "kompas-taxonomy-v1"),
    );
    expect(serialized).not.toMatch(
      /freeText|contact|therapist|score|query|href|url/i,
    );
  });
});
