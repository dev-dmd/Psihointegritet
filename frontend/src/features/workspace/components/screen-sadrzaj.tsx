"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { ErrorBanner } from "@/components/panel/error-banner";
import {
  findSystemContentDefinition,
  systemContentCatalog,
  systemContentIdentity,
  type SystemContentDefinition,
} from "@/lib/content-governance/system-content-catalog";
import type { ContentType } from "@/lib/content-governance/types";

import {
  ContentApiError,
  createContentEntry,
  fetchContentEntries,
  type ApiContentRevision,
} from "../content-api";
import { CONTENT_ENTRIES_QUERY_KEY } from "../content-entries-query";
import { usePanelErrors } from "../panel-errors";
import { ContentEntryList } from "./content-entry-list";
import { ContentRevisionEditor } from "./content-revision-editor";
import { PageHeader } from "./page-header";

const HREF = "/radni-prostor/sadrzaj" as const;
const TAB_LABEL = "Sadržaj";

/**
 * CG-C1b — generic draft editor: `useQuery`/`useMutation` from the first
 * commit (learned from `screen-dokumenti.tsx`'s go-`useEffect` re-fetch
 * cost this same session — see `TODO.md` §5D). Orchestrates the query,
 * active `ContentType` tab and selected entry; every field kind's rendering
 * lives in `slot-editor.tsx`/`slot-field-editor.tsx`, driven entirely by
 * `slotSpecRegistry` (CG-C1a) — no per-template editor code here.
 */
export function ScreenSadrzaj() {
  const { reportError, errorsFor, clearError } = usePanelErrors();
  const queryClient = useQueryClient();

  const entriesQuery = useQuery({
    queryKey: CONTENT_ENTRIES_QUERY_KEY,
    queryFn: () => fetchContentEntries(),
  });
  const entries = entriesQuery.data ?? [];
  const loading = entriesQuery.isLoading;
  const loadError = entriesQuery.isError
    ? entriesQuery.error instanceof ContentApiError
      ? entriesQuery.error.message
      : "Sadržaj se trenutno ne može učitati. Osvežite stranicu."
    : null;

  const [activeType, setActiveType] = useState<ContentType>("static_page");
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
  const [openingIdentity, setOpeningIdentity] = useState<string | null>(null);
  const [openError, setOpenError] = useState<string | null>(null);

  const errors = errorsFor(HREF);
  const selectedEntry =
    entries.find((entry) => entry.entryId === selectedEntryId) ?? null;
  const selectedDefinition = selectedEntry
    ? findSystemContentDefinition(selectedEntry.contentType, selectedEntry.slug)
    : null;

  const handleOpen = async (
    definition: SystemContentDefinition,
    existing: ApiContentRevision | null,
  ) => {
    if (existing) {
      setOpenError(null);
      setSelectedEntryId(existing.entryId);
      return;
    }

    const identity = systemContentIdentity(definition);
    setOpeningIdentity(identity);
    setOpenError(null);
    try {
      const created = await createContentEntry({
        contentType: definition.contentType,
        slug: definition.slug,
        template: definition.template,
      });
      queryClient.setQueryData<ApiContentRevision[]>(
        CONTENT_ENTRIES_QUERY_KEY,
        (current) => [
          ...(current ?? []).filter((item) => item.entryId !== created.entryId),
          created,
        ],
      );
      setSelectedEntryId(created.entryId);
    } catch (error) {
      // Another staff member may have opened the same fallback between our
      // list read and POST. Resolve a real 409 by loading the tenant list and
      // opening the now-existing registered entry instead of surfacing a
      // false failure.
      if (error instanceof ContentApiError && error.status === 409) {
        try {
          const refreshed = await fetchContentEntries();
          queryClient.setQueryData(CONTENT_ENTRIES_QUERY_KEY, refreshed);
          const concurrent =
            refreshed.find(
              (item) =>
                item.contentType === definition.contentType &&
                item.slug === definition.slug &&
                item.template === definition.template,
            ) ?? null;
          if (concurrent) {
            setSelectedEntryId(concurrent.entryId);
            return;
          }
        } catch {
          // Keep and report the original 409 if reconciliation is unavailable.
        }
      }

      const message =
        error instanceof ContentApiError
          ? error.message
          : "Zahtev nije uspeo. Pokušajte ponovo.";
      setOpenError(message);
      reportError({
        href: HREF,
        tabLabel: TAB_LABEL,
        title: "Sistemska stranica nije otvorena",
        description: message,
        details: [],
      });
    } finally {
      setOpeningIdentity(null);
    }
  };

  return (
    <section className="animate-fade-up">
      <PageHeader
        title="Sadržaj"
        description="Sistemske stranice, usluge, terapeuti, programi, kompanije i paketi. Izaberite postojeću stavku i menjajte samo polja definisana njenom strukturom."
      />

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

      {loading ? (
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
              setOpenError(null);
            }}
            selectedEntryId={selectedEntryId}
            onSelect={setSelectedEntryId}
            openingIdentity={openingIdentity}
            openError={openError}
            onOpen={handleOpen}
          />

          {selectedEntry && selectedDefinition ? (
            <ContentRevisionEditor
              key={selectedEntry.revisionId}
              entry={selectedEntry}
              displayTitle={selectedDefinition.title}
              publicRoute={selectedDefinition.publicRoute}
              onDeleted={() => setSelectedEntryId(null)}
            />
          ) : null}
        </>
      )}
    </section>
  );
}
