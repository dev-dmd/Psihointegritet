import { requestJson } from "@/lib/api/request-json";
import {
  parsePublicCompassRecommendation,
  publicCompassRecommendationSchema,
} from "@/lib/compass/contract";
import type {
  CompassRecommendationRequest,
  CompassRecommendationResponse,
} from "@/lib/compass/types";

/** Same-origin browser adapter; selections never enter a URL or query string. */
export async function fetchCompassRecommendations(
  request: CompassRecommendationRequest,
  signal?: AbortSignal,
): Promise<CompassRecommendationResponse> {
  const parsed = await requestJson(
    "/api/compass/recommendations",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
      cache: "no-store",
      ...(signal ? { signal } : {}),
    },
    publicCompassRecommendationSchema,
  );
  // The parser reconstructs the generated OpenAPI boundary. Zod's optional
  // property inference includes explicit `undefined`, which JSON cannot carry
  // and `exactOptionalPropertyTypes` deliberately distinguishes from absence.
  return parsePublicCompassRecommendation(parsed);
}
