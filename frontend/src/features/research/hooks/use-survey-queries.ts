"use client";

import { useMutation, useQuery } from "@tanstack/react-query";

import {
  fetchPublicSurvey,
  submitSurvey,
  type SubmitSurveyInput,
} from "../research-api";

/** Published question set. Fetched only while the drawer is open, so a page
 * that never opens it issues no request. */
export function useSurveyQuery(stableId: string, enabled: boolean) {
  return useQuery({
    queryKey: ["research-survey", stableId],
    queryFn: ({ signal }) => fetchPublicSurvey(stableId, signal),
    enabled,
    staleTime: 5 * 60_000,
    retry: false,
  });
}

/** One submission per completed run; the backend validates every option id
 * against the published schema before it stores anything. */
export function useSubmitSurveyMutation() {
  return useMutation({
    mutationFn: (input: SubmitSurveyInput) => submitSurvey(input),
    retry: false,
  });
}
