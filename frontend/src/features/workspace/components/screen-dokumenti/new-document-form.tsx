"use client";

import { useState } from "react";

import { RichTextEditor } from "@/components/content/rich-text-editor";
import { emptyRichDoc, type RichDoc } from "@/lib/content-governance/rich-doc";

import {
  CAPABILITY_LABELS,
  KIND_LABELS,
  REQUIRED_APPROVALS,
  isValidSlug,
  slugify,
  type LegalDocumentKind,
} from "../../legal-documents";
import {
  previewNewLegalDocumentDocx,
  type ApiImportDocxResult,
} from "../../legal-documents-api";
import { reservedCustomDocumentSlugs } from "../../reserved-custom-document-slugs";
import { ActionButton } from "./action-button";
import { describeDocxImportError } from "./helpers";
import { DocxImportFindings } from "./docx-import-findings";

const CREATABLE_KINDS: LegalDocumentKind[] = [
  "custom_document",
  "privacy_policy",
  "terms_of_use",
  "cookie_policy",
  "booking_rules",
  "intake_data_processing_notice",
  "intake_request_acknowledgement",
];
export interface NewDocumentInput {
  kind: LegalDocumentKind;
  title: string;
  slug: string;
  body: RichDoc;
}

export function NewDocumentForm({
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
    reservedCustomDocumentSlugs.has(effectiveSlug);
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
