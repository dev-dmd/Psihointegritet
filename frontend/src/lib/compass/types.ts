import type { components } from "@/types/api.generated";

export const compassRouteKinds = ["oblast", "tema"] as const;

export type CompassRouteKind = (typeof compassRouteKinds)[number];

export type CompassCanonicalPath =
  `/kompas/oblast/${string}` | `/kompas/tema/${string}`;

export type PublicTaxonomyTerm = components["schemas"]["PublicTaxonomyTermOut"];

export type PublicTaxonomyCollection =
  components["schemas"]["PublicTaxonomyOut"];

export type RoutablePublicTaxonomyTerm = Omit<
  PublicTaxonomyTerm,
  "canonicalPath"
> & {
  canonicalPath: CompassCanonicalPath;
};

export type PublicCompassContentCard =
  components["schemas"]["CompassContentCardOut"];

export type PublicTaxonomyPageAggregate =
  components["schemas"]["CompassTaxonomyPageOut"];

export type CompassRecommendationRequest =
  components["schemas"]["CompassRecommendationRequest"];

export type CompassRecommendationResponse =
  components["schemas"]["CompassRecommendationOut"];

export type CompassHandoffCandidate =
  components["schemas"]["CompassHandoffCandidateOut"];

export type MissingTaxonomyReason =
  "not_found" | "invalid_slug" | "invalid_redirect";

export type PublicTaxonomyResolution<T> =
  | { kind: "term"; data: T }
  | { kind: "alias"; location: CompassCanonicalPath }
  | { kind: "missing"; reason: MissingTaxonomyReason };

export type PublicCompassApiErrorCode =
  "network" | "server" | "unexpected_response" | "invalid_response";

export class PublicCompassApiError extends Error {
  readonly code: PublicCompassApiErrorCode;
  readonly status: number | undefined;

  constructor(
    message: string,
    options: {
      code: PublicCompassApiErrorCode;
      status?: number;
      cause?: unknown;
    },
  ) {
    super(message, { cause: options.cause });
    this.name = "PublicCompassApiError";
    this.code = options.code;
    this.status = options.status;
  }
}
