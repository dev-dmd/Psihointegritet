"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { ErrorBanner } from "@/components/panel/error-banner";
import { ActorBadge } from "@/components/panel/actor-badge";
import {
  StatusBadge,
  type StatusBadgeTone,
} from "@/components/panel/status-badge";
import { RichText } from "@/components/content/rich-text";
import { RichTextEditor } from "@/components/content/rich-text-editor";
import { emptyRichDoc, type RichDoc } from "@/lib/content-governance/rich-doc";

import {
  CAPABILITY_LABELS,
  CONTENT_PROBLEM_MESSAGES,
  KIND_LABELS,
  REQUIRED_APPROVALS,
  STATUS_LABELS,
  canDelete,
  intakeGateOpen,
  isValidSlug,
  missingApprovals,
  slugify,
  type ApprovalCapability,
  type ContentProblemCode,
  type LegalDocument,
  type LegalDocumentKind,
  type RevisionStatus,
} from "../legal-documents";
import {
  LegalDocumentsApiError,
  checkLegalDocumentPublishable,
  createLegalDocument,
  deleteLegalDocumentRevision,
  fetchLegalDocuments,
  recordLegalDocumentApproval,
  removeLegalDocumentApproval,
  transitionLegalDocumentRevision,
  updateLegalDocumentRevision,
  importLegalDocumentDocx,
  previewNewLegalDocumentDocx,
  type ApiImportDocxResult,
  type ApiPublishBlock,
} from "../legal-documents-api";
import { usePanelErrors, type PanelErrorResource } from "../panel-errors";
import { PageHeader } from "./page-header";

const HREF = "/radni-prostor/dokumenti" as const;
const TAB_LABEL = "Dokumenti i saglasnosti";
/** Single-tenant seed org; the backend membership check owns the real value. */
const ORGANIZATION_ID = "psihointegritet";
const RESOURCE_TYPE = "legal_document";
const LEGAL_DOCUMENTS_QUERY_KEY = ["legal-documents"] as const;

/**
 * Structured error identity (A.6). `ruleId`/`fieldPath` stay unset because
 * `checkPublishable` does not yet emit per-rule findings — known limitation
 * recorded in CMS_TODO CG-A3; CG-B2 introduces real rule-per-finding output.
 */
function resourceFor(document: LegalDocument): PanelErrorResource {
  return {
    organizationId: ORGANIZATION_ID,
    resourceType: RESOURCE_TYPE,
    resourceId: document.documentId,
    revisionId: document.revisionId,
  };
}

/** A failed create has no document UUID yet, so its selected slug is its
 * short-lived error identity. A later successful create clears only this
 * exact reminder, not unrelated errors on the same tab. */
function resourceForNewDocument(slug: string): PanelErrorResource {
  return {
    organizationId: ORGANIZATION_ID,
    resourceType: "legal_document_creation",
    resourceId: slug,
  };
}

const STATUS_TONES: Record<RevisionStatus, StatusBadgeTone> = {
  draft: "neutral",
  in_review: "wait",
  approved: "amber",
  published: "ok",
  archived: "soft",
};

const CAPABILITIES: ApprovalCapability[] = ["legal", "clinical", "business"];

/** Local mirror of `legal-documents.ts::describePublishBlock`, but reading
 * the backend's `ApiPublishBlock` (camelCase, `contentProblems`) instead of
 * the frontend `PublishBlock` union — the two shapes carry the same
 * information, just from different sides of the wire. */
function describeApiPublishBlock(
  document: LegalDocument,
  block: ApiPublishBlock,
): { title: string; description: string; details: string[] } {
  const name = document.title.trim() || KIND_LABELS[document.kind];

  if (block.stage === "content") {
    return {
      title: `Dokument „${name}“ nije objavljen — nepotpun sadržaj`,
      description:
        "Objava je zaustavljena pre slanja jer dokumentu nedostaju obavezna polja. Ispravite navedeno pa ponovite objavu.",
      details: block.contentProblems.map(
        (code) => CONTENT_PROBLEM_MESSAGES[code as ContentProblemCode] ?? code,
      ),
    };
  }

  if (block.stage === "transition") {
    return {
      title: `Dokument „${name}“ nije objavljen — pogrešan korak u toku`,
      description: `Dokument je u stanju „${STATUS_LABELS[document.status]}“. Objaviti se može samo dokument koji je prošao pregled i dobio status „${STATUS_LABELS.approved}“.`,
      details: [],
    };
  }

  return {
    title: `Dokument „${name}“ nije objavljen — nedostaju odobrenja`,
    description:
      "Ovaj dokument nosi pravnu težinu: kada ga korisnik prihvati, upisuje se koja je verzija prikazana. Zato objava traži sva navedena odobrenja.",
    details: [
      `Nedostaje: ${block.missing.map((capability) => CAPABILITY_LABELS[capability]).join(", ")}.`,
    ],
  };
}

function describeDocxImportError(error: unknown): string {
  if (!(error instanceof LegalDocumentsApiError)) {
    return "DOCX nije moguće obraditi. Zahtev nije stigao do servisa za uvoz.";
  }
  if (error.status === 401) {
    return "Prijava je istekla. Osvežite stranicu, prijavite se i ponovite uvoz.";
  }
  if (error.status === 403) {
    return "Nalog nema dozvolu za uvoz dokumenata u ovom radnom prostoru.";
  }
  if (error.status === 405) {
    return "DOCX uvoz nije pokrenut: aplikaciona ruta ne prihvata POST zahtev (405). Osvežite panel nakon restartovanja development servera.";
  }
  if (error.status === 413) {
    return "Fajl je prevelik. Maksimalna dozvoljena veličina je 15 MB.";
  }
  if (error.status === 503) {
    return "Backend za DOCX uvoz trenutno nije dostupan. Tekst i dalje možete uneti ručno.";
  }
  return error.message;
}

export function ScreenDokumenti() {
  const { reportError, errorsFor, clearErrorsForResource } = usePanelErrors();
  const queryClient = useQueryClient();
  // Shares the QueryProvider already mounted in the Control Center layout
  // (same pattern as screen-klijenti.tsx's team queue) — revisiting this tab
  // within the 30s staleTime serves cached documents instead of re-fetching
  // and re-flashing "Učitavanje…" on every remount.
  const documentsQuery = useQuery({
    queryKey: LEGAL_DOCUMENTS_QUERY_KEY,
    queryFn: fetchLegalDocuments,
  });
  const documents = documentsQuery.data ?? [];
  const loading = documentsQuery.isLoading;
  const loadError = documentsQuery.isError
    ? documentsQuery.error instanceof LegalDocumentsApiError
      ? documentsQuery.error.message
      : "Dokumenti se trenutno ne mogu učitati. Osvežite stranicu."
    : null;
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [docxPreview, setDocxPreview] = useState<{
    documentId: string;
    fileName: string;
    result: ApiImportDocxResult;
  } | null>(null);
  const [docxImportingId, setDocxImportingId] = useState<string | null>(null);

  const errors = errorsFor(HREF);
  const gateOpen = intakeGateOpen(documents);

  const replaceInList = (next: LegalDocument) => {
    queryClient.setQueryData<LegalDocument[]>(
      LEGAL_DOCUMENTS_QUERY_KEY,
      (current) =>
        (current ?? []).map((document) =>
          document.documentId === next.documentId ? next : document,
        ),
    );
  };

  const reportApiError = (
    document: LegalDocument,
    title: string,
    error: unknown,
  ) => {
    reportError({
      href: HREF,
      tabLabel: TAB_LABEL,
      resource: resourceFor(document),
      title,
      description:
        error instanceof LegalDocumentsApiError
          ? error.message
          : "Zahtev nije uspeo. Pokušajte ponovo.",
      details: [],
    });
  };

  const publish = async (document: LegalDocument) => {
    const block = await checkLegalDocumentPublishable(
      document.documentId,
      document.revisionId,
    ).catch(() => null);
    if (block) {
      // A blocked publish is reported, never thrown: the panel stays usable.
      reportError({
        href: HREF,
        tabLabel: TAB_LABEL,
        resource: resourceFor(document),
        ...describeApiPublishBlock(document, block),
      });
      return;
    }
    try {
      const next = await transitionLegalDocumentRevision(
        document.documentId,
        document.revisionId,
        "published",
      );
      replaceInList(next);
      // A successful re-check clears only this resource's errors (A.6) —
      // other documents' findings on the tab stay visible.
      clearErrorsForResource(resourceFor(document));
    } catch (error) {
      reportApiError(
        document,
        `Dokument „${document.title}“ nije objavljen`,
        error,
      );
    }
  };

  const advance = async (document: LegalDocument, target: RevisionStatus) => {
    try {
      const next = await transitionLegalDocumentRevision(
        document.documentId,
        document.revisionId,
        target,
      );
      replaceInList(next);
      clearErrorsForResource(resourceFor(document));
    } catch (error) {
      reportApiError(
        document,
        `Nedozvoljen korak za „${document.title}“`,
        error,
      );
    }
  };

  const grantApproval = async (
    document: LegalDocument,
    capability: ApprovalCapability,
  ) => {
    if (document.approvals.includes(capability)) return;
    try {
      const next = await recordLegalDocumentApproval(
        document.documentId,
        document.revisionId,
        capability,
      );
      replaceInList(next);
      clearErrorsForResource(resourceFor(document));
    } catch (error) {
      reportApiError(
        document,
        `Odobrenje nije zabeleženo za „${document.title}“`,
        error,
      );
    }
  };

  const removeApproval = async (
    document: LegalDocument,
    capability: ApprovalCapability,
  ) => {
    if (!document.approvals.includes(capability)) return;
    try {
      const next = await removeLegalDocumentApproval(
        document.documentId,
        document.revisionId,
        capability,
      );
      replaceInList(next);
      clearErrorsForResource(resourceFor(document));
    } catch (error) {
      reportApiError(
        document,
        `Odobrenje nije poništeno za „${document.title}“`,
        error,
      );
    }
  };

  const saveBody = async (
    document: LegalDocument,
    body: RichDoc,
  ): Promise<boolean> => {
    try {
      // The backend reissues internally (A.2) when the current status is
      // `approved`/`archived` — the panel does not predict that locally
      // anymore, it just displays whatever revision comes back.
      const next = await updateLegalDocumentRevision(
        document.documentId,
        document.revisionId,
        { body },
      );
      replaceInList(next);
      clearErrorsForResource(resourceFor(document));
      return true;
    } catch (error) {
      reportApiError(
        document,
        `Izmena nije sačuvana za „${document.title}“`,
        error,
      );
      return false;
    }
  };

  const previewDocx = async (document: LegalDocument, file: File) => {
    setDocxImportingId(document.documentId);
    setDocxPreview(null);
    try {
      const result = await importLegalDocumentDocx(document.documentId, file);
      setDocxPreview({
        documentId: document.documentId,
        fileName: file.name,
        result,
      });
    } catch (error) {
      reportError({
        href: HREF,
        tabLabel: TAB_LABEL,
        resource: resourceFor(document),
        title: `DOCX „${file.name}” nije uvezen`,
        description: describeDocxImportError(error),
        details: [],
      });
    } finally {
      setDocxImportingId(null);
    }
  };

  const remove = async (document: LegalDocument) => {
    // D-045 / A.1: only drafts are hard-deletable; the button is hidden for
    // the rest, but hiding is never the protection — the guard is.
    if (!canDelete(document.status)) {
      setPendingDeleteId(null);
      reportError({
        href: HREF,
        tabLabel: TAB_LABEL,
        resource: resourceFor(document),
        title: `Dokument „${document.title}“ nije obrisan`,
        description: `Revizija u stanju „${STATUS_LABELS[document.status]}“ se ne briše — objavljeno i arhivirano se čuva zbog istorije saglasnosti (D-045). Dozvoljeno je samo arhiviranje.`,
        details: [],
      });
      return;
    }
    try {
      await deleteLegalDocumentRevision(
        document.documentId,
        document.revisionId,
      );
      queryClient.setQueryData<LegalDocument[]>(
        LEGAL_DOCUMENTS_QUERY_KEY,
        (current) =>
          (current ?? []).filter(
            (entry) => entry.documentId !== document.documentId,
          ),
      );
      if (selectedId === document.documentId) setSelectedId(null);
    } catch (error) {
      reportApiError(
        document,
        `Dokument „${document.title}“ nije obrisan`,
        error,
      );
    } finally {
      setPendingDeleteId(null);
    }
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
          onCreate={async (input) => {
            try {
              const created = await createLegalDocument({
                kind: input.kind,
                title: input.title,
                slug: input.slug,
                body: input.body,
              });
              queryClient.setQueryData<LegalDocument[]>(
                LEGAL_DOCUMENTS_QUERY_KEY,
                (current) => [...(current ?? []), created],
              );
              clearErrorsForResource(resourceForNewDocument(input.slug));
              setCreating(false);
              setSelectedId(created.documentId);
            } catch (error) {
              reportError({
                href: HREF,
                tabLabel: TAB_LABEL,
                resource: resourceForNewDocument(input.slug),
                title: "Nova stranica nije sačuvana",
                description:
                  error instanceof LegalDocumentsApiError
                    ? error.message
                    : "Zahtev nije uspeo. Pokušajte ponovo.",
                details: [],
              });
            }
          }}
        />
      ) : null}

      {loading ? (
        <p className="text-ink-55 text-[13.5px]">Učitavanje…</p>
      ) : (
        <div className="flex flex-col gap-2.5">
          {documents.map((document) => {
            const missing = missingApprovals(document.kind, document.approvals);
            const isSelected = document.documentId === selectedId;
            // Published and archived revisions are immutable (D-045); a change
            // goes through „Nova radna verzija" which issues a new revision.
            const isEditable =
              document.status === "draft" || document.status === "approved";
            const approvalsEditable =
              document.status === "draft" || document.status === "in_review";

            return (
              <div
                key={document.documentId}
                className="rounded-panel border-line bg-surface border px-5 py-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <span className="text-coffee text-[15px] font-semibold">
                        {document.title}
                      </span>
                      <StatusBadge tone={STATUS_TONES[document.status]}>
                        {STATUS_LABELS[document.status]}
                      </StatusBadge>
                      <span className="text-ink-55 text-xs">
                        {document.versionLabel}
                      </span>
                    </div>
                    <div className="text-ink-55 mt-1 text-[12.5px]">
                      /{document.slug} · {KIND_LABELS[document.kind]}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <ActorBadge
                        action="Kreirao/la"
                        actor={document.createdBy ?? null}
                      />
                      <ActorBadge
                        action="Poslednja izmena"
                        actor={document.updatedBy ?? null}
                      />
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setSelectedId(isSelected ? null : document.documentId)
                    }
                    aria-expanded={isSelected}
                    className="border-line-strong text-ink-70 hover:border-coffee/40 cursor-pointer rounded-full border bg-transparent px-4 py-2 text-[13px] font-semibold transition-colors"
                  >
                    {isSelected ? "Zatvori uređivanje" : "Uredi"}
                  </button>
                </div>

                {isSelected ? (
                  <div className="border-line mt-4 border-t pt-4">
                    <label className="text-ink-70 mb-1.5 block text-[13px] font-semibold">
                      Sadržaj
                    </label>
                    {isEditable ? (
                      // Real Tiptap editor (CG-C5) — schema-restricted to
                      // RichDoc's node/mark set. Uncontrolled after mount,
                      // keyed on revisionId so a reissue (A.2) or a fetched
                      // update remounts it with the new body instead of
                      // showing stale content.
                      <RichTextEditor
                        key={document.revisionId}
                        value={document.body}
                        onChange={(next) => void saveBody(document, next)}
                      />
                    ) : (
                      <div
                        id={`body-note-${document.documentId}`}
                        className="border-line-strong bg-panel-canvas rich-text-editor-surface rounded-tile max-h-[500px] overflow-y-auto border px-3.5 py-2.5 pr-2 text-sm leading-[1.6] opacity-70"
                      >
                        <RichText doc={document.body} className="text-sm" />
                      </div>
                    )}
                    {isEditable ? (
                      <div className="mt-3">
                        <label className="border-line-strong text-ink-70 hover:border-coffee/40 inline-flex cursor-pointer rounded-full border bg-transparent px-4 py-2 text-[13px] font-semibold transition-colors">
                          {docxImportingId === document.documentId
                            ? "Uvoz DOCX-a…"
                            : "Uvezi .docx"}
                          <input
                            type="file"
                            accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                            disabled={docxImportingId === document.documentId}
                            className="sr-only"
                            onChange={(event) => {
                              const file = event.target.files?.[0];
                              event.currentTarget.value = "";
                              if (file) void previewDocx(document, file);
                            }}
                          />
                        </label>
                        <p className="text-ink-55 mt-1.5 text-[12px]">
                          Uvoz prvo pravi pregled; postojeći tekst se ne menja
                          dok izričito ne primenite rezultat.
                        </p>
                      </div>
                    ) : null}
                    {docxPreview?.documentId === document.documentId ? (
                      <div className="border-line bg-panel-canvas rounded-tile mt-3 border px-4 py-3">
                        <p className="text-coffee text-[13.5px] font-semibold">
                          Pregled uvoza: {docxPreview.fileName}
                        </p>
                        {docxPreview.result.findings.length > 0 ? (
                          <DocxImportFindings result={docxPreview.result} />
                        ) : (
                          <p className="text-ink-55 mt-1 text-[12.5px]">
                            Dokument je normalizovan bez upozorenja.
                          </p>
                        )}
                        <div className="mt-3 flex flex-wrap gap-2">
                          <ActionButton
                            label="Primeni uvezeni sadržaj"
                            onClick={() => {
                              void saveBody(
                                document,
                                docxPreview.result.body,
                              ).then((saved) => {
                                if (saved) setDocxPreview(null);
                              });
                            }}
                          />
                          <ActionButton
                            label="Odustani"
                            onClick={() => setDocxPreview(null)}
                          />
                        </div>
                      </div>
                    ) : null}
                    {isEditable ? null : (
                      <p
                        id={`body-note-${document.documentId}`}
                        className="text-ink-55 mt-1.5 text-[12px]"
                      >
                        {document.status === "in_review"
                          ? "Tekst je na pregledu — vratite ga na doradu da biste menjali sadržaj."
                          : "Objavljena/arhivirana verzija se ne menja (D-045). Za izmenu napravite novu radnu verziju."}
                      </p>
                    )}

                    <div className="mt-4">
                      <div className="text-ink-70 mb-2 text-[13px] font-semibold">
                        Odobrenja ({REQUIRED_APPROVALS[document.kind].length}{" "}
                        obavezno · {document.approvals.length} evidentirano)
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {CAPABILITIES.map((capability) => {
                          const required =
                            REQUIRED_APPROVALS[document.kind].includes(
                              capability,
                            );
                          const granted =
                            document.approvals.includes(capability);
                          const evidence = document.approvalEvidence?.find(
                            (item) => item.capability === capability,
                          );
                          return (
                            <label
                              key={capability}
                              className={`flex items-center gap-2 rounded-full border px-3.5 py-2 text-[13px] font-semibold transition-colors ${
                                granted
                                  ? approvalsEditable
                                    ? "border-badge-ok/45 bg-badge-ok-bg text-badge-ok cursor-pointer"
                                    : "border-badge-ok/45 bg-badge-ok-bg text-badge-ok cursor-default"
                                  : approvalsEditable
                                    ? "border-line-strong text-ink-70 cursor-pointer"
                                    : "border-line-strong text-ink-55 cursor-default"
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={granted}
                                disabled={!approvalsEditable}
                                onChange={() =>
                                  void (granted
                                    ? removeApproval(document, capability)
                                    : grantApproval(document, capability))
                                }
                                className="accent-sage"
                              />
                              {CAPABILITY_LABELS[capability]}
                              {evidence?.approvedBy
                                ? ` · ${evidence.approvedBy.displayName}`
                                : ""}
                              {required ? null : (
                                <span className="text-ink-55 font-normal">
                                  (nije obavezno)
                                </span>
                              )}
                            </label>
                          );
                        })}
                      </div>
                      {missing.length > 0 ? (
                        <p className="text-ink-55 mt-2 text-[12.5px]">
                          Za objavu još nedostaje:{" "}
                          {missing
                            .map((capability) => CAPABILITY_LABELS[capability])
                            .join(", ")}
                          .
                        </p>
                      ) : null}
                    </div>

                    <div className="mt-5 flex flex-wrap items-center gap-2.5">
                      {document.status === "draft" ? (
                        <ActionButton
                          onClick={() => void advance(document, "in_review")}
                          label="Pošalji na pregled"
                        />
                      ) : null}
                      {document.status === "in_review" ? (
                        <>
                          <ActionButton
                            onClick={() => void advance(document, "approved")}
                            label="Označi kao odobreno"
                          />
                          <ActionButton
                            onClick={() => void advance(document, "draft")}
                            label="Vrati na doradu"
                          />
                        </>
                      ) : null}
                      {document.status === "approved" ? (
                        <ActionButton
                          onClick={() => void advance(document, "draft")}
                          label="Nova radna verzija"
                        />
                      ) : null}
                      {document.status === "published" ? (
                        <>
                          <ActionButton
                            onClick={() => void advance(document, "archived")}
                            label="Arhiviraj"
                          />
                          <p className="text-ink-55 text-[12.5px]">
                            Dokument je već javan. Za izmenu ga arhivirajte,
                            zatim napravite novu radnu verziju.
                          </p>
                        </>
                      ) : null}
                      {document.status === "archived" ? (
                        <ActionButton
                          onClick={() => void advance(document, "draft")}
                          label="Nova radna verzija"
                        />
                      ) : null}
                      {document.status === "approved" ? (
                        <button
                          type="button"
                          onClick={() => void publish(document)}
                          className="bg-forest text-panel-canvas hover:bg-forest-hover cursor-pointer rounded-full border-0 px-5 py-2.5 text-[13px] font-semibold transition-colors"
                        >
                          Objavi
                        </button>
                      ) : null}
                      {canDelete(document.status) ? (
                        <button
                          type="button"
                          onClick={() =>
                            setPendingDeleteId(document.documentId)
                          }
                          className="border-danger/45 text-danger hover:bg-danger/8 cursor-pointer rounded-full border bg-transparent px-5 py-2.5 text-[13px] font-semibold transition-colors"
                        >
                          Obriši
                        </button>
                      ) : null}
                    </div>

                    {pendingDeleteId === document.documentId &&
                    canDelete(document.status) ? (
                      <div className="border-danger/45 bg-danger/8 rounded-tile mt-4 px-4 py-3">
                        <p className="text-coffee text-[13.5px] font-semibold">
                          Obrisati „{document.title}“?
                        </p>
                        <p className="text-ink-70 mt-1 text-[12.5px] leading-[1.5]">
                          Radna verzija se briše bez posledica po javni sajt.
                          Objavljene i arhivirane verzije se ne brišu — samo
                          arhiviraju (D-045).
                        </p>
                        <div className="mt-3 flex gap-2.5">
                          <button
                            type="button"
                            onClick={() => void remove(document)}
                            className="bg-danger text-panel-canvas cursor-pointer rounded-full border-0 px-4 py-2 text-[13px] font-semibold"
                          >
                            Obriši
                          </button>
                          <button
                            type="button"
                            onClick={() => setPendingDeleteId(null)}
                            className="border-line-strong text-ink-70 cursor-pointer rounded-full border bg-transparent px-4 py-2 text-[13px] font-semibold"
                          >
                            Odustani
                          </button>
                        </div>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

function ActionButton({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="border-line-strong text-ink-70 hover:border-coffee/40 cursor-pointer rounded-full border bg-transparent px-5 py-2.5 text-[13px] font-semibold transition-colors"
    >
      {label}
    </button>
  );
}

const CREATABLE_KINDS: LegalDocumentKind[] = [
  "custom_document",
  "privacy_policy",
  "terms_of_use",
  "cookie_policy",
  "booking_rules",
  "intake_data_processing_notice",
  "intake_request_acknowledgement",
];
const RESERVED_CUSTOM_DOCUMENT_SLUGS = new Set([
  "booking-widget",
  "cene",
  "kolacici",
  "kontakt",
  "o-nama",
  "podrska-roditeljima",
  "pravila-zakazivanja",
  "privatnost",
  "pronadji-podrsku",
  "rad-sa-kompanijama",
  "radionice",
  "tim",
  "uslovi",
  "usluge",
  "zakazi",
  "znanje",
]);

interface NewDocumentInput {
  kind: LegalDocumentKind;
  title: string;
  slug: string;
  body: RichDoc;
}

function NewDocumentForm({
  existingSlugs,
  existingKinds,
  onCancel,
  onCreate,
}: {
  existingSlugs: string[];
  existingKinds: LegalDocumentKind[];
  onCancel: () => void;
  onCreate: (input: NewDocumentInput) => void | Promise<void>;
}) {
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [body, setBody] = useState<RichDoc>(() => emptyRichDoc());
  const [kind, setKind] = useState<LegalDocumentKind>("custom_document");
  const [submitting, setSubmitting] = useState(false);
  const [editorRevision, setEditorRevision] = useState(0);
  const [docxImporting, setDocxImporting] = useState(false);
  const [docxPreview, setDocxPreview] = useState<{
    fileName: string;
    result: ApiImportDocxResult;
  } | null>(null);
  const [docxError, setDocxError] = useState<string | null>(null);

  const effectiveSlug = slugTouched ? slug : slugify(title);
  const slugTaken = existingSlugs.includes(effectiveSlug);
  const slugInvalid = effectiveSlug.length > 0 && !isValidSlug(effectiveSlug);
  const slugReserved =
    kind === "custom_document" &&
    RESERVED_CUSTOM_DOCUMENT_SLUGS.has(effectiveSlug);
  const availableKinds = CREATABLE_KINDS.filter(
    (value) => value === "custom_document" || !existingKinds.includes(value),
  );
  const canSubmit =
    title.trim().length > 0 &&
    effectiveSlug.length > 0 &&
    !slugTaken &&
    !slugInvalid &&
    !slugReserved &&
    !submitting;

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (!canSubmit) return;
        setSubmitting(true);
        void Promise.resolve(
          onCreate({
            kind,
            title: title.trim(),
            slug: effectiveSlug,
            body,
          }),
        ).finally(() => setSubmitting(false));
      }}
      className="rounded-panel border-line bg-surface mb-4 border px-5 py-5"
    >
      <h3 className="text-forest mb-4 font-serif text-lg">Nova stranica</h3>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label
            htmlFor="new-doc-title"
            className="text-ink-70 mb-1.5 block text-[13px] font-semibold"
          >
            Naziv
          </label>
          <input
            id="new-doc-title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Politika privatnosti"
            className="border-line-strong rounded-tile bg-panel-canvas text-coffee focus:border-sage w-full border px-3.5 py-2.5 text-sm outline-none"
          />
        </div>

        <div>
          <label
            htmlFor="new-doc-slug"
            className="text-ink-70 mb-1.5 block text-[13px] font-semibold"
          >
            Slug
          </label>
          <input
            id="new-doc-slug"
            value={effectiveSlug}
            onChange={(event) => {
              setSlugTouched(true);
              setSlug(event.target.value);
            }}
            placeholder="politika-privatnosti"
            aria-describedby="new-doc-slug-hint"
            className="border-line-strong rounded-tile bg-panel-canvas text-coffee focus:border-sage w-full border px-3.5 py-2.5 text-sm outline-none"
          />
          <p id="new-doc-slug-hint" className="text-ink-55 mt-1.5 text-[12px]">
            {slugTaken
              ? "Ovaj slug već postoji."
              : slugReserved
                ? "Ovaj slug pripada postojećoj sistemskoj stranici."
                : slugInvalid
                  ? "Dozvoljena su mala slova, brojevi i crtica."
                  : "Popunjava se automatski iz naziva; možete ga izmeniti."}
          </p>
        </div>
      </div>

      <div className="mt-4">
        <label
          htmlFor="new-doc-kind"
          className="text-ink-70 mb-1.5 block text-[13px] font-semibold"
        >
          Vrsta dokumenta
        </label>
        <select
          id="new-doc-kind"
          value={kind}
          onChange={(event) => setKind(event.target.value as LegalDocumentKind)}
          className="border-line-strong rounded-tile bg-panel-canvas text-coffee focus:border-sage w-full border px-3.5 py-2.5 text-sm outline-none md:w-[340px]"
        >
          {availableKinds.map((value) => (
            <option key={value} value={value}>
              {KIND_LABELS[value]}
            </option>
          ))}
        </select>
        <p className="text-ink-55 mt-1.5 text-[12px]">
          Vrsta određuje koja su odobrenja obavezna za objavu:{" "}
          {REQUIRED_APPROVALS[kind]
            .map((capability) => CAPABILITY_LABELS[capability])
            .join(", ")}
          .
        </p>
        <p className="text-ink-70 mt-1 text-[12px]">
          Ovo ne blokira unos, DOCX pregled ni čuvanje radne verzije. Odobrenja
          se proveravaju tek u toku objave.
        </p>
      </div>

      <div className="mt-4">
        <div className="text-ink-70 mb-1.5 text-[13px] font-semibold">
          Sadržaj
        </div>
        <RichTextEditor key={editorRevision} value={body} onChange={setBody} />
        <div className="mt-3">
          <label className="border-line-strong text-ink-70 hover:border-coffee/40 inline-flex cursor-pointer rounded-full border bg-transparent px-4 py-2 text-[13px] font-semibold transition-colors">
            {docxImporting ? "Uvoz DOCX-a…" : "Uvezi .docx"}
            <input
              type="file"
              accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              disabled={docxImporting}
              className="sr-only"
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.currentTarget.value = "";
                if (!file) return;
                setDocxImporting(true);
                setDocxError(null);
                setDocxPreview(null);
                void previewNewLegalDocumentDocx(file)
                  .then((result) =>
                    setDocxPreview({ fileName: file.name, result }),
                  )
                  .catch((error: unknown) =>
                    setDocxError(describeDocxImportError(error)),
                  )
                  .finally(() => setDocxImporting(false));
              }}
            />
          </label>
          <p className="text-ink-55 mt-1.5 text-[12px]">
            Uvoz prvo pravi pregled. Sadržaj se primenjuje tek kada ga potvrdite
            i čuva zajedno sa novom radnom verzijom. Sada se proveravaju format
            fajla i bezbedno parsiranje, ne pravna potpunost teksta.
          </p>
        </div>
        {docxError ? (
          <p className="text-danger mt-2 text-[12.5px]">{docxError}</p>
        ) : null}
        {docxPreview ? (
          <div className="border-line bg-panel-canvas rounded-tile mt-3 border px-4 py-3">
            <p className="text-coffee text-[13.5px] font-semibold">
              Pregled uvoza: {docxPreview.fileName}
            </p>
            {docxPreview.result.findings.length > 0 ? (
              <DocxImportFindings result={docxPreview.result} />
            ) : (
              <p className="text-ink-55 mt-1 text-[12.5px]">
                Dokument je normalizovan bez upozorenja.
              </p>
            )}
            <div className="mt-3 flex flex-wrap gap-2">
              <ActionButton
                label="Primeni uvezeni sadržaj"
                onClick={() => {
                  setBody(docxPreview.result.body);
                  setEditorRevision((current) => current + 1);
                  setDocxPreview(null);
                }}
              />
              <ActionButton
                label="Odustani"
                onClick={() => setDocxPreview(null)}
              />
            </div>
          </div>
        ) : null}
      </div>

      <div className="mt-5 flex items-center gap-2.5">
        <button
          type="submit"
          disabled={!canSubmit}
          className="bg-forest text-panel-canvas hover:bg-forest-hover cursor-pointer rounded-full border-0 px-5 py-2.5 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? "Čuvanje…" : "Sačuvaj kao radnu verziju"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="border-line-strong text-ink-70 hover:border-coffee/40 cursor-pointer rounded-full border bg-transparent px-5 py-2.5 text-sm font-semibold transition-colors"
        >
          Odustani
        </button>
      </div>
    </form>
  );
}

const IMPORT_FINDING_LABELS = {
  info: "Informacija",
  warning: "Upozorenje",
  error: "Greška",
} as const;

function DocxImportFindings({ result }: { result: ApiImportDocxResult }) {
  return (
    <ul className="mt-2 space-y-2 text-[12.5px] leading-[1.5]">
      {result.findings.map((finding, index) => (
        <li
          key={`${finding.ruleId}-${finding.fieldPath ?? ""}-${finding.message}-${index}`}
          className="border-line-strong rounded-tile border px-3 py-2"
        >
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full px-2 py-0.5 text-[10.5px] font-semibold tracking-[0.04em] uppercase ${
                finding.severity === "error"
                  ? "bg-badge-danger-bg text-badge-danger"
                  : finding.severity === "warning"
                    ? "bg-badge-amber-bg text-badge-amber"
                    : "bg-badge-neutral-bg text-badge-neutral"
              }`}
            >
              {IMPORT_FINDING_LABELS[finding.severity]}
            </span>
            <code className="text-ink-55 text-[10.5px]">{finding.ruleId}</code>
          </div>
          <p className="text-coffee mt-1.5 font-medium">{finding.message}</p>
          {finding.remediation ? (
            <p className="text-ink-70 mt-1">
              Šta uraditi: {finding.remediation}
            </p>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
