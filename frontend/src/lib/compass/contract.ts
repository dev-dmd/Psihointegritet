import { z } from "zod";

import type {
  CompassRecommendationResponse,
  PublicCompassContentCard,
  PublicTaxonomyCollection,
  PublicTaxonomyPageAggregate,
  PublicTaxonomyTerm,
} from "./types";

const taxonomyAxisSchema = z.enum([
  "topic_group",
  "topic",
  "audience",
  "content_goal",
  "support_area",
  "journey_intent",
  "content_format",
  "access_level",
]);

export const publicTaxonomyTermSchema = z.object({
  termId: z.string().uuid(),
  axis: taxonomyAxisSchema,
  stableId: z.string().min(1),
  canonicalPath: z.string().nullable(),
  publicLabel: z.string().min(1),
  shortDescription: z.string(),
  parentStableId: z.string().nullable().optional(),
  journeyIntent: z.string().nullable().optional(),
  sortOrder: z.number().int(),
  iconKey: z.string().nullable().optional(),
  assetId: z.string().nullable().optional(),
  searchTerms: z.array(z.string()),
  relatedStableIds: z.array(z.string()),
});

export const publicTaxonomyCollectionSchema = z.object({
  taxonomyVersion: z.string().min(1),
  locale: z.string().min(2),
  terms: z.array(publicTaxonomyTermSchema),
});

const contentTypeSchema = z.enum([
  "static_page",
  "service",
  "therapist",
  "program",
  "company_plan",
  "package_offer",
]);

const contentTemplateSchema = z.enum([
  "service_detail",
  "therapist_profile",
  "support_area",
  "audience_page",
  "program_detail",
  "company_page",
  "pricing_page",
  "static_information",
  "legal_page",
]);

const publicContentSeoSchema = z.object({
  title: z.string(),
  description: z.string(),
  ogImageAssetId: z.string().nullable().optional(),
});

const publicCompassContentCardSchema = z
  .object({
    itemKey: z.string().min(1),
    contentType: contentTypeSchema,
    slug: z.string().min(1),
    locale: z.string().min(2),
    template: contentTemplateSchema,
    seo: publicContentSeoSchema,
    contentFormat: z.enum([
      "article",
      "pdf",
      "video",
      "audio",
      "worksheet",
      "program",
    ]),
    accessLevel: z.literal("public"),
    publishedAt: z.string().min(1),
  })
  .strict()
  .refine((card) => card.contentType !== "therapist", {
    message: "Kompas public contract does not expose therapist cards.",
    path: ["contentType"],
  });

const publicTaxonomyPageAggregateSchema = z.object({
  taxonomyVersion: z.string().min(1),
  locale: z.string().min(2),
  term: publicTaxonomyTermSchema,
  parent: publicTaxonomyTermSchema.nullable(),
  children: z.array(publicTaxonomyTermSchema),
  relatedTerms: z.array(publicTaxonomyTermSchema),
  contentCards: z.array(publicCompassContentCardSchema),
});

const journeyIntentSchema = z.enum(["explore", "professional_support", "both"]);

const normalizedSelectionSchema = z.object({
  topicGroupId: z.string().nullable().optional(),
  topicIds: z.array(z.string()).max(2),
  audienceId: z.string().nullable().optional(),
  goalIds: z.array(z.string()).max(2),
  journeyIntent: journeyIntentSchema.nullable().optional(),
});

const handoffCandidateSchema = z.object({
  schemaVersion: z.literal("1"),
  taxonomyVersion: z.string().min(1),
  topicGroupId: z.string().nullable().optional(),
  topicIds: z.array(z.string()).max(2),
  audienceIds: z.array(z.string()).max(1),
  journeyIntent: journeyIntentSchema.nullable().optional(),
});

export const publicCompassRecommendationSchema = z.object({
  taxonomyVersion: z.string().min(1),
  ruleVersion: z.string().min(1),
  locale: z.string().min(2),
  normalizedSelection: normalizedSelectionSchema,
  selectionAdjustments: z.array(
    z.object({
      code: z.string().min(1),
      fieldPath: z.string().min(1),
      message: z.string().min(1),
      removedValues: z.array(z.string()).optional(),
    }),
  ),
  recommendations: z.array(
    z.object({
      card: publicCompassContentCardSchema,
      reasons: z
        .array(
          z.object({
            code: z.string().min(1),
            text: z.string().min(1),
          }),
        )
        .max(3),
      goalIds: z.array(z.string()),
    }),
  ),
  relatedTopics: z.array(publicTaxonomyTermSchema),
  handoffCandidate: handoffCandidateSchema,
  pagination: z.object({
    offset: z.number().int().nonnegative(),
    limit: z.number().int().min(1).max(24),
    total: z.number().int().nonnegative(),
    hasMore: z.boolean(),
  }),
});

export function parsePublicTaxonomyTerm(value: unknown): PublicTaxonomyTerm {
  return publicTaxonomyTermSchema.parse(value) as PublicTaxonomyTerm;
}

export function parsePublicTaxonomyCollection(
  value: unknown,
): PublicTaxonomyCollection {
  return publicTaxonomyCollectionSchema.parse(
    value,
  ) as PublicTaxonomyCollection;
}

export function parsePublicCompassContentCard(
  value: unknown,
): PublicCompassContentCard {
  return publicCompassContentCardSchema.parse(
    value,
  ) as PublicCompassContentCard;
}

export function parsePublicTaxonomyPageAggregate(
  value: unknown,
): PublicTaxonomyPageAggregate {
  return publicTaxonomyPageAggregateSchema.parse(
    value,
  ) as PublicTaxonomyPageAggregate;
}

export function parsePublicCompassRecommendation(
  value: unknown,
): CompassRecommendationResponse {
  return publicCompassRecommendationSchema.parse(
    value,
  ) as CompassRecommendationResponse;
}
