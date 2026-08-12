"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { ApprovalCapability } from "@/lib/content-governance/types";

import {
  checkContentPublishable,
  deleteContentRevision,
  fetchContentRevisionHealth,
  newContentDraft,
  recordContentReviewDecision,
  submitContentForReview,
  transitionContentRevision,
  updateContentRevision,
  type ApiContentDiscovery,
  type ApiContentPublishBlock,
  type ApiContentRevision,
} from "../content-api";
import { CONTENT_ENTRIES_QUERY_KEY } from "../content-entries-query";
import type { SeoFields } from "@/lib/content-governance/types";

type EntryRef = Pick<
  ApiContentRevision,
  "entryId" | "revisionId" | "lockVersion"
>;

/** Server-side Content Health for the *saved* revision. Keyed by lock version
 * so saving a change re-reads it, and never retried — a failed health read
 * must not block editing. */
export function useContentRevisionHealthQuery(entry: EntryRef) {
  return useQuery({
    queryKey: [
      "content-health",
      entry.entryId,
      entry.revisionId,
      entry.lockVersion,
    ],
    queryFn: () => fetchContentRevisionHealth(entry.entryId, entry.revisionId),
    staleTime: 30_000,
    retry: false,
  });
}

/** Cache writers for the entry list. Every lifecycle call returns the whole
 * revision, so the list is patched in place rather than refetched. */
export function useContentEntriesCache() {
  const queryClient = useQueryClient();

  const replaceEntry = (next: ApiContentRevision) => {
    queryClient.setQueryData<ApiContentRevision[]>(
      CONTENT_ENTRIES_QUERY_KEY,
      (current) =>
        (current ?? []).map((item) =>
          item.entryId === next.entryId ? next : item,
        ),
    );
  };

  const removeEntry = (entryId: string) => {
    queryClient.setQueryData<ApiContentRevision[]>(
      CONTENT_ENTRIES_QUERY_KEY,
      (current) => (current ?? []).filter((item) => item.entryId !== entryId),
    );
  };

  return { replaceEntry, removeEntry };
}

export interface SaveRevisionVariables {
  slotData: Record<string, unknown>;
  seo: SeoFields;
  discovery: ApiContentDiscovery;
}

export function useSaveContentRevisionMutation(
  entry: EntryRef,
  callbacks: {
    onSaved: (next: ApiContentRevision) => void;
    onFailed: (error: unknown) => void;
  },
) {
  return useMutation({
    mutationFn: (variables: SaveRevisionVariables) =>
      updateContentRevision(entry.entryId, entry.revisionId, {
        lockVersion: entry.lockVersion,
        slotData: variables.slotData,
        seo: variables.seo,
        discovery: variables.discovery,
      }),
    onSuccess: callbacks.onSaved,
    onError: callbacks.onFailed,
  });
}

export function useDeleteContentRevisionMutation(
  entry: EntryRef,
  callbacks: { onRemoved: () => void; onFailed: (error: unknown) => void },
) {
  return useMutation({
    mutationFn: () => deleteContentRevision(entry.entryId, entry.revisionId),
    onSuccess: callbacks.onRemoved,
    onError: callbacks.onFailed,
  });
}

/**
 * A transition either moves the revision or comes back blocked. The backend is
 * the publish authority (CG-D4), so publishing is pre-flighted through
 * `publish-check` and a block is a *successful* outcome carrying findings —
 * not a thrown error. The caller renders it; this hook stays free of panel UI.
 */
export type TransitionOutcome =
  | { kind: "blocked"; block: ApiContentPublishBlock }
  | { kind: "moved"; entry: ApiContentRevision };

export function useContentTransitionMutation(
  entry: EntryRef,
  callbacks: {
    onOutcome: (outcome: TransitionOutcome) => void;
    onFailed: (error: unknown) => void;
  },
) {
  return useMutation({
    mutationFn: async (
      target: ApiContentRevision["status"],
    ): Promise<TransitionOutcome> => {
      if (target === "published") {
        const block = await checkContentPublishable(
          entry.entryId,
          entry.revisionId,
        );
        if (block) return { kind: "blocked", block };
      }
      return {
        kind: "moved",
        entry: await transitionContentRevision(
          entry.entryId,
          entry.revisionId,
          target,
        ),
      };
    },
    onSuccess: callbacks.onOutcome,
    onError: callbacks.onFailed,
  });
}

/** Atomic save + submit for article review (RW-1 / D-068). One mutation
 *  replaces the old PATCH+POST chain — idempotent, single transaction. */
export function useSubmitArticleReviewMutation(
  entry: EntryRef,
  callbacks: {
    onSubmitted: (next: ApiContentRevision) => void;
    onFailed: (error: unknown) => void;
  },
) {
  return useMutation({
    mutationFn: (
      variables: SaveRevisionVariables & { idempotencyKey: string },
    ) =>
      submitContentForReview(entry.entryId, entry.revisionId, {
        lockVersion: entry.lockVersion,
        idempotencyKey: variables.idempotencyKey,
        slotData: variables.slotData,
        seo: variables.seo,
        discovery: variables.discovery,
      }),
    onSuccess: callbacks.onSubmitted,
    onError: callbacks.onFailed,
  });
}

export function useContentReviewMutation(
  entry: EntryRef,
  callbacks: {
    onRecorded: (next: ApiContentRevision) => void;
    onFailed: (error: unknown) => void;
  },
) {
  return useMutation({
    mutationFn: (input: {
      capability: ApprovalCapability;
      outcome: "approved" | "rejected";
      note?: string;
    }) =>
      recordContentReviewDecision(
        entry.entryId,
        entry.revisionId,
        input.capability,
        input.outcome,
        input.note,
      ),
    onSuccess: callbacks.onRecorded,
    onError: callbacks.onFailed,
  });
}

/** Creates a new DRAFT revision from an existing one (RW-3). The old revision
 *  stays published / archived — the new draft is independent. */
export function useNewContentDraftMutation(
  entry: EntryRef,
  callbacks: {
    onCreated: (next: ApiContentRevision) => void;
    onFailed: (error: unknown) => void;
  },
) {
  return useMutation({
    mutationFn: (reason: string) =>
      newContentDraft(entry.entryId, entry.revisionId, reason),
    onSuccess: callbacks.onCreated,
    onError: callbacks.onFailed,
  });
}
