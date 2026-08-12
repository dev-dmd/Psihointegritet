"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import {
  claimIntakeCase,
  fetchIntakeTeamQueue,
  type IntakeTeamQueueItem,
} from "../intake-team-queue-api";

export const INTAKE_TEAM_QUEUE_QUERY_KEY = ["intake-team-queue"] as const;

/** Unassigned Intake cases for the team queue tab. Disabled entirely when the
 * feature flag is off, so a flagged-off panel issues no request at all. */
export function useIntakeTeamQueueQuery(enabled: boolean) {
  return useQuery({
    queryKey: INTAKE_TEAM_QUEUE_QUERY_KEY,
    queryFn: fetchIntakeTeamQueue,
    enabled,
  });
}

/** Claims a case for the signed-in therapist. Success removes the row from the
 * cached queue instead of refetching; failure means someone else claimed it
 * first, so the list is reconciled against the server. */
export function useClaimIntakeCaseMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: claimIntakeCase,
    onSuccess: (_result, caseId) => {
      queryClient.setQueryData<IntakeTeamQueueItem[]>(
        INTAKE_TEAM_QUEUE_QUERY_KEY,
        (current) => current?.filter((item) => item.caseId !== caseId) ?? [],
      );
      toast.success("Zahtev je preuzet.");
    },
    onError: () => {
      toast.error(
        "Zahtev je u međuvremenu preuzet ili trenutno nije dostupan.",
      );
      void queryClient.invalidateQueries({
        queryKey: INTAKE_TEAM_QUEUE_QUERY_KEY,
      });
    },
  });
}
