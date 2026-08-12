"use client";

import { useState } from "react";

import { ErrorBanner } from "@/components/panel/error-banner";
import {
  findSystemContentDefinition,
  systemContentCatalog,
  systemContentIdentity,
  type SystemContentDefinition,
} from "@/lib/content-governance/system-content-catalog";
import type { ContentType } from "@/lib/content-governance/types";
import type { PlatformRouteId } from "@/lib/routes/platform-routes";

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
import { useTranslations } from "next-intl";

const ROUTE_ID = "workspace.content.list" satisfies PlatformRouteId;

/**
 * CG-C1b — generic draft editor. Orchestrates the entry list, the active
 * `ContentType` tab and the selected entry; every field kind's rendering lives
 * in `slot-editor.tsx`/`slot-field-editor.tsx`, driven entirely by
 * `slotSpecRegistry` (CG-C1a) — no per-template editor code here. Network
 * lifecycle belongs to `hooks/use-content-entries.ts`.
 */
export function ScreenSadrzaj() {
  const t = useTranslations("content");
  const tc = useTranslations("common");
  const { reportError, errorsFor, clearError } = usePanelErrors();

  const entriesQuery = useContentEntriesQuery();
  const openEntry = useOpenSystemContentEntryMutation();

  const entries = entriesQuery.data ?? [];
  const loadError = entriesQuery.isError
    ? contentErrorMessage(entriesQuery.error, t("reloadHint"))
    : null;

  const [activeType, setActiveType] = useState<ContentType>("static_page");
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);

  const errors = errorsFor(ROUTE_ID);
  const selectedEntry =
    entries.find((entry) => entry.entryId === selectedEntryId) ?? null;
  const selectedDefinition = selectedEntry
    ? findSystemContentDefinition(selectedEntry.contentType, selectedEntry.slug)
    : null;

  // Derived from the mutation rather than mirrored into local state — the
  // pending row and its failure message are the mutation's own lifecycle.
  const openingIdentity =
    openEntry.isPending && openEntry.variables
      ? systemContentIdentity(openEntry.variables)
      : null;
  const openError = openEntry.isError
    ? contentErrorMessage(openEntry.error, t("requestFailed"))
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
        const message = contentErrorMessage(error, t("requestFailed"));
        reportError({
          routeId: ROUTE_ID,
          tabLabel: t("title"),
          title: "Sistemska stranica nije otvorena",
          description: message,
          details: [],
        });
      },
    });
  };

  return (
    <section className="animate-fade-up">
      <PageHeader title={t("title")} description={t("description")} />

      <ErrorBanner errors={errors} onDismiss={clearError} />

      {loadError ? (
        <div className="border-danger/45 bg-danger/8 rounded-panel mb-6 border px-5 py-4">
          <p className="text-coffee text-[14.5px] font-semibold">
            {t("loadFailed")}
          </p>
          <p className="text-ink-70 mt-1 text-[13px] leading-[1.5]">
            {loadError}
          </p>
        </div>
      ) : null}

      {entriesQuery.isLoading ? (
        <p className="text-ink-55 text-[13.5px]">{tc("state.loading")}</p>
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
