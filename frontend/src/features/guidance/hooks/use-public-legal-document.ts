"use client";

import { useQuery } from "@tanstack/react-query";

import {
  fetchPublicLegalDocument,
  type PublicLegalDocumentKind,
} from "@/lib/api/public-legal-document";

export const publicLegalDocumentKeys = {
  all: ["public", "legal-documents"] as const,
  detail: (kind: PublicLegalDocumentKind) =>
    [...publicLegalDocumentKeys.all, kind] as const,
};

export function usePublicLegalDocument(
  kind: PublicLegalDocumentKind,
  enabled: boolean,
) {
  return useQuery({
    queryKey: publicLegalDocumentKeys.detail(kind),
    queryFn: ({ signal }) => fetchPublicLegalDocument(kind, signal),
    enabled,
    staleTime: 5 * 60_000,
    retry: false,
  });
}
