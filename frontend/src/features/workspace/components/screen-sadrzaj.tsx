"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { ErrorBanner } from "@/components/panel/error-banner";
import type {
  ContentTemplate,
  ContentType,
} from "@/lib/content-governance/types";

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
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const errors = errorsFor(HREF);
  const selectedEntry =
    entries.find((entry) => entry.entryId === selectedEntryId) ?? null;

  const handleCreate = async (input: {
    slug: string;
    template: ContentTemplate;
  }) => {
    setCreating(true);
    setCreateError(null);
    try {
      const created = await createContentEntry({
        contentType: activeType,
        slug: input.slug,
        template: input.template,
      });
      queryClient.setQueryData<ApiContentRevision[]>(
        CONTENT_ENTRIES_QUERY_KEY,
        (current) => [...(current ?? []), created],
      );
      setSelectedEntryId(created.entryId);
    } catch (error) {
      const message =
        error instanceof ContentApiError
          ? error.message
          : "Zahtev nije uspeo. Pokušajte ponovo.";
      setCreateError(message);
      reportError({
        href: HREF,
        tabLabel: TAB_LABEL,
        title: "Nova stranica nije sačuvana",
        description: message,
        details: [],
      });
    } finally {
      setCreating(false);
    }
  };

  return (
    <section className="animate-fade-up">
      <PageHeader
        title="Sadržaj"
        description="Generički editor za operativne stranice, usluge, terapeute, programe, kompanije i pakete — jedan po jedan slot, iz registra šema (CG-C1). Pregled i objava dolaze u sledećem koraku (CG-C4)."
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
            activeType={activeType}
            onTypeChange={(type) => {
              setActiveType(type);
              setSelectedEntryId(null);
            }}
            selectedEntryId={selectedEntryId}
            onSelect={setSelectedEntryId}
            creating={creating}
            createError={createError}
            onCreate={handleCreate}
          />

          {selectedEntry ? (
            <ContentRevisionEditor
              key={selectedEntry.revisionId}
              entry={selectedEntry}
              onDeleted={() => setSelectedEntryId(null)}
            />
          ) : null}
        </>
      )}
    </section>
  );
}
