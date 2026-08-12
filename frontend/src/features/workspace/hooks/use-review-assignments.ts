"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { ApprovalCapability } from "@/lib/content-governance/types";

import {
  createReviewAssignment,
  fetchReviewAssignments,
  fetchStaffUsers,
} from "../content-api";

export const REVIEW_ASSIGNMENTS_QUERY_KEY = ["review-assignments"] as const;
const STAFF_USERS_QUERY_KEY = ["staff-users"] as const;

export function useStaffUsersQuery() {
  return useQuery({
    queryKey: STAFF_USERS_QUERY_KEY,
    queryFn: fetchStaffUsers,
    staleTime: 120_000,
  });
}

export function useReviewAssignmentsQuery() {
  return useQuery({
    queryKey: REVIEW_ASSIGNMENTS_QUERY_KEY,
    queryFn: fetchReviewAssignments,
  });
}

/** Assigns a reviewer to a capability (RW-6). Invalidates the assignment list
 *  on success so the new chip appears without a manual refetch. */
export function useCreateReviewAssignmentMutation(
  callbacks: { onAssigned?: () => void } = {},
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: {
      userId: string;
      capability: ApprovalCapability;
      active: boolean;
    }) => createReviewAssignment(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: REVIEW_ASSIGNMENTS_QUERY_KEY });
      callbacks.onAssigned?.();
    },
  });
}
