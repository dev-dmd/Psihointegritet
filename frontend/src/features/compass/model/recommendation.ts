import type { CompassRecommendationRequest } from "@/lib/compass/types";

import {
  COMPASS_MAX_TOPIC_SELECTIONS,
  type CompassSelection,
} from "./selection";

export const COMPASS_RULE_VERSION = "compass-rules-v1";
export const COMPASS_PUBLIC_LOCALE = "sr-Latn";
export const COMPASS_DEFAULT_RESULT_LIMIT = 12;

export function buildCompassRecommendationRequest(
  selection: CompassSelection,
  taxonomyVersion: string,
  options: { limit?: number; offset?: number } = {},
): CompassRecommendationRequest {
  if (selection.topicIds.length > COMPASS_MAX_TOPIC_SELECTIONS) {
    throw new RangeError("Kompas selection supports at most two topics.");
  }
  if (selection.audienceIds.length > 1) {
    throw new RangeError("Kompas selection supports one audience.");
  }
  if (selection.goalIds.length > 2) {
    throw new RangeError("Kompas recommendation supports at most two goals.");
  }

  return {
    taxonomyVersion,
    ruleVersion: COMPASS_RULE_VERSION,
    locale: COMPASS_PUBLIC_LOCALE,
    topicGroupId: selection.topicGroupId,
    topicIds: [...selection.topicIds],
    audienceId: selection.audienceIds[0] ?? null,
    goalIds: [...selection.goalIds],
    journeyIntent: selection.journeyIntent,
    limit: options.limit ?? COMPASS_DEFAULT_RESULT_LIMIT,
    offset: options.offset ?? 0,
  };
}
