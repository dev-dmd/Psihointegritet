"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { ApprovalCapability } from "@/lib/content-governance/types";

import {
  confirmTaxonomyRoute,
  createTaxonomyIntakeLink,
  createTaxonomyTerm,
  deleteTaxonomyRevision,
  fetchTaxonomyRegistry,
  recordTaxonomyIntakeLinkReview,
  recordTaxonomyReviewDecision,
  suggestTaxonomyRoute,
  TAXONOMY_REGISTRY_QUERY_KEY,
  TaxonomyApiError,
  transitionTaxonomyIntakeLink,
  transitionTaxonomyRevision,
  updateTaxonomyRevision,
  type CreateTaxonomyIntakeLinkInput,
  type CreateTaxonomyTermInput,
  type TaxonomyIntakeLink,
  type TaxonomyRegistrySnapshot,
  type TaxonomyRoute,
  type TaxonomyRouteSuggestion,
  type TaxonomyStatus,
  type TaxonomyTerm,
  type UpdateTaxonomyRevisionInput,
} from "../taxonomy-api";

/** Single place that turns an unknown rejection into panel copy. Every Kompas
 * surface used to inline the same `instanceof TaxonomyApiError ? … : …` ladder. */
export function taxonomyErrorMessage(error: unknown, fallback: string): string {
  return error instanceof TaxonomyApiError ? error.message : fallback;
}

/** First non-null message across a set of mutations, in the order given. */
export function firstTaxonomyError(
  candidates: readonly { isError: boolean; error: unknown; fallback: string }[],
): string | null {
  for (const candidate of candidates) {
    if (candidate.isError) {
      return taxonomyErrorMessage(candidate.error, candidate.fallback);
    }
  }
  return null;
}

export function useTaxonomyRegistryQuery() {
  return useQuery({
    queryKey: TAXONOMY_REGISTRY_QUERY_KEY,
    queryFn: () => fetchTaxonomyRegistry(),
    staleTime: 30_000,
  });
}

/** Read-only registry snapshot for the CMS discovery metadata form. Never
 * retries: a missing Kompas registry renders an empty controlled list rather
 * than blocking the content editor behind repeated failures. */
export function useTaxonomyRegistryLookupQuery() {
  return useQuery({
    queryKey: TAXONOMY_REGISTRY_QUERY_KEY,
    queryFn: () => fetchTaxonomyRegistry(),
    staleTime: 30_000,
    retry: false,
  });
}

/**
 * Cache writers for the registry snapshot. Mutations return the saved row, so
 * the panel replaces exactly that row instead of refetching the whole registry.
 */
export function useTaxonomyRegistryCache() {
  const queryClient = useQueryClient();

  const upsertTerm = (saved: TaxonomyTerm) => {
    queryClient.setQueryData<TaxonomyRegistrySnapshot>(
      TAXONOMY_REGISTRY_QUERY_KEY,
      (current) => ({
        terms: [
          ...(current?.terms ?? []).filter(
            (term) => term.termId !== saved.termId,
          ),
          saved,
        ],
        intakeLinks: current?.intakeLinks ?? [],
      }),
    );
  };

  const upsertIntakeLink = (saved: TaxonomyIntakeLink) => {
    queryClient.setQueryData<TaxonomyRegistrySnapshot>(
      TAXONOMY_REGISTRY_QUERY_KEY,
      (current) => ({
        terms: current?.terms ?? [],
        intakeLinks: [
          ...(current?.intakeLinks ?? []).filter(
            (link) => link.linkId !== saved.linkId,
          ),
          saved,
        ],
      }),
    );
  };

  // Deletion removes a revision the panel cannot reconstruct locally (the
  // previous revision, if any, becomes current server-side), so this is the
  // one path that genuinely needs a refetch.
  const invalidate = () => {
    void queryClient.invalidateQueries({
      queryKey: TAXONOMY_REGISTRY_QUERY_KEY,
    });
  };

  return { upsertTerm, upsertIntakeLink, invalidate };
}

export function useSuggestTaxonomyRouteMutation(
  termId: string,
  onSuggested: (suggestion: TaxonomyRouteSuggestion) => void,
) {
  return useMutation({
    mutationFn: () => suggestTaxonomyRoute(termId),
    onSuccess: onSuggested,
  });
}

export function useConfirmTaxonomyRouteMutation(
  termId: string,
  onConfirmed: (route: TaxonomyRoute) => void,
) {
  return useMutation({
    mutationFn: (input: { slug: string; lockVersion: number | null }) =>
      confirmTaxonomyRoute(termId, {
        slug: input.slug,
        lockVersion: input.lockVersion,
      }),
    onSuccess: onConfirmed,
  });
}

export function useTaxonomyTermTransitionMutation(
  term: Pick<TaxonomyTerm, "termId" | "revisionId" | "lockVersion">,
  onChanged: (term: TaxonomyTerm) => void,
) {
  return useMutation({
    mutationFn: (target: TaxonomyStatus) =>
      transitionTaxonomyRevision(
        term.termId,
        term.revisionId,
        term.lockVersion,
        target,
      ),
    onSuccess: onChanged,
  });
}

export interface TermReviewVariables {
  capability: ApprovalCapability;
  outcome: "approved" | "rejected";
  note: string | undefined;
}

export function useTaxonomyTermReviewMutation(
  term: Pick<TaxonomyTerm, "termId" | "revisionId">,
  onChanged: (term: TaxonomyTerm) => void,
) {
  return useMutation({
    mutationFn: ({ capability, outcome, note }: TermReviewVariables) =>
      recordTaxonomyReviewDecision(term.termId, term.revisionId, {
        capability,
        outcome,
        ...(note ? { note } : {}),
      }),
    onSuccess: onChanged,
  });
}

export function useDeleteTaxonomyRevisionMutation(
  term: Pick<TaxonomyTerm, "termId" | "revisionId">,
  onDeleted: () => void,
) {
  return useMutation({
    mutationFn: () => deleteTaxonomyRevision(term.termId, term.revisionId),
    onSuccess: onDeleted,
  });
}

export function useTaxonomyIntakeLinkTransitionMutation(
  link: Pick<TaxonomyIntakeLink, "linkId" | "lockVersion">,
  onChanged: (link: TaxonomyIntakeLink) => void,
) {
  return useMutation({
    mutationFn: (target: TaxonomyStatus) =>
      transitionTaxonomyIntakeLink(link.linkId, link.lockVersion, target),
    onSuccess: onChanged,
  });
}

export interface LinkReviewVariables {
  outcome: "approved" | "rejected";
  note: string | undefined;
}

export function useTaxonomyIntakeLinkReviewMutation(
  link: Pick<TaxonomyIntakeLink, "linkId">,
  onChanged: (link: TaxonomyIntakeLink) => void,
) {
  return useMutation({
    mutationFn: ({ outcome, note }: LinkReviewVariables) =>
      recordTaxonomyIntakeLinkReview(link.linkId, {
        capability: "clinical",
        outcome,
        ...(note ? { note } : {}),
      }),
    onSuccess: onChanged,
  });
}

export function useCreateTaxonomyIntakeLinkMutation(
  onCreated: (link: TaxonomyIntakeLink) => void,
  onFailed: (error: unknown) => void,
) {
  return useMutation({
    mutationFn: (input: CreateTaxonomyIntakeLinkInput) =>
      createTaxonomyIntakeLink(input),
    onSuccess: onCreated,
    onError: onFailed,
  });
}

export interface SaveTaxonomyTermVariables {
  create: CreateTaxonomyTermInput | null;
  update: {
    termId: string;
    revisionId: string;
    input: UpdateTaxonomyRevisionInput;
  } | null;
}

/**
 * One mutation for both create and update so the editor has a single pending
 * flag and a single error channel. Exactly one of `create`/`update` is set;
 * the caller decides which based on whether it is editing an existing term.
 */
export function useSaveTaxonomyTermMutation(callbacks: {
  onSaved: (term: TaxonomyTerm) => void;
  onFailed: (error: unknown) => void;
}) {
  return useMutation({
    mutationFn: (variables: SaveTaxonomyTermVariables) => {
      if (variables.update) {
        return updateTaxonomyRevision(
          variables.update.termId,
          variables.update.revisionId,
          variables.update.input,
        );
      }
      if (!variables.create) {
        throw new TaxonomyApiError("Nedostaju podaci za čuvanje termina.", 422);
      }
      return createTaxonomyTerm(variables.create);
    },
    onSuccess: callbacks.onSaved,
    onError: callbacks.onFailed,
  });
}
