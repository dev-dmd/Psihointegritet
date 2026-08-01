"use client";

import { ActorBadge } from "@/components/panel/actor-badge";
import { StatusBadge } from "@/components/panel/status-badge";
import { RichText } from "@/components/content/rich-text";
import { RichTextEditor } from "@/components/content/rich-text-editor";
import type { RichDoc } from "@/lib/content-governance/rich-doc";

import type { DocxPreviewState } from "../../hooks/use-legal-documents";
import {
  CAPABILITY_LABELS,
  KIND_LABELS,
  REQUIRED_APPROVALS,
  STATUS_LABELS,
  canDelete,
  missingApprovals,
  type ApprovalCapability,
  type LegalDocument,
  type RevisionStatus,
} from "../../legal-documents";
import { ActionButton } from "./action-button";
import { DocxImportFindings } from "./docx-import-findings";
import { CAPABILITIES, STATUS_TONES } from "./helpers";

export interface LegalDocumentCardProps {
  document: LegalDocument;
  isSelected: boolean;
  docxPreview: DocxPreviewState | null;
  isImportingDocx: boolean;
  isPendingDelete: boolean;
  onToggleSelect: () => void;
  onSaveBody: (document: LegalDocument, body: RichDoc) => void;
  onApplyImport: (document: LegalDocument, body: RichDoc) => void;
  onDiscardImport: () => void;
  onPreviewDocx: (document: LegalDocument, file: File) => void;
  onApproval: (
    document: LegalDocument,
    capability: ApprovalCapability,
    action: "grant" | "revoke",
  ) => void;
  onAdvance: (document: LegalDocument, target: RevisionStatus) => void;
  onPublish: (document: LegalDocument) => void;
  onRequestDelete: (documentId: string | null) => void;
  onConfirmDelete: (document: LegalDocument) => void;
}

/** One document row: header, body editor/preview, `.docx` import preview,
 * approval matrix and the lifecycle actions permitted for its status. */
export function LegalDocumentCard({
  document,
  isSelected,
  docxPreview,
  isImportingDocx,
  isPendingDelete,
  onToggleSelect,
  onSaveBody,
  onApplyImport,
  onDiscardImport,
  onPreviewDocx,
  onApproval,
  onAdvance,
  onPublish,
  onRequestDelete,
  onConfirmDelete,
}: LegalDocumentCardProps) {
  const missing = missingApprovals(document.kind, document.approvals);
  // Published and archived revisions are immutable (D-045); a change goes
  // through „Nova radna verzija" which issues a new revision.
  const isEditable =
    document.status === "draft" || document.status === "approved";
  const approvalsEditable =
    document.status === "draft" || document.status === "in_review";

  return (
    <div className="rounded-panel border-line bg-surface border px-5 py-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="text-coffee text-[15px] font-semibold">
              {document.title}
            </span>
            <StatusBadge tone={STATUS_TONES[document.status]}>
              {STATUS_LABELS[document.status]}
            </StatusBadge>
            <span className="text-ink-55 text-xs">{document.versionLabel}</span>
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
          onClick={() => onToggleSelect()}
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
              onChange={(next) => onSaveBody(document, next)}
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
                {isImportingDocx ? "Uvoz DOCX-a…" : "Uvezi .docx"}
                <input
                  type="file"
                  accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  disabled={isImportingDocx}
                  className="sr-only"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    event.currentTarget.value = "";
                    if (file) onPreviewDocx(document, file);
                  }}
                />
              </label>
              <p className="text-ink-55 mt-1.5 text-[12px]">
                Uvoz prvo pravi pregled; postojeći tekst se ne menja dok
                izričito ne primenite rezultat.
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
                  onClick={() =>
                    onApplyImport(document, docxPreview.result.body)
                  }
                />
                <ActionButton
                  label="Odustani"
                  onClick={() => onDiscardImport()}
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
              Odobrenja ({REQUIRED_APPROVALS[document.kind].length} obavezno ·{" "}
              {document.approvals.length} evidentirano)
            </div>
            <div className="flex flex-wrap gap-2">
              {CAPABILITIES.map((capability) => {
                const required =
                  REQUIRED_APPROVALS[document.kind].includes(capability);
                const granted = document.approvals.includes(capability);
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
                        onApproval(
                          document,
                          capability,
                          granted ? "revoke" : "grant",
                        )
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
                onClick={() => onAdvance(document, "in_review")}
                label="Pošalji na pregled"
              />
            ) : null}
            {document.status === "in_review" ? (
              <>
                <ActionButton
                  onClick={() => onAdvance(document, "approved")}
                  label="Označi kao odobreno"
                />
                <ActionButton
                  onClick={() => onAdvance(document, "draft")}
                  label="Vrati na doradu"
                />
              </>
            ) : null}
            {document.status === "approved" ? (
              <ActionButton
                onClick={() => onAdvance(document, "draft")}
                label="Nova radna verzija"
              />
            ) : null}
            {document.status === "published" ? (
              <>
                <ActionButton
                  onClick={() => onAdvance(document, "archived")}
                  label="Arhiviraj"
                />
                <p className="text-ink-55 text-[12.5px]">
                  Dokument je već javan. Za izmenu ga arhivirajte, zatim
                  napravite novu radnu verziju.
                </p>
              </>
            ) : null}
            {document.status === "archived" ? (
              <ActionButton
                onClick={() => onAdvance(document, "draft")}
                label="Nova radna verzija"
              />
            ) : null}
            {document.status === "approved" ? (
              <button
                type="button"
                onClick={() => onPublish(document)}
                className="bg-forest text-panel-canvas hover:bg-forest-hover cursor-pointer rounded-full border-0 px-5 py-2.5 text-[13px] font-semibold transition-colors"
              >
                Objavi
              </button>
            ) : null}
            {canDelete(document.status) ? (
              <button
                type="button"
                onClick={() => onRequestDelete(document.documentId)}
                className="border-danger/45 text-danger hover:bg-danger/8 cursor-pointer rounded-full border bg-transparent px-5 py-2.5 text-[13px] font-semibold transition-colors"
              >
                Obriši
              </button>
            ) : null}
          </div>

          {isPendingDelete && canDelete(document.status) ? (
            <div className="border-danger/45 bg-danger/8 rounded-tile mt-4 px-4 py-3">
              <p className="text-coffee text-[13.5px] font-semibold">
                Obrisati „{document.title}“?
              </p>
              <p className="text-ink-70 mt-1 text-[12.5px] leading-[1.5]">
                Radna verzija se briše bez posledica po javni sajt. Objavljene i
                arhivirane verzije se ne brišu — samo arhiviraju (D-045).
              </p>
              <div className="mt-3 flex gap-2.5">
                <button
                  type="button"
                  onClick={() => onConfirmDelete(document)}
                  className="bg-danger text-panel-canvas cursor-pointer rounded-full border-0 px-4 py-2 text-[13px] font-semibold"
                >
                  Obriši
                </button>
                <button
                  type="button"
                  onClick={() => onRequestDelete(null)}
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
}
