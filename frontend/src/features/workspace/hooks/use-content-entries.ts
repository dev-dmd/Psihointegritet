"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { SystemContentDefinition } from "@/lib/content-governance/system-content-catalog";

import {
  ContentApiError,
  createContentEntry,
  fetchContentEntries,
  type ApiContentRevision,
} from "../content-api";
import { CONTENT_ENTRIES_QUERY_KEY } from "../content-entries-query";

/** Tenant-wide content entry list backing the „Sadržaj" tab. */
export function useContentEntriesQuery() {
  return useQuery({
    queryKey: CONTENT_ENTRIES_QUERY_KEY,
    queryFn: () => fetchContentEntries(),
  });
}

/** Published services/programs offered as controlled relation targets in the
 * discovery metadata editor. Separate key from the editable list: this one is
 * a read-only lookup and tolerates being stale for half a minute. */
export function usePublishedRelationTargetsQuery() {
  return useQuery({
    queryKey: ["published-service-program-relations"],
    queryFn: () => fetchContentEntries(),
    staleTime: 30_000,
    retry: false,
  });
}

export function contentErrorMessage(error: unknown, fallback: string): string {
  return error instanceof ContentApiError ? error.message : fallback;
}

/**
 * Opens a system page from the static catalogue: registers a CMS entry the
 * first time somebody edits a code fallback.
 *
 * A 409 here is expected rather than exceptional — another staff member can
 * register the same fallback between our list read and this POST. In that case
 * we reload the tenant list and resolve the now-existing entry instead of
 * surfacing a false failure; the original 409 is rethrown only when that
 * reconciliation is itself unavailable.
 */
export function useOpenSystemContentEntryMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      definition: SystemContentDefinition,
    ): Promise<ApiContentRevision> => {
      try {
        return await createContentEntry({
          contentType: definition.contentType,
          slug: definition.slug,
          template: definition.template,
        });
      } catch (error) {
        if (!(error instanceof ContentApiError) || error.status !== 409) {
          throw error;
        }

        const refreshed = await fetchContentEntries();
        queryClient.setQueryData(CONTENT_ENTRIES_QUERY_KEY, refreshed);
        const concurrent = refreshed.find(
          (item) =>
            item.contentType === definition.contentType &&
            item.slug === definition.slug &&
            item.template === definition.template,
        );
        if (!concurrent) throw error;
        return concurrent;
      }
    },
    onSuccess: (entry) => {
      queryClient.setQueryData<ApiContentRevision[]>(
        CONTENT_ENTRIES_QUERY_KEY,
        (current) => [
          ...(current ?? []).filter((item) => item.entryId !== entry.entryId),
          entry,
        ],
      );
    },
  });
}
