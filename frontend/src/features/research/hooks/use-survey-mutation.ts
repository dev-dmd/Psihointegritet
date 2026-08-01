"use client";

import { useMutation } from "@tanstack/react-query";

import {
  submitSurvey,
  type SurveySubmissionPayload,
} from "@/lib/api/survey";

export const surveyMutationKey = ["public", "survey"] as const;

export function useSurveyMutation() {
  return useMutation({
    mutationKey: surveyMutationKey,
    mutationFn: (payload: SurveySubmissionPayload) => submitSurvey(payload),
    retry: false,
  });
}
