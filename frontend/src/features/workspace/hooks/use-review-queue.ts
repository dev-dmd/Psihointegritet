"use client";

import { useQuery } from "@tanstack/react-query";

import { fetchReviewQueue } from "../content-api";

export const REVIEW_QUEUE_QUERY_KEY = ["review-queue"] as const;

/** Reviewer's queue (RW-6), polled so a reviewer sees new submissions without
 *  a manual refresh. */
export function useReviewQueueQuery() {
  return useQuery({
    queryKey: REVIEW_QUEUE_QUERY_KEY,
    queryFn: fetchReviewQueue,
    refetchInterval: 30_000,
  });
}
