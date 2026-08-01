import { z } from "zod";

import { postJson } from "@/lib/api/request-json";

export interface SurveySubmissionPayload {
  surveyId: string;
  answers: Array<{
    question: string;
    answer: string;
  }>;
  note?: string;
}

const surveySubmissionResponseSchema = z.object({ ok: z.literal(true) });

export type SurveySubmissionResponse = z.infer<
  typeof surveySubmissionResponseSchema
>;

export function submitSurvey(
  payload: SurveySubmissionPayload,
): Promise<SurveySubmissionResponse> {
  return postJson("/api/survey", payload, surveySubmissionResponseSchema);
}
