"use client";

import Link from "next/link";
import { useState } from "react";

import { ErrorBanner } from "@/components/panel/error-banner";
import {
  findSystemContentDefinition,
  systemContentCatalog,
  systemContentIdentity,
  type SystemContentDefinition,
} from "@/lib/content-governance/system-content-catalog";
import type { ContentType } from "@/lib/content-governance/types";

import type { ApiContentRevision } from "../content-api";
import {
  contentErrorMessage,
  useContentEntriesQuery,
  useOpenSystemContentEntryMutation,
} from "../hooks/use-content-entries";
import { usePanelErrors } from "../panel-errors";
import { ContentEntryList } from "./content-entry-list";
import { ContentRevisionEditor } from "./content-revision-editor";
import { PageHeader } from "./page-header";

const HREF = "/radni-prostor/sadrzaj" as const;
const TAB_LABEL = "Sadržaj";

/**
 * CG-C1b — generic draft editor. Orchestrates the entry list, the active
 * `ContentType` tab and the selected entry; every field kind's rendering lives
 * in `slot-editor.tsx`/`slot-field-editor.tsx`, driven entirely by
 * `slotSpecRegistry` (CG-C1a) — no per-template editor code here. Network
 * lifecycle belongs to `hooks/use-content-entries.ts`.
 */
export function ScreenSadrzaj({
  initialEntryId = null,
  returnToKompas = false,
}: {
  /** Entry another screen asked to open, e.g. the Kompas content workspace. */
  initialEntryId?: string | null;
  returnToKompas?: boolean;
} = {}) {
  const { reportError, errorsFor, clearError } = usePanelErrors();

  const entriesQuery = useContentEntriesQuery();
  const openEntry = useOpenSystemContentEntryMutation();

  const entries = entriesQuery.data ?? [];
  const loadError = entriesQuery.isError
    ? contentErrorMessage(
        entriesQuery.error,
        "Sadržaj se trenutno ne može učitati. Osvežite stranicu.",
      )
    : null;

  const [activeType, setActiveType] = useState<ContentType>("static_page");
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(
    initialEntryId,
  );

  const errors = errorsFor(HREF);
  const selectedEntry =
    entries.find((entry) => entry.entryId === selectedEntryId) ?? null;
  const selectedDefinition = selectedEntry
    ? findSystemContentDefinition(selectedEntry.contentType, selectedEntry.slug)
    : null;
  // Articles are governed content without a catalogue entry (ADR-019): their
  // identity is authored, not one of the six fixed system pages. Without this
  // the editor simply never rendered for them.
  const selectedLabels =
    selectedEntry && !selectedDefinition
      ? {
          title: selectedEntry.seo?.title?.trim() || selectedEntry.slug,
          publicRoute: `/znanje/${selectedEntry.slug}`,
        }
      : null;

  // Derived from the mutation rather than mirrored into local state — the
  // pending row and its failure message are the mutation's own lifecycle.
  const openingIdentity =
    openEntry.isPending && openEntry.variables
      ? systemContentIdentity(openEntry.variables)
      : null;
  const openError = openEntry.isError
    ? contentErrorMessage(
        openEntry.error,
        "Zahtev nije uspeo. Pokušajte ponovo.",
      )
    : null;

  const handleOpen = (
    definition: SystemContentDefinition,
    existing: ApiContentRevision | null,
  ) => {
    if (existing) {
      openEntry.reset();
      setSelectedEntryId(existing.entryId);
      return;
    }

    openEntry.mutate(definition, {
      onSuccess: (entry) => setSelectedEntryId(entry.entryId),
      onError: (error) => {
        const message = contentErrorMessage(
          error,
          "Zahtev nije uspeo. Pokušajte ponovo.",
        );
        reportError({
          href: HREF,
          tabLabel: TAB_LABEL,
          title: "Sistemska stranica nije otvorena",
          description: message,
          details: [],
        });
      },
    });
  };

  return (
    <section className="animate-fade-up">
      <PageHeader
        title="Sadržaj"
        description="Sistemske stranice, usluge, terapeuti, programi, kompanije i paketi. Izaberite postojeću stavku i menjajte samo polja definisana njenom strukturom."
      />

      {returnToKompas ? (
        <Link
          href="/radni-prostor/kompas?tab=content"
          className="text-forest mb-4 inline-flex min-h-11 items-center text-[13px] font-semibold underline"
        >
          ← Nazad na Kompas sadržaj
        </Link>
      ) : null}

      <ErrorBanner errors={errors} onDismiss={clearError} />

      {loadError ? (
        <div className="border-danger/45 bg-danger/8 rounded-panel mb-6 border px-5 py-4">
          <p className="text-coffee text-[14.5px] font-semibold">
            Sadržaj se ne može učitati
          </p>
          <p className="text-ink-70 mt-1 text-[13px] leading-[1.5]">
            {loadError}
          </p>
        </div>
      ) : null}

      {entriesQuery.isLoading ? (
        <p className="text-ink-55 text-[13.5px]">Učitavanje…</p>
      ) : (
        <>
          <ContentEntryList
            entries={entries}
            catalogue={systemContentCatalog}
            activeType={activeType}
            onTypeChange={(type) => {
              setActiveType(type);
              setSelectedEntryId(null);
              openEntry.reset();
            }}
            selectedEntryId={selectedEntryId}
            onSelect={setSelectedEntryId}
            openingIdentity={openingIdentity}
            openError={openError}
            onOpen={handleOpen}
          />

          {selectedEntry && (selectedDefinition || selectedLabels) ? (
            <ContentRevisionEditor
              key={selectedEntry.revisionId}
              entry={selectedEntry}
              displayTitle={
                selectedDefinition?.title ?? selectedLabels?.title ?? ""
              }
              publicRoute={
                selectedDefinition?.publicRoute ??
                selectedLabels?.publicRoute ??
                ""
              }
              onDeleted={() => setSelectedEntryId(null)}
            />
          ) : null}
        </>
      )}
    </section>
  );
}
