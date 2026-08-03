"use client";

import { useMutation, useQuery } from "@tanstack/react-query";

import {
  fetchCompassExperience,
  fetchPublicCompassFlow,
  fetchPublicCompassTaxonomy,
} from "../api/flow";

export function useCompassRegistry(enabled: boolean) {
  return useQuery({
    queryKey: ["public-compass-flow", "main-kompas", "sr-Latn"],
    queryFn: async ({ signal }) => {
      const [flow, taxonomy] = await Promise.all([
        fetchPublicCompassFlow(signal),
        fetchPublicCompassTaxonomy(signal),
      ]);
      return { flow, taxonomy };
    },
    enabled,
    staleTime: 5 * 60_000,
    retry: false,
  });
}

export function useCompassExperienceMutation() {
  return useMutation({ mutationFn: fetchCompassExperience, retry: false });
}
