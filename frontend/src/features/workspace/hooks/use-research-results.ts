"use client";

import { useQuery } from "@tanstack/react-query";

import { fetchResearchOverview } from "../research-api";

/** One read for the whole panel; the tabs slice the same result client-side so
 * switching tabs costs no request. */
export function useResearchOverviewQuery() {
  return useQuery({
    queryKey: ["research-overview"],
    queryFn: fetchResearchOverview,
    staleTime: 60_000,
  });
}
