"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import {
  StatusBadge,
  type StatusBadgeTone,
} from "@/components/panel/status-badge";
import { templateRegistry } from "@/lib/content-governance/limits";
import { slotSpecRegistry } from "@/lib/content-governance/slot-schema";

import {
  ContentApiError,
  deleteContentRevision,
  updateContentRevision,
  type ApiContentRevision,
} from "../content-api";
import { CONTENT_ENTRIES_QUERY_KEY } from "../content-entries-query";
import { usePanelErrors, type PanelErrorResource } from "../panel-errors";
import { SlotEditor } from "./slot-editor";

const STATUS_TONES: Record<string, StatusBadgeTone> = {
  draft: "neutral",
  in_review: "wait",
  approved: "amber",
  published: "ok",
  archived: "soft",
};

const HREF = "/radni-prostor/sadrzaj" as const;
const TAB_LABEL = "Sadržaj";
/** Single-tenant seed org; the backend membership check owns the real value
 * (same pattern as `screen-dokumenti.tsx`'s `ORGANIZATION_ID`). */
const ORGANIZATION_ID = "psihointegritet";
const RESOURCE_TYPE = "content_entry";

function resourceFor(entry: ApiContentRevision): PanelErrorResource {
  return {
    organizationId: ORGANIZATION_ID,
    resourceType: RESOURCE_TYPE,
    resourceId: entry.entryId,
    revisionId: entry.revisionId,
  };
}

/**
 * One revision: every slot from `templateRegistry`, save-draft, delete
 * (CG-C1b). **No lifecycle buttons** — pošalji-na-pregled/odobri/objavi/
 * arhiviraj are CG-C4, a separate step, so this editor's smoke test never
 * depends on objava (`TODO.md` §5D Faza 1, korak 1.2). Action errors go
 * through `usePanelErrors` (nav red-border + Pregled list), same as
 * `screen-dokumenti.tsx` — not a local banner.
 */
export function ContentRevisionEditor({
  entry,
  onDeleted,
}: {
  entry: ApiContentRevision;
  onDeleted: () => void;
}) {
  const queryClient = useQueryClient();
  const { reportError, clearErrorsForResource } = usePanelErrors();
  const [slotData, setSlotData] = useState<Record<string, unknown>>(
    entry.slotData,
  );
  const [pendingDelete, setPendingDelete] = useState(false);

  const definition = templateRegistry[entry.template];
  const slots = [...definition.requiredSlots, ...definition.optionalSlots];
  const specs = slotSpecRegistry[entry.template];

  // Only draft/approved revisions are editable at all (mirrors the backend's
  // own `update_revision` guard); everything else needs CG-C4's lifecycle to
  // return to draft first.
  const isEditable = entry.status === "draft" || entry.status === "approved";

  const reportApiError = (title: string, error: unknown) => {
    reportError({
      href: HREF,
      tabLabel: TAB_LABEL,
      resource: resourceFor(entry),
      title,
      description:
        error instanceof ContentApiError
          ? error.message
          : "Zahtev nije uspeo. Pokušajte ponovo.",
      details: [],
    });
  };

  const saveMutation = useMutation({
    mutationFn: () =>
      updateContentRevision(entry.entryId, entry.revisionId, {
        lockVersion: entry.lockVersion,
        slotData,
      }),
    onSuccess: (next) => {
      clearErrorsForResource(resourceFor(entry));
      queryClient.setQueryData<ApiContentRevision[]>(
        CONTENT_ENTRIES_QUERY_KEY,
        (current) =>
          (current ?? []).map((item) =>
            item.entryId === next.entryId ? next : item,
          ),
      );
    },
    onError: (error: unknown) =>
      reportApiError(`Izmena nije sačuvana za „/${entry.slug}”`, error),
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteContentRevision(entry.entryId, entry.revisionId),
    onSuccess: () => {
      clearErrorsForResource(resourceFor(entry));
      queryClient.setQueryData<ApiContentRevision[]>(
        CONTENT_ENTRIES_QUERY_KEY,
        (current) =>
          (current ?? []).filter((item) => item.entryId !== entry.entryId),
      );
      onDeleted();
    },
    onError: (error: unknown) => {
      setPendingDelete(false);
      reportApiError(`Stranica „/${entry.slug}” nije obrisana`, error);
    },
  });

  return (
    <div className="rounded-panel border-line bg-surface mt-4 border px-5 py-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-coffee text-[15px] font-semibold">
            /{entry.slug}
          </div>
          <div className="text-ink-55 mt-0.5 text-[12.5px]">
            {entry.template} · {entry.versionLabel}
          </div>
        </div>
        <StatusBadge tone={STATUS_TONES[entry.status] ?? "neutral"}>
          {entry.status}
        </StatusBadge>
      </div>

      {!isEditable ? (
        <p className="text-ink-55 mb-3 text-[12.5px]">
          Revizija u statusu „{entry.status}” se ne menja ovde — draft editor
          uređuje samo radne verzije (CG-C4 dodaje tok pregleda).
        </p>
      ) : null}

      <div>
        {slots.map((slotName) => {
          const spec = specs[slotName];
          if (!spec) return null;
          return (
            <SlotEditor
              key={slotName}
              slotName={slotName}
              spec={spec}
              value={slotData[slotName]}
              onChange={(next) =>
                setSlotData((current) => ({ ...current, [slotName]: next }))
              }
            />
          );
        })}
      </div>

      <div className="mt-3 flex items-center gap-2.5">
        <button
          type="button"
          disabled={!isEditable || saveMutation.isPending}
          onClick={() => saveMutation.mutate()}
          className="bg-forest text-panel-canvas hover:bg-forest-hover cursor-pointer rounded-full border-0 px-5 py-2.5 text-[13px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saveMutation.isPending ? "Čuvanje…" : "Sačuvaj"}
        </button>
        {entry.status === "draft" ? (
          <button
            type="button"
            onClick={() => setPendingDelete(true)}
            className="border-danger/45 text-danger hover:bg-danger/8 cursor-pointer rounded-full border bg-transparent px-5 py-2.5 text-[13px] font-semibold transition-colors"
          >
            Obriši
          </button>
        ) : null}
      </div>

      {pendingDelete ? (
        <div className="border-danger/45 bg-danger/8 rounded-tile mt-3 px-4 py-3">
          <p className="text-coffee text-[13.5px] font-semibold">
            Obrisati „/{entry.slug}”?
          </p>
          <div className="mt-2.5 flex gap-2.5">
            <button
              type="button"
              onClick={() => deleteMutation.mutate()}
              className="bg-danger text-panel-canvas cursor-pointer rounded-full border-0 px-4 py-2 text-[13px] font-semibold"
            >
              Obriši
            </button>
            <button
              type="button"
              onClick={() => setPendingDelete(false)}
              className="border-line-strong text-ink-70 cursor-pointer rounded-full border bg-transparent px-4 py-2 text-[13px] font-semibold"
            >
              Odustani
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
