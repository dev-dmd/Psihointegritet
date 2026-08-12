import { requestJson } from "@/lib/api/request-json";
import type { components } from "@/types/api.generated";
import { z } from "zod";

/**
 * Browser adapter for the Research module.
 *
 * The database is the authority for every answer (D-057); the old
 * email-only path is gone. Both surveys use these two calls — the drawer is
 * configured by `surveyStableId`, not by which component renders it.
 */

export type PublicSurvey = components["schemas"]["PublicSurveyOut"];
export type SurveySubmissionResult =
  components["schemas"]["SubmitResearchResponse"];
export type ResearchSurface =
  components["schemas"]["ResearchSubmissionSurface"];
export type ResearchTrigger =
  components["schemas"]["ResearchSubmissionTrigger"];

const surveyOptionSchema = z.object({
  optionId: z.string().min(1),
  label: z.string().min(1),
});

const surveyQuestionSchema = z.object({
  questionId: z.string().min(1),
  prompt: z.string().min(1),
  options: z.array(surveyOptionSchema).min(1),
  multi: z.boolean(),
  optional: z.boolean(),
});

const publicSurveySchema = z.object({
  stableId: z.string().min(1),
  version: z.number().int(),
  title: z.string().min(1),
  schema: z.object({
    schemaVersion: z.number().int(),
    introTitle: z.string().min(1),
    introDescription: z.string().min(1),
    questions: z.array(surveyQuestionSchema).min(1),
    allowsFreeText: z.boolean(),
  }),
});

const submissionResultSchema = z.object({
  submissionId: z.string().min(1),
  surveyStableId: z.string().min(1),
  surveyVersion: z.number().int(),
});

export type SurveyQuestion = z.infer<typeof surveyQuestionSchema>;
export type SurveySchema = z.infer<typeof publicSurveySchema>["schema"];

export async function fetchPublicSurvey(
  stableId: string,
  signal?: AbortSignal,
): Promise<z.infer<typeof publicSurveySchema>> {
  return requestJson(
    `/api/research/surveys/${encodeURIComponent(stableId)}`,
    { cache: "no-store", ...(signal ? { signal } : {}) },
    publicSurveySchema,
  );
}

export interface SubmitSurveyInput {
  surveyStableId: string;
  answers: { questionId: string; optionIds: string[] }[];
  surface: ResearchSurface;
  trigger: ResearchTrigger;
}

export async function submitSurvey(
  input: SubmitSurveyInput,
): Promise<z.infer<typeof submissionResultSchema>> {
  return requestJson(
    "/api/research/submissions",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...input, locale: "sr-Latn" }),
    },
    submissionResultSchema,
  );
}
