"use client";

import { useState } from "react";

import {
  StatusBadge,
  type StatusBadgeTone,
} from "@/components/panel/status-badge";
import { TabPills } from "@/components/panel/tab-pills";
import type {
  ContentTemplate,
  ContentType,
} from "@/lib/content-governance/types";

import type { ApiContentRevision } from "../content-api";

const STATUS_TONES: Record<string, StatusBadgeTone> = {
  draft: "neutral",
  in_review: "wait",
  approved: "amber",
  published: "ok",
  archived: "soft",
};

export const CONTENT_TYPE_TABS: { id: ContentType; label: string }[] = [
  { id: "static_page", label: "Stranice" },
  { id: "service", label: "Usluge" },
  { id: "therapist", label: "Terapeuti" },
  { id: "program", label: "Programi" },
  { id: "company_plan", label: "Kompanije" },
  { id: "package_offer", label: "Paketi" },
];

/** Only the template pairings that actually appear as real pages today
 * (`static-provider.ts`) — the backend accepts any (contentType, template)
 * combination, but offering e.g. a `legal_page` template on a `therapist`
 * entry would just produce a nonsensical entry. */
export const TEMPLATES_BY_CONTENT_TYPE: Record<ContentType, ContentTemplate[]> =
  {
    service: ["service_detail"],
    therapist: ["therapist_profile"],
    program: ["program_detail"],
    company_plan: ["company_page"],
    package_offer: ["pricing_page"],
    static_page: [
      "static_information",
      "legal_page",
      "audience_page",
      "support_area",
      "company_page",
      "pricing_page",
    ],
  };

interface NewEntryInput {
  slug: string;
  template: ContentTemplate;
}

/** Tab bar (by `ContentType`) + list + inline create form (CG-C1b). Purely
 * presentational — `screen-sadrzaj.tsx` owns the active tab, selection and
 * the create mutation. */
export function ContentEntryList({
  entries,
  activeType,
  onTypeChange,
  selectedEntryId,
  onSelect,
  onCreate,
  creating,
  createError,
}: {
  entries: ApiContentRevision[];
  activeType: ContentType;
  onTypeChange: (type: ContentType) => void;
  selectedEntryId: string | null;
  onSelect: (entryId: string | null) => void;
  onCreate: (input: NewEntryInput) => void | Promise<void>;
  creating: boolean;
  createError: string | null;
}) {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const shown = entries.filter((entry) => entry.contentType === activeType);
  const activeLabel =
    CONTENT_TYPE_TABS.find((tab) => tab.id === activeType)?.label ?? activeType;

  return (
    <section>
      <TabPills
        tabs={CONTENT_TYPE_TABS}
        activeId={activeType}
        onChange={(id) => {
          onTypeChange(id as ContentType);
          setShowCreateForm(false);
        }}
        className="mb-4"
      />

      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-forest font-serif text-[20px] font-normal">
          {activeLabel} ({shown.length})
        </h2>
        <button
          type="button"
          onClick={() => setShowCreateForm(true)}
          className="bg-forest text-panel-canvas hover:bg-forest-hover cursor-pointer rounded-full border-0 px-5 py-2.5 text-sm font-semibold transition-colors"
        >
          Nova stranica
        </button>
      </div>

      {showCreateForm ? (
        <NewEntryForm
          contentType={activeType}
          existingSlugs={shown.map((entry) => entry.slug)}
          error={createError}
          creating={creating}
          onCancel={() => setShowCreateForm(false)}
          onCreate={async (input) => {
            await onCreate(input);
            setShowCreateForm(false);
          }}
        />
      ) : null}

      <div className="flex flex-col gap-2">
        {shown.map((entry) => {
          const isSelected = entry.entryId === selectedEntryId;
          return (
            <button
              key={entry.entryId}
              type="button"
              onClick={() => onSelect(isSelected ? null : entry.entryId)}
              className={`rounded-panel border-line bg-surface hover:border-coffee/30 flex w-full items-center justify-between gap-3 border px-4 py-3 text-left transition-colors ${
                isSelected ? "border-forest" : ""
              }`}
            >
              <div className="min-w-0">
                <div className="text-coffee text-[14px] font-semibold">
                  /{entry.slug}
                </div>
                <div className="text-ink-55 text-[12px]">{entry.template}</div>
              </div>
              <StatusBadge tone={STATUS_TONES[entry.status] ?? "neutral"}>
                {entry.status}
              </StatusBadge>
            </button>
          );
        })}
        {shown.length === 0 ? (
          <p className="text-ink-55 text-[13px]">Nema unosa ovog tipa.</p>
        ) : null}
      </div>
    </section>
  );
}

function NewEntryForm({
  contentType,
  existingSlugs,
  error,
  creating,
  onCancel,
  onCreate,
}: {
  contentType: ContentType;
  existingSlugs: string[];
  error: string | null;
  creating: boolean;
  onCancel: () => void;
  onCreate: (input: NewEntryInput) => void | Promise<void>;
}) {
  const availableTemplates = TEMPLATES_BY_CONTENT_TYPE[contentType];
  const [slug, setSlug] = useState("");
  const [template, setTemplate] = useState<ContentTemplate>(
    availableTemplates[0] ?? "static_information",
  );

  const slugValid = /^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug);
  const slugTaken = existingSlugs.includes(slug);
  const canSubmit = slugValid && !slugTaken && !creating;

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (!canSubmit) return;
        void onCreate({ slug, template });
      }}
      className="rounded-panel border-line bg-surface mb-4 border px-5 py-5"
    >
      <h3 className="text-forest mb-4 font-serif text-lg">Nova stranica</h3>

      {error ? <p className="text-danger mb-3 text-[12.5px]">{error}</p> : null}

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label
            htmlFor="new-entry-slug"
            className="text-ink-70 mb-1.5 block text-[13px] font-semibold"
          >
            Slug
          </label>
          <input
            id="new-entry-slug"
            value={slug}
            onChange={(event) => setSlug(event.target.value)}
            placeholder="individualna-psihoterapija"
            aria-describedby="new-entry-slug-hint"
            className="border-line-strong rounded-tile bg-panel-canvas text-coffee focus:border-sage w-full border px-3.5 py-2.5 text-sm outline-none"
          />
          <p
            id="new-entry-slug-hint"
            className="text-ink-55 mt-1.5 text-[12px]"
          >
            {slugTaken
              ? "Ovaj slug već postoji za ovaj tip."
              : slug.length > 0 && !slugValid
                ? "Dozvoljena su mala slova, brojevi i crtica."
                : "Mala slova, brojevi i crtica."}
          </p>
        </div>

        {availableTemplates.length > 1 ? (
          <div>
            <label
              htmlFor="new-entry-template"
              className="text-ink-70 mb-1.5 block text-[13px] font-semibold"
            >
              Template
            </label>
            <select
              id="new-entry-template"
              value={template}
              onChange={(event) =>
                setTemplate(event.target.value as ContentTemplate)
              }
              className="border-line-strong rounded-tile bg-panel-canvas text-coffee focus:border-sage w-full border px-3.5 py-2.5 text-sm outline-none"
            >
              {availableTemplates.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </div>
        ) : null}
      </div>

      <div className="mt-5 flex items-center gap-2.5">
        <button
          type="submit"
          disabled={!canSubmit}
          className="bg-forest text-panel-canvas hover:bg-forest-hover cursor-pointer rounded-full border-0 px-5 py-2.5 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50"
        >
          {creating ? "Čuvanje…" : "Sačuvaj kao radnu verziju"}
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
