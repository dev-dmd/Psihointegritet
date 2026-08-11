"use client";

import { useState } from "react";

import { ErrorBanner } from "@/components/panel/error-banner";

import {
  legalErrorMessage,
  useAdvanceLegalDocumentMutation,
  useCreateLegalDocumentMutation,
  useDeleteLegalDocumentMutation,
  useLegalDocumentApprovalMutation,
  useLegalDocumentsCache,
  useLegalDocumentsQuery,
  usePreviewLegalDocumentDocxMutation,
  usePublishLegalDocumentMutation,
  useSaveLegalDocumentBodyMutation,
  type DocxPreviewState,
} from "../../hooks/use-legal-documents";
import {
  STATUS_LABELS,
  canDelete,
  intakeGateOpen,
  type LegalDocument,
} from "../../legal-documents";
import { usePanelErrors } from "../../panel-errors";
import { PageHeader } from "../page-header";
import {
  describeApiPublishBlock,
  describeDocxImportError,
  ROUTE_ID,
  resourceFor,
  resourceForNewDocument,
  TAB_LABEL,
} from "./helpers";
import { LegalDocumentCard } from "./legal-document-card";
import { NewDocumentForm } from "./new-document-form";

/**
 * „Dokumenti i saglasnosti" (LD-7). Orchestration only: list, selection and
 * the transient create/import/delete UI state. Every network call lives in
 * `hooks/use-legal-documents.ts`, and each document row renders through
 * `LegalDocumentCard`.
 */
export function ScreenDokumenti() {
  const { reportError, errorsFor, clearErrorsForResource } = usePanelErrors();
  const { replaceInList, appendToList, removeFromList } =
    useLegalDocumentsCache();

  const documentsQuery = useLegalDocumentsQuery();
  const documents = documentsQuery.data ?? [];
  const loadError = documentsQuery.isError
    ? legalErrorMessage(
        documentsQuery.error,
        "Dokumenti se trenutno ne mogu učitati. Osvežite stranicu.",
      )
    : null;

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [docxPreview, setDocxPreview] = useState<DocxPreviewState | null>(null);

  const errors = errorsFor(ROUTE_ID);
  const gateOpen = intakeGateOpen(documents);

  const reportApiError = (
    document: LegalDocument,
    title: string,
    error: unknown,
  ) => {
    reportError({
      routeId: ROUTE_ID,
      tabLabel: TAB_LABEL,
      resource: resourceFor(document),
      title,
      description: legalErrorMessage(
        error,
        "Zahtev nije uspeo. Pokušajte ponovo.",
      ),
      details: [],
    });
  };

  /** A successful re-check clears only this resource's errors (A.6) — other
   * documents' findings on the tab stay visible. */
  const acceptUpdate = (document: LegalDocument, next: LegalDocument) => {
    replaceInList(next);
    clearErrorsForResource(resourceFor(document));
  };

  const publishMutation = usePublishLegalDocumentMutation({
    onOutcome: (document, outcome) => {
      if (outcome.kind === "blocked") {
        // A blocked publish is reported, never thrown: the panel stays usable.
        reportError({
          routeId: ROUTE_ID,
          tabLabel: TAB_LABEL,
          resource: resourceFor(document),
          ...describeApiPublishBlock(document, outcome.block),
        });
        return;
      }
      acceptUpdate(document, outcome.document);
    },
    onFailed: (document, error) =>
      reportApiError(
        document,
        `Dokument „${document.title}“ nije objavljen`,
        error,
      ),
  });

  const advanceMutation = useAdvanceLegalDocumentMutation({
    onAdvanced: acceptUpdate,
    onFailed: (document, error) =>
      reportApiError(
        document,
        `Nedozvoljen korak za „${document.title}“`,
        error,
      ),
  });

  const approvalMutation = useLegalDocumentApprovalMutation({
    onRecorded: acceptUpdate,
    onFailed: (document, action, error) =>
      reportApiError(
        document,
        action === "grant"
          ? `Odobrenje nije zabeleženo za „${document.title}“`
          : `Odobrenje nije poništeno za „${document.title}“`,
        error,
      ),
  });

  const saveBodyMutation = useSaveLegalDocumentBodyMutation({
    onSaved: (document, next) => {
      acceptUpdate(document, next);
      if (docxPreview?.documentId === document.documentId) setDocxPreview(null);
    },
    onFailed: (document, error) =>
      reportApiError(
        document,
        `Izmena nije sačuvana za „${document.title}“`,
        error,
      ),
  });

  const docxPreviewMutation = usePreviewLegalDocumentDocxMutation({
    onPreview: setDocxPreview,
    onFailed: (document, file, error) =>
      reportError({
        routeId: ROUTE_ID,
        tabLabel: TAB_LABEL,
        resource: resourceFor(document),
        title: `DOCX „${file.name}” nije uvezen`,
        description: describeDocxImportError(error),
        details: [],
      }),
  });

  const deleteMutation = useDeleteLegalDocumentMutation({
    onRemoved: (document) => {
      removeFromList(document.documentId);
      if (selectedId === document.documentId) setSelectedId(null);
      setPendingDeleteId(null);
    },
    onFailed: (document, error) => {
      setPendingDeleteId(null);
      reportApiError(
        document,
        `Dokument „${document.title}“ nije obrisan`,
        error,
      );
    },
  });

  const createMutation = useCreateLegalDocumentMutation({
    onCreated: (created, slug) => {
      appendToList(created);
      clearErrorsForResource(resourceForNewDocument(slug));
      setCreating(false);
      setSelectedId(created.documentId);
    },
    onFailed: (slug, error) =>
      reportError({
        routeId: ROUTE_ID,
        tabLabel: TAB_LABEL,
        resource: resourceForNewDocument(slug),
        title: "Nova stranica nije sačuvana",
        description: legalErrorMessage(
          error,
          "Zahtev nije uspeo. Pokušajte ponovo.",
        ),
        details: [],
      }),
  });

  /** D-045 / A.1: only drafts are hard-deletable. The button is hidden for the
   * rest, but hiding is never the protection — this guard is. */
  const confirmDelete = (document: LegalDocument) => {
    if (!canDelete(document.status)) {
      setPendingDeleteId(null);
      reportError({
        routeId: ROUTE_ID,
        tabLabel: TAB_LABEL,
        resource: resourceFor(document),
        title: `Dokument „${document.title}“ nije obrisan`,
        description: `Revizija u stanju „${STATUS_LABELS[document.status]}“ se ne briše — objavljeno i arhivirano se čuva zbog istorije saglasnosti (D-045). Dozvoljeno je samo arhiviranje.`,
        details: [],
      });
      return;
    }
    deleteMutation.mutate(document);
  };

  return (
    <section className="animate-fade-up">
      <PageHeader
        title="Dokumenti i saglasnosti"
        description="Pravni tekstovi i tekstovi saglasnosti koje tim uređuje sam. Objavljena verzija je ono što korisnik vidi i na šta pristaje — zato objava traži odobrenja."
      />

      <ErrorBanner errors={errors} />

      {loadError ? (
        <div className="border-danger/45 bg-danger/8 rounded-panel mb-6 border px-5 py-4">
          <p className="text-coffee text-[14.5px] font-semibold">
            Dokumenti se ne mogu učitati
          </p>
          <p className="text-ink-70 mt-1 text-[13px] leading-[1.5]">
            {loadError}
          </p>
        </div>
      ) : null}

      <div
        className={`rounded-panel mb-6 border px-5 py-4 ${
          gateOpen
            ? "border-badge-ok/40 bg-badge-ok-bg"
            : "border-badge-amber/40 bg-badge-amber-bg"
        }`}
      >
        <div className="text-coffee text-[14.5px] font-semibold">
          {gateOpen
            ? "Intake prima zahteve"
            : "Intake ne prima zahteve sa ličnim podacima"}
        </div>
        <p className="text-ink-70 mt-1 text-[13px] leading-[1.5]">
          {gateOpen
            ? "Oba teksta saglasnosti imaju objavljenu verziju, pa je gate otvoren."
            : `Gate se otvara tek kada „Obaveštenje o obradi podataka“ i „Potvrda da zahtev nije termin“ imaju objavljenu verziju. Do tada javni tok radi bez prikupljanja podataka.`}
        </p>
      </div>

      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-forest font-serif text-[22px] font-normal">
          Stranice ({documents.length})
        </h2>
        <button
          type="button"
          onClick={() => {
            setCreating(true);
            setSelectedId(null);
          }}
          className="bg-forest text-panel-canvas hover:bg-forest-hover cursor-pointer rounded-full border-0 px-5 py-2.5 text-sm font-semibold transition-colors"
        >
          Nova stranica
        </button>
      </div>

      {creating ? (
        <NewDocumentForm
          existingSlugs={documents.map((document) => document.slug)}
          existingKinds={documents.map((document) => document.kind)}
          onCancel={() => setCreating(false)}
          onCreate={(input) => createMutation.mutate(input)}
        />
      ) : null}

      {documentsQuery.isLoading ? (
        <p className="text-ink-55 text-[13.5px]">Učitavanje…</p>
      ) : (
        <div className="flex flex-col gap-2.5">
          {documents.map((document) => (
            <LegalDocumentCard
              key={document.documentId}
              document={document}
              isSelected={document.documentId === selectedId}
              docxPreview={
                docxPreview?.documentId === document.documentId
                  ? docxPreview
                  : null
              }
              isImportingDocx={
                docxPreviewMutation.isPending &&
                docxPreviewMutation.variables?.document.documentId ===
                  document.documentId
              }
              isPendingDelete={pendingDeleteId === document.documentId}
              onToggleSelect={() =>
                setSelectedId(
                  document.documentId === selectedId
                    ? null
                    : document.documentId,
                )
              }
              onSaveBody={(target, body) =>
                saveBodyMutation.mutate({ document: target, body })
              }
              onApplyImport={(target, body) =>
                saveBodyMutation.mutate({ document: target, body })
              }
              onDiscardImport={() => setDocxPreview(null)}
              onPreviewDocx={(target, file) => {
                setDocxPreview(null);
                docxPreviewMutation.mutate({ document: target, file });
              }}
              onApproval={(target, capability, action) => {
                const alreadyGranted = target.approvals.includes(capability);
                if (action === "grant" && alreadyGranted) return;
                if (action === "revoke" && !alreadyGranted) return;
                approvalMutation.mutate({
                  document: target,
                  capability,
                  action,
                });
              }}
              onAdvance={(target, status) =>
                advanceMutation.mutate({ document: target, target: status })
              }
              onPublish={(target) => publishMutation.mutate(target)}
              onRequestDelete={setPendingDeleteId}
              onConfirmDelete={confirmDelete}
            />
          ))}
        </div>
      )}
    </section>
  );
}
