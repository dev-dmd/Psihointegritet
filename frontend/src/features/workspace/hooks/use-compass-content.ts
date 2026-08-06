"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { createContentEntry, type ApiContentRevision } from "../content-api";
import { CONTENT_ENTRIES_QUERY_KEY } from "../content-entries-query";

/**
 * Creating an article from the Kompas content workspace.
 *
 * Deliberately the same `POST /content/entries` the panel already uses — the
 * article type and its `article_detail` template are an existing backend
 * contract (ADR-019/ADR-021), so nothing new is asked of the server here.
 */
export function useCreateArticleMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { slug: string }): Promise<ApiContentRevision> =>
      createContentEntry({
        contentType: "article",
        slug: input.slug,
        template: "article_detail",
      }),
    onSuccess: (entry) => {
      // The list is the screen the author returns to; keep it truthful without
      // a round trip, exactly as `useOpenSystemContentEntryMutation` does.
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
