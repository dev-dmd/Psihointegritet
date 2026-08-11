"use client";

import {
  StatusBadge,
  type StatusBadgeTone,
} from "@/components/panel/status-badge";
import { TabPills } from "@/components/panel/tab-pills";
import {
  systemContentIdentity,
  type SystemContentDefinition,
} from "@/lib/content-governance/system-content-catalog";
import type { ContentType } from "@/lib/content-governance/types";

import type { ApiContentRevision } from "../content-api";
import { useTranslations } from "next-intl";

const STATUS_TONES: Record<string, StatusBadgeTone> = {
  draft: "neutral",
  in_review: "wait",
  approved: "amber",
  published: "ok",
  archived: "soft",
};

const STATUS_LABELS: Record<string, string> = {
  draft: "Radna verzija",
  in_review: "Na pregledu",
  approved: "Odobreno",
  published: "Objavljeno",
  archived: "Arhivirano",
};

export const CONTENT_TYPE_TABS: { id: ContentType; label: string }[] = [
  { id: "static_page", label: "Stranice" },
  { id: "service", label: "Usluge" },
  { id: "therapist", label: "Terapeuti" },
  { id: "program", label: "Programi" },
  { id: "company_plan", label: "Kompanije" },
  { id: "package_offer", label: "Paketi" },
];

function entryForDefinition(
  entries: readonly ApiContentRevision[],
  definition: SystemContentDefinition,
): ApiContentRevision | null {
  return (
    entries.find(
      (entry) =>
        entry.contentType === definition.contentType &&
        entry.slug === definition.slug,
    ) ?? null
  );
}

/**
 * Fixed system catalogue merged with the current tenant's CMS revisions.
 * Missing revisions remain visible as code fallback and are created lazily
 * only when a staff member chooses to edit that registered identity.
 */
export function ContentEntryList({
  entries,
  catalogue,
  activeType,
  onTypeChange,
  selectedEntryId,
  onSelect,
  onOpen,
  openingIdentity,
  openError,
}: {
  entries: ApiContentRevision[];
  catalogue: readonly SystemContentDefinition[];
  activeType: ContentType;
  onTypeChange: (type: ContentType) => void;
  selectedEntryId: string | null;
  onSelect: (entryId: string | null) => void;
  onOpen: (
    definition: SystemContentDefinition,
    entry: ApiContentRevision | null,
  ) => void | Promise<void>;
  openingIdentity: string | null;
  openError: string | null;
}) {
  const t = useTranslations("content");
  const shown = catalogue.filter(
    (definition) => definition.contentType === activeType,
  );
  const activeLabel =
    CONTENT_TYPE_TABS.find((tab) => tab.id === activeType)?.label ?? activeType;
  const registeredIdentities = new Set(catalogue.map(systemContentIdentity));
  const unregistered = entries.filter(
    (entry) =>
      entry.contentType === activeType &&
      !registeredIdentities.has(systemContentIdentity(entry)),
  );

  return (
    <section>
      <TabPills
        tabs={CONTENT_TYPE_TABS}
        activeId={activeType}
        onChange={(id) => onTypeChange(id as ContentType)}
        className="mb-4"
      />

      <div className="mb-3">
        <h2 className="text-forest font-serif text-[20px] font-normal">
          {activeLabel} ({shown.length})
        </h2>
        <p className="text-ink-55 mt-1 text-[12.5px] leading-[1.5]">
          {t("systemNotice")}
        </p>
      </div>

      {openError ? (
        <p className="border-danger/35 bg-danger/8 text-danger rounded-tile mb-3 border px-4 py-3 text-[12.5px]">
          {openError}
        </p>
      ) : null}

      <div className="flex flex-col gap-2">
        {shown.map((definition) => {
          const entry = entryForDefinition(entries, definition);
          const identity = systemContentIdentity(definition);
          const isOpening = identity === openingIdentity;
          const isSelected = entry?.entryId === selectedEntryId;
          const templateMismatch =
            entry !== null && entry.template !== definition.template;

          return (
            <button
              key={identity}
              type="button"
              disabled={openingIdentity !== null || templateMismatch}
              onClick={() => {
                if (isSelected) {
                  onSelect(null);
                  return;
                }
                void onOpen(definition, entry);
              }}
              className={`rounded-panel border-line bg-surface hover:border-coffee/30 flex w-full items-center justify-between gap-3 border px-4 py-3 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-65 ${
                isSelected ? "border-forest" : ""
              }`}
            >
              <div className="min-w-0">
                <div className="text-coffee text-[14px] font-semibold">
                  {definition.title}
                </div>
                <div className="text-ink-70 mt-0.5 text-[12.5px]">
                  {definition.publicRoute}
                </div>
                <div className="text-ink-55 mt-0.5 text-[11.5px]">
                  {definition.slug} · {definition.template}
                </div>
              </div>
              {templateMismatch ? (
                <StatusBadge tone="danger">{t("wrongTemplate")}</StatusBadge>
              ) : entry ? (
                <StatusBadge tone={STATUS_TONES[entry.status] ?? "neutral"}>
                  {STATUS_LABELS[entry.status] ?? entry.status}
                </StatusBadge>
              ) : (
                <StatusBadge tone="soft">
                  {isOpening ? "Otvaranje…" : "Fallback iz koda"}
                </StatusBadge>
              )}
            </button>
          );
        })}
      </div>

      {unregistered.length > 0 ? (
        <div className="border-badge-amber/40 bg-badge-amber-bg rounded-tile mt-4 border px-4 py-3">
          <p className="text-coffee text-[12.5px] font-semibold">
            {unregistered.length} ranijih unosa nije u sistemskom katalogu
          </p>
          <p className="text-ink-70 mt-1 text-[12px]">
            Ne prikazuju se kao javne sistemske stranice:{" "}
            {unregistered.map((entry) => entry.slug).join(", ")}.
          </p>
        </div>
      ) : null}
    </section>
  );
}
