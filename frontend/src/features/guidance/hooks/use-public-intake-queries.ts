"use client";

import { useQuery } from "@tanstack/react-query";

import type { IntakeAnswers } from "../matching";
import {
  fetchAuthoritativeIntakeMatch,
  fetchPublicIntakeCapabilities,
} from "../public-intake-api";

export const publicIntakeQueryKeys = {
  all: ["public", "intake"] as const,
  capabilities: () => [...publicIntakeQueryKeys.all, "capabilities"] as const,
  match: (answers: IntakeAnswers, attempt: number) =>
    [...publicIntakeQueryKeys.all, "match", answers, attempt] as const,
};

export function usePublicIntakeCapabilities() {
  return useQuery({
    queryKey: publicIntakeQueryKeys.capabilities(),
    queryFn: ({ signal }) => fetchPublicIntakeCapabilities(signal),
    staleTime: 5 * 60_000,
    retry: false,
  });
}

export function useAuthoritativeIntakeMatch(
  answers: IntakeAnswers,
  enabled: boolean,
  attempt: number,
) {
  return useQuery({
    queryKey: publicIntakeQueryKeys.match(answers, attempt),
    queryFn: ({ signal }) => fetchAuthoritativeIntakeMatch(answers, signal),
    enabled,
    staleTime: 0,
    retry: false,
  });
}
