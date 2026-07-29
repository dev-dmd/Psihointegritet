"use client";

import { useState } from "react";

import { ErrorBanner } from "@/components/panel/error-banner";
import {
  StatusBadge,
  type StatusBadgeTone,
} from "@/components/panel/status-badge";
import { RichText } from "@/components/content/rich-text";
import { richDocFromPlainText, richDocText } from "@/lib/content-governance/rich-doc";

import {
  CAPABILITY_LABELS,
  KIND_LABELS,
  REQUIRED_APPROVALS,
  STATUS_LABELS,
  applyTransition,
  canDelete,
  checkPublishable,
  describePublishBlock,
  intakeGateOpen,
  isValidSlug,
  missingApprovals,
  slugify,
  type ApprovalCapability,
  type LegalDocument,
  type LegalDocumentKind,
  type RevisionStatus,
} from "../legal-documents";
import { usePanelErrors, type PanelErrorResource } from "../panel-errors";
import { seedLegalDocuments } from "../data";
import { PageHeader } from "./page-header";

const HREF = "/radni-prostor/dokumenti" as const;
const TAB_LABEL = "Dokumenti i saglasnosti";
/** Single-tenant seed org; the backend membership check owns the real value. */
const ORGANIZATION_ID = "psihointegritet";
const RESOURCE_TYPE = "legal_document";

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

const STATUS_TONES: Record<RevisionStatus, StatusBadgeTone> = {
  draft: "neutral",
  in_review: "wait",
  approved: "amber",
  published: "ok",
  archived: "soft",
};

const CAPABILITIES: ApprovalCapability[] = ["legal", "clinical", "business"];

export function ScreenDokumenti() {
  const { reportError, errorsFor, clearError, clearErrorsForResource } =
    usePanelErrors();
  const [documents, setDocuments] =
    useState<LegalDocument[]>(seedLegalDocuments);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const errors = errorsFor(HREF);
  const gateOpen = intakeGateOpen(documents);

  const update = (documentId: string, patch: Partial<LegalDocument>) => {
    setDocuments((current) =>
      current.map((document) =>
        document.documentId === documentId
          ? { ...document, ...patch, updatedAt: new Date().toISOString() }
          : document,
      ),
    );
  };

  const replace = (next: LegalDocument) => {
    setDocuments((current) =>
      current.map((document) =>
        document.documentId === next.documentId
          ? { ...next, updatedAt: new Date().toISOString() }
          : document,
      ),
    );
  };

  const publish = (document: LegalDocument) => {
    const check = checkPublishable(document);
    if (!check.ok) {
      // A blocked publish is reported, never thrown: the panel stays usable.
      const explained = describePublishBlock(document, check.block);
      reportError({
        href: HREF,
        tabLabel: TAB_LABEL,
        resource: resourceFor(document),
        ...explained,
      });
      return;
    }

    setDocuments((current) =>
      current.map((entry) => {
        // Only one revision of a kind can be published at a time.
        if (entry.kind === document.kind && entry.status === "published") {
          return { ...entry, status: "archived" as RevisionStatus };
        }
        return entry.documentId === document.documentId
          ? {
              ...entry,
              status: "published" as RevisionStatus,
              updatedAt: new Date().toISOString(),
            }
          : entry;
      }),
    );
    // A successful re-check clears only this resource's errors (A.6) — other
    // documents' findings on the tab stay visible.
    clearErrorsForResource(resourceFor(document));
  };

  const advance = (document: LegalDocument, target: RevisionStatus) => {
    const next = applyTransition(document, target);
    if (next === null) {
      reportError({
        href: HREF,
        tabLabel: TAB_LABEL,
        resource: resourceFor(document),
        title: `Nedozvoljen korak za „${document.title}“`,
        description: `Iz stanja „${STATUS_LABELS[document.status]}“ ne može se preći u „${STATUS_LABELS[target]}“.`,
        details: [],
      });
      return;
    }
    replace(next);
  };

  const toggleApproval = (
    document: LegalDocument,
    capability: ApprovalCapability,
  ) => {
    const has = document.approvals.includes(capability);
    update(document.documentId, {
      approvals: has
        ? document.approvals.filter((entry) => entry !== capability)
        : [...document.approvals, capability],
    });
  };

  const remove = (document: LegalDocument) => {
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
    setDocuments((current) =>
      current.filter((entry) => entry.documentId !== document.documentId),
    );
    if (selectedId === document.documentId) setSelectedId(null);
    setPendingDeleteId(null);
  };

  return (
    <section className="animate-fade-up">
      <PageHeader
        title="Dokumenti i saglasnosti"
        description="Pravni tekstovi i tekstovi saglasnosti koje tim uređuje sam. Objavljena verzija je ono što korisnik vidi i na šta pristaje — zato objava traži odobrenja."
      />

      <ErrorBanner errors={errors} onDismiss={clearError} />

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
          onCancel={() => setCreating(false)}
          onCreate={(document) => {
            setDocuments((current) => [...current, document]);
            setCreating(false);
            setSelectedId(document.documentId);
          }}
        />
      ) : null}

      <div className="flex flex-col gap-2.5">
        {documents.map((document) => {
          const missing = missingApprovals(document.kind, document.approvals);
          const isSelected = document.documentId === selectedId;
          // Published and archived revisions are immutable (D-045); a change
          // goes through „Nova radna verzija" which issues a new revision.
          const isEditable =
            document.status === "draft" || document.status === "approved";

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
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setSelectedId(isSelected ? null : document.documentId)
                  }
                  aria-expanded={isSelected}
                  className="border-line-strong text-ink-70 hover:border-coffee/40 cursor-pointer rounded-full border bg-transparent px-4 py-2 text-[13px] font-semibold transition-colors"
                >
                  {isSelected ? "Zatvori" : "Uredi"}
                </button>
              </div>

              {isSelected ? (
                <div className="border-line mt-4 border-t pt-4">
                  <label
                    htmlFor={`body-${document.documentId}`}
                    className="text-ink-70 mb-1.5 block text-[13px] font-semibold"
                  >
                    Sadržaj
                  </label>
                  {/*
                   * Phase-0 stopgap (D-047): a plain-text textarea that
                   * round-trips through `richDocFromPlainText`/`richDocText`
                   * so the document body stays a real RichDoc end to end.
                   * The Tiptap editor (CG-C5) and „Uvezi .docx" (CG-B8 UI
                   * wiring) land in Phase 1 — see TODO.md §5D. This textarea
                   * only ever produces plain paragraphs; headings, lists,
                   * bold/italic/underline and links on an existing document
                   * survive display (the preview below) but not this input.
                   */}
                  <textarea
                    // Uncontrolled (commits on blur, see comment above) —
                    // keyed on revisionId so a reissue (A.2) or an external
                    // reload remounts it with the new body instead of
                    // showing stale text.
                    key={document.revisionId}
                    id={`body-${document.documentId}`}
                    defaultValue={richDocText(document.body)}
                    rows={6}
                    readOnly={!isEditable}
                    aria-describedby={
                      isEditable
                        ? undefined
                        : `body-note-${document.documentId}`
                    }
                    onBlur={(event) => {
                      if (!isEditable) return;
                      const body = richDocFromPlainText(event.target.value);
                      // Editing an approved text invalidates it: the change
                      // issues a NEW draft revision without approvals (A.2).
                      if (document.status === "approved") {
                        const reissued = applyTransition(document, "draft");
                        if (reissued !== null) {
                          replace({ ...reissued, body });
                        }
                        return;
                      }
                      update(document.documentId, { body });
                    }}
                    className="border-line-strong rounded-tile bg-panel-canvas text-coffee focus:border-sage w-full border px-3.5 py-2.5 text-sm leading-[1.6] outline-none read-only:opacity-70"
                  />
                  {isEditable && richDocText(document.body) ? (
                    <div className="border-line-strong bg-panel-canvas/50 rounded-tile mt-3 border border-dashed px-3.5 py-3">
                      <p className="text-ink-55 mb-2 text-[11.5px] font-semibold tracking-wide uppercase">
                        Pregled objave
                      </p>
                      <RichText doc={document.body} className="text-[13.5px]" />
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
                      traženo)
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {CAPABILITIES.map((capability) => {
                        const required =
                          REQUIRED_APPROVALS[document.kind].includes(
                            capability,
                          );
                        const granted = document.approvals.includes(capability);
                        return (
                          <label
                            key={capability}
                            className={`flex cursor-pointer items-center gap-2 rounded-full border px-3.5 py-2 text-[13px] font-semibold transition-colors ${
                              granted
                                ? "border-badge-ok/45 bg-badge-ok-bg text-badge-ok"
                                : "border-line-strong text-ink-70"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={granted}
                              onChange={() =>
                                toggleApproval(document, capability)
                              }
                              className="accent-sage"
                            />
                            {CAPABILITY_LABELS[capability]}
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
                        onClick={() => advance(document, "in_review")}
                        label="Pošalji na pregled"
                      />
                    ) : null}
                    {document.status === "in_review" ? (
                      <>
                        <ActionButton
                          onClick={() => advance(document, "approved")}
                          label="Označi kao odobreno"
                        />
                        <ActionButton
                          onClick={() => advance(document, "draft")}
                          label="Vrati na doradu"
                        />
                      </>
                    ) : null}
                    {document.status === "approved" ? (
                      <ActionButton
                        onClick={() => advance(document, "draft")}
                        label="Nova radna verzija"
                      />
                    ) : null}
                    {document.status === "published" ? (
                      <ActionButton
                        onClick={() => advance(document, "archived")}
                        label="Arhiviraj"
                      />
                    ) : null}
                    {document.status === "archived" ? (
                      <ActionButton
                        onClick={() => advance(document, "draft")}
                        label="Nova radna verzija"
                      />
                    ) : null}
                    <button
                      type="button"
                      onClick={() => publish(document)}
                      className="bg-forest text-panel-canvas hover:bg-forest-hover cursor-pointer rounded-full border-0 px-5 py-2.5 text-[13px] font-semibold transition-colors"
                    >
                      Objavi
                    </button>
                    {canDelete(document.status) ? (
                      <button
                        type="button"
                        onClick={() => setPendingDeleteId(document.documentId)}
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
                          onClick={() => remove(document)}
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
  "privacy_policy",
  "terms_of_use",
  "cookie_policy",
  "booking_rules",
  "intake_data_processing_notice",
  "intake_request_acknowledgement",
];

function NewDocumentForm({
  existingSlugs,
  onCancel,
  onCreate,
}: {
  existingSlugs: string[];
  onCancel: () => void;
  onCreate: (document: LegalDocument) => void;
}) {
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [body, setBody] = useState("");
  const [kind, setKind] = useState<LegalDocumentKind>("privacy_policy");

  const effectiveSlug = slugTouched ? slug : slugify(title);
  const slugTaken = existingSlugs.includes(effectiveSlug);
  const slugInvalid = effectiveSlug.length > 0 && !isValidSlug(effectiveSlug);
  const canSubmit =
    title.trim().length > 0 &&
    effectiveSlug.length > 0 &&
    !slugTaken &&
    !slugInvalid;

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (!canSubmit) return;
        onCreate({
          documentId: `doc-${effectiveSlug}-${Date.now()}`,
          revisionId: crypto.randomUUID(),
          kind,
          title: title.trim(),
          slug: effectiveSlug,
          body: richDocFromPlainText(body),
          status: "draft",
          approvals: [],
          versionLabel: "v1",
          updatedAt: new Date().toISOString(),
        });
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
          {CREATABLE_KINDS.map((value) => (
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
      </div>

      <div className="mt-4">
        <label
          htmlFor="new-doc-body"
          className="text-ink-70 mb-1.5 block text-[13px] font-semibold"
        >
          Sadržaj
        </label>
        <textarea
          id="new-doc-body"
          value={body}
          rows={6}
          onChange={(event) => setBody(event.target.value)}
          placeholder="Tekst dokumenta…"
          className="border-line-strong rounded-tile bg-panel-canvas text-coffee focus:border-sage w-full border px-3.5 py-2.5 text-sm leading-[1.6] outline-none"
        />
      </div>

      <div className="mt-5 flex items-center gap-2.5">
        <button
          type="submit"
          disabled={!canSubmit}
          className="bg-forest text-panel-canvas hover:bg-forest-hover cursor-pointer rounded-full border-0 px-5 py-2.5 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50"
        >
          Sačuvaj kao radnu verziju
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
