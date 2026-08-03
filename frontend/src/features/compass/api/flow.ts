import { requestJson } from "@/lib/api/request-json";
import {
  publicTaxonomyCollectionSchema,
  publicTaxonomyTermSchema,
} from "@/lib/compass/contract";
import type { components } from "@/types/api.generated";
import type { PublicTaxonomyCollection } from "@/lib/compass/types";
import { z } from "zod";

const staticOptionSchema = z.object({
  optionId: z.string().min(1),
  label: z.string().min(1),
  selectionValue: z.string().nullable().optional(),
  nextQuestionId: z.string().nullable().optional(),
  terminal: z.enum(["results", "starting_package"]).nullable().optional(),
});

const questionSchema = z.object({
  questionId: z.string().min(1),
  prompt: z.string().min(1),
  helpText: z.string(),
  selectionTarget: z.enum([
    "topic_group",
    "topics",
    "audience",
    "content_goals",
    "journey_intent",
    "none",
  ]),
  inputMode: z.enum(["single_select", "multi_select"]),
  optionSource: z.enum(["taxonomy_axis", "static"]),
  taxonomyAxis: z.string().nullable().optional(),
  allowedTermIds: z.array(z.string()),
  filterTopicsBySelectedArea: z.boolean(),
  maxSelections: z.number().int().min(1).max(2),
  optional: z.literal(true),
  defaultNextQuestionId: z.string().nullable().optional(),
  skipNextQuestionId: z.string().nullable().optional(),
  staticOptions: z.array(staticOptionSchema),
  terminal: z.enum(["results", "starting_package"]).nullable().optional(),
});

const sectionSchema = z.object({
  sectionId: z.string().min(1),
  title: z.string().min(1),
  goalIds: z.array(z.string()),
  maxItems: z.number().int().positive(),
  emptyBehavior: z.enum(["hide", "show"]),
  locked: z.boolean(),
});

export const publicFlowSchema = z.object({
  flowId: z.string().uuid(),
  versionId: z.string().uuid(),
  stableId: z.string().min(1),
  version: z.number().int().positive(),
  locale: z.string().min(2),
  status: z.literal("published"),
  lockVersion: z.number().int().positive(),
  definition: z.object({
    schemaVersion: z.literal(1),
    entryQuestionId: z.string().min(1),
    questions: z.array(questionSchema).min(1),
    resultSections: z.array(sectionSchema).min(1),
  }),
});

const recommendationItemSchema = z.object({
  card: z.object({
    itemKey: z.string(),
    contentType: z.string(),
    slug: z.string(),
    locale: z.string(),
    template: z.string(),
    seo: z.object({
      title: z.string(),
      description: z.string(),
      ogImageAssetId: z.string().nullable().optional(),
    }),
    contentFormat: z.string(),
    accessLevel: z.literal("public"),
    publishedAt: z.string(),
  }),
  reasons: z.array(z.object({ code: z.string(), text: z.string() })).max(3),
  goalIds: z.array(z.string()),
});

export const compassExperienceSchema = z.object({
  flowVersion: z.number().int().positive(),
  normalizedSelection: z.object({
    topicGroupId: z.string().nullable().optional(),
    topicIds: z.array(z.string()).max(2),
    audienceId: z.string().nullable().optional(),
    goalIds: z.array(z.string()),
    journeyIntent: z
      .enum(["explore", "professional_support", "both"])
      .nullable()
      .optional(),
  }),
  selectionAdjustments: z.array(
    z.object({
      code: z.string(),
      fieldPath: z.string(),
      message: z.string(),
      removedValues: z.array(z.string()).optional(),
    }),
  ),
  summary: z.object({
    title: z.enum(["Vaš prilagođeni prikaz", "Polazni prikaz"]),
    hasSelection: z.boolean(),
  }),
  sections: z.array(
    z.object({
      sectionId: z.string(),
      title: z.string(),
      contentItems: z.array(recommendationItemSchema),
      taxonomyItems: z.array(publicTaxonomyTermSchema),
      emptyBehavior: z.enum(["hide", "show"]),
      locked: z.boolean(),
    }),
  ),
  handoffCandidate: z.object({
    schemaVersion: z.literal("1"),
    taxonomyVersion: z.string(),
    topicGroupId: z.string().nullable().optional(),
    topicIds: z.array(z.string()).max(2),
    audienceIds: z.array(z.string()).max(1),
    journeyIntent: z
      .enum(["explore", "professional_support", "both"])
      .nullable()
      .optional(),
  }),
});

export type PublicCompassFlow = components["schemas"]["CompassFlowVersionOut"];
export type CompassExperience = components["schemas"]["CompassExperienceOut"];

export async function fetchPublicCompassFlow(
  signal?: AbortSignal,
): Promise<PublicCompassFlow> {
  return requestJson(
    "/api/compass/flow",
    { cache: "no-store", ...(signal ? { signal } : {}) },
    publicFlowSchema,
  ) as Promise<PublicCompassFlow>;
}

export async function fetchPublicCompassTaxonomy(
  signal?: AbortSignal,
): Promise<PublicTaxonomyCollection> {
  const parsed = await requestJson(
    "/api/compass/taxonomy",
    { cache: "no-store", ...(signal ? { signal } : {}) },
    publicTaxonomyCollectionSchema,
  );
  return parsed as PublicTaxonomyCollection;
}

export async function fetchCompassExperience(
  request: components["schemas"]["CompassRecommendationRequest"],
): Promise<CompassExperience> {
  return requestJson(
    "/api/compass/recommendations",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
      cache: "no-store",
    },
    compassExperienceSchema,
  ) as Promise<CompassExperience>;
}
