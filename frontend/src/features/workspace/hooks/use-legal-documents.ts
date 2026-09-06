"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { RichDoc } from "@/lib/content-governance/rich-doc";

import type {
  ApprovalCapability,
  LegalDocument,
  LegalDocumentKind,
  RevisionStatus,
} from "../legal-documents";
import {
  checkLegalDocumentPublishable,
  createLegalDocument,
  deleteLegalDocumentRevision,
  fetchLegalDocuments,
  importLegalDocumentDocx,
  recordLegalDocumentApproval,
  removeLegalDocumentApproval,
  transitionLegalDocumentRevision,
  updateLegalDocumentRevision,
  type ApiImportDocxResult,
  type ApiPublishBlock,
} from "../legal-documents-api";

export const LEGAL_DOCUMENTS_QUERY_KEY = ["legal-documents"] as const;

/**
 * Shares the QueryProvider already mounted in the Control Center layout, so
 * revisiting the tab serves cached documents instead of re-fetching and
 * re-flashing „Učitavanje…" on every remount.
 */
export function useLegalDocumentsQuery() {
  return useQuery({
    queryKey: LEGAL_DOCUMENTS_QUERY_KEY,
    queryFn: fetchLegalDocuments,
  });
}

/** Cache writers. Every mutation returns the whole document, so the list is
 * patched in place rather than refetched. */
export function useLegalDocumentsCache() {
  const queryClient = useQueryClient();

  const replaceInList = (next: LegalDocument) => {
    queryClient.setQueryData<LegalDocument[]>(
      LEGAL_DOCUMENTS_QUERY_KEY,
      (current) =>
        (current ?? []).map((document) =>
          document.documentId === next.documentId ? next : document,
        ),
    );
  };

  const appendToList = (created: LegalDocument) => {
    queryClient.setQueryData<LegalDocument[]>(
      LEGAL_DOCUMENTS_QUERY_KEY,
      (current) => [...(current ?? []), created],
    );
  };

  const removeFromList = (documentId: string) => {
    queryClient.setQueryData<LegalDocument[]>(
      LEGAL_DOCUMENTS_QUERY_KEY,
      (current) =>
        (current ?? []).filter((entry) => entry.documentId !== documentId),
    );
  };

  return { replaceInList, appendToList, removeFromList };
}

/**
 * Publishing is pre-flighted through `publish-check`. A block is a *successful*
 * outcome carrying the reason, never a thrown error — the panel stays usable
 * and renders the block as a structured panel error.
 */
export type PublishOutcome =
  | { kind: "blocked"; block: ApiPublishBlock }
  | { kind: "published"; document: LegalDocument };

export function usePublishLegalDocumentMutation(callbacks: {
  onOutcome: (document: LegalDocument, outcome: PublishOutcome) => void;
  onFailed: (document: LegalDocument, error: unknown) => void;
}) {
  return useMutation({
    mutationFn: async (document: LegalDocument): Promise<PublishOutcome> => {
      const block = await checkLegalDocumentPublishable(
        document.documentId,
        document.revisionId,
      ).catch(() => null);
      if (block) return { kind: "blocked", block };
      return {
        kind: "published",
        document: await transitionLegalDocumentRevision(
          document.documentId,
          document.revisionId,
          "published",
        ),
      };
    },
    onSuccess: (outcome, document) => callbacks.onOutcome(document, outcome),
    onError: (error, document) => callbacks.onFailed(document, error),
  });
}

export interface AdvanceVariables {
  document: LegalDocument;
  target: RevisionStatus;
}

export function useAdvanceLegalDocumentMutation(callbacks: {
  onAdvanced: (document: LegalDocument, next: LegalDocument) => void;
  onFailed: (document: LegalDocument, error: unknown) => void;
}) {
  return useMutation({
    mutationFn: ({ document, target }: AdvanceVariables) =>
      transitionLegalDocumentRevision(
        document.documentId,
        document.revisionId,
        target,
      ),
    onSuccess: (next, variables) =>
      callbacks.onAdvanced(variables.document, next),
    onError: (error, variables) =>
      callbacks.onFailed(variables.document, error),
  });
}

export interface ApprovalVariables {
  document: LegalDocument;
  capability: ApprovalCapability;
  /** `grant` records the decision, `revoke` withdraws it while the revision is
   * still `draft`/`in_review`. After approval the evidence is immutable. */
  action: "grant" | "revoke";
}

export function useLegalDocumentApprovalMutation(callbacks: {
  onRecorded: (document: LegalDocument, next: LegalDocument) => void;
  onFailed: (
    document: LegalDocument,
    action: ApprovalVariables["action"],
    error: unknown,
  ) => void;
}) {
  return useMutation({
    mutationFn: ({ document, capability, action }: ApprovalVariables) =>
      action === "grant"
        ? recordLegalDocumentApproval(
            document.documentId,
            document.revisionId,
            capability,
          )
        : removeLegalDocumentApproval(
            document.documentId,
            document.revisionId,
            capability,
          ),
    onSuccess: (next, variables) =>
      callbacks.onRecorded(variables.document, next),
    onError: (error, variables) =>
      callbacks.onFailed(variables.document, variables.action, error),
  });
}

export interface SaveBodyVariables {
  document: LegalDocument;
  body: RichDoc;
}

/** The backend reissues internally (A.2) when the current status is
 * `approved`/`archived`; the panel no longer predicts that locally, it just
 * displays whichever revision comes back. */
export function useSaveLegalDocumentBodyMutation(callbacks: {
  onSaved: (document: LegalDocument, next: LegalDocument) => void;
  onFailed: (document: LegalDocument, error: unknown) => void;
}) {
  return useMutation({
    mutationFn: ({ document, body }: SaveBodyVariables) =>
      updateLegalDocumentRevision(document.documentId, document.revisionId, {
        body,
      }),
    onSuccess: (next, variables) => callbacks.onSaved(variables.document, next),
    onError: (error, variables) =>
      callbacks.onFailed(variables.document, error),
  });
}

export interface DocxPreviewVariables {
  document: LegalDocument;
  file: File;
}

export interface DocxPreviewState {
  documentId: string;
  fileName: string;
  result: ApiImportDocxResult;
}

/** Import is preview-only (CG-B8): nothing is written until the author
 * explicitly applies the result through a separate save. */
export function usePreviewLegalDocumentDocxMutation(callbacks: {
  onPreview: (preview: DocxPreviewState) => void;
  onFailed: (document: LegalDocument, file: File, error: unknown) => void;
}) {
  return useMutation({
    mutationFn: ({ document, file }: DocxPreviewVariables) =>
      importLegalDocumentDocx(document.documentId, file),
    onSuccess: (result, variables) =>
      callbacks.onPreview({
        documentId: variables.document.documentId,
        fileName: variables.file.name,
        result,
      }),
    onError: (error, variables) =>
      callbacks.onFailed(variables.document, variables.file, error),
  });
}

export function useDeleteLegalDocumentMutation(callbacks: {
  onRemoved: (document: LegalDocument) => void;
  onFailed: (document: LegalDocument, error: unknown) => void;
}) {
  return useMutation({
    mutationFn: (document: LegalDocument) =>
      deleteLegalDocumentRevision(document.documentId, document.revisionId),
    onSuccess: (_result, document) => callbacks.onRemoved(document),
    onError: (error, document) => callbacks.onFailed(document, error),
  });
}

export interface CreateLegalDocumentVariables {
  kind: LegalDocumentKind;
  title: string;
  slug: string;
  body: RichDoc;
}

export function useCreateLegalDocumentMutation(callbacks: {
  onCreated: (created: LegalDocument, slug: string) => void;
  onFailed: (slug: string, error: unknown) => void;
}) {
  return useMutation({
    mutationFn: (input: CreateLegalDocumentVariables) =>
      createLegalDocument(input),
    onSuccess: (created, variables) =>
      callbacks.onCreated(created, variables.slug),
    onError: (error, variables) => callbacks.onFailed(variables.slug, error),
  });
}
