"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { slotSpecRegistry } from "@/lib/content-governance/slot-schema";
import { templateRegistry } from "@/lib/content-governance/limits";

import type { ApiContentRevision } from "../../content-api";
import {
  useContentEntriesCache,
  useContentRevisionHealthQuery,
  useContentTransitionMutation,
  useDeleteContentRevisionMutation,
  useSaveContentRevisionMutation,
} from "../../hooks/use-content-revision";
import { contentErrorMessage } from "../../hooks/use-content-entries";
import { usePanelErrors } from "../../panel-errors";
import { SlotEditor } from "../slot-editor";
import type { RichDoc } from "@/lib/content-governance/rich-doc";

import { KompasContentActions } from "./kompas-content-actions";
import { KompasDocxImport } from "./kompas-docx-import";
import { KompasEditorHeader } from "./kompas-editor-header";
import { KompasEditorHealth } from "./kompas-editor-health";

const HREF = "/radni-prostor/kompas/sadrzaj" as const;
const TAB_LABEL = "Kompas sadržaj";

/**
 * Seeds the sections an article must have.
 *
 * Deliberately `override`, not the `inherit` the six-type editor seeds. Those
 * six have a code fallback that `inherit` resolves to; an article has none, so
 * an inherited section is simply an empty one and must be authored.
 */
function initialSlotData(entry: ApiContentRevision): Record<string, unknown> {
  const data = { ...entry.slotData };
  const definition = templateRegistry[entry.template];
  const specs = slotSpecRegistry[entry.template];
  for (const slotName of definition.requiredSlots) {
    if (data[slotName] !== undefined) continue;
    if (specs[slotName]?.editability === "computed") continue;
    data[slotName] = { mode: "override", fields: {} };
  }
  return data;
}

/**
 * The article's own page (D-063).
 *
 * Reuses the schema-driven slot layer and every transport hook the CMS editor
 * uses, but not that editor's information architecture: an article is not one
 * of six fixed system pages and must not be rendered underneath their
 * catalogue. `content-revision-editor.tsx` is untouched and stays at its
 * architecture baseline.
 */
export function KompasArticleEditor({ entry }: { entry: ApiContentRevision }) {
  const router = useRouter();
  const { reportError, clearError, errorsFor } = usePanelErrors();
  const { replaceEntry, removeEntry } = useContentEntriesCache();

  const [slotData, setSlotData] = useState(() => initialSlotData(entry));
  const [dirty, setDirty] = useState(false);

  const health = useContentRevisionHealthQuery(entry);

  const fail = (title: string) => (error: unknown) =>
    reportError({
      href: HREF,
      tabLabel: TAB_LABEL,
      title,
      description: contentErrorMessage(error, "Pokušajte ponovo."),
      details: [],
    });

  const save = useSaveContentRevisionMutation(entry, {
    onSaved: (next) => {
      replaceEntry(next);
      setDirty(false);
      router.refresh();
    },
    onFailed: fail("Tekst nije sačuvan"),
  });

  const transition = useContentTransitionMutation(entry, {
    onOutcome: (outcome) => {
      if (outcome.kind === "moved") {
        replaceEntry(outcome.entry);
        router.refresh();
        return;
      }
      reportError({
        href: HREF,
        tabLabel: TAB_LABEL,
        title: "Objava je zaustavljena",
        description: "Server je odbio objavu dok nalazi ispod nisu rešeni.",
        details: outcome.block.findings.map((finding) => finding.message),
      });
    },
    onFailed: fail("Promena statusa nije uspela"),
  });

  const remove = useDeleteContentRevisionMutation(entry, {
    onRemoved: () => {
      removeEntry(entry.entryId);
      router.push(HREF);
    },
    onFailed: fail("Radna verzija nije obrisana"),
  });

  const bodyIntro = slotData.body_intro as
    { mode?: string; fields?: { body?: RichDoc } } | undefined;
  const existingBody = bodyIntro?.fields?.body;
  const hasExistingText = (existingBody?.blocks?.length ?? 0) > 0;

  const applyImportedBody = (body: RichDoc) => {
    setSlotData((current) => {
      const slot = (current.body_intro ?? {}) as {
        mode?: string;
        fields?: Record<string, unknown>;
      };
      return {
        ...current,
        body_intro: {
          ...slot,
          mode: "override",
          fields: { ...(slot.fields ?? {}), body },
        },
      };
    });
    setDirty(true);
  };

  const editable = entry.status === "draft" || entry.status === "approved";
  const definition = templateRegistry[entry.template];
  const specs = slotSpecRegistry[entry.template];
  const slots = [...definition.requiredSlots, ...definition.optionalSlots];
  const isBusy = save.isPending || transition.isPending || remove.isPending;

  return (
    <section className="animate-fade-up flex flex-col gap-4">
      <KompasEditorHeader entry={entry} />

      {errorsFor(HREF).map((error) => (
        <div
          key={error.id}
          className="border-danger/45 bg-danger/8 rounded-panel border px-5 py-4"
        >
          <div className="flex items-start justify-between gap-3">
            <p className="text-coffee text-[14px] font-semibold">
              {error.title}
            </p>
            <button
              type="button"
              onClick={() => clearError(error.id)}
              className="text-ink-55 min-h-11 cursor-pointer text-[12px] underline"
            >
              Sakrij
            </button>
          </div>
          <p className="text-ink-70 mt-1 text-[13px] leading-[1.5]">
            {error.description}
          </p>
          {error.details.length > 0 ? (
            <ul className="text-ink-70 mt-2 list-disc space-y-1 pl-5 text-[12.5px]">
              {error.details.map((detail) => (
                <li key={detail}>{detail}</li>
              ))}
            </ul>
          ) : null}
        </div>
      ))}

      {!editable ? (
        <p className="border-line-strong rounded-panel text-ink-70 border px-5 py-4 text-[13px] leading-[1.5]">
          Tekst se trenutno ne može menjati jer čeka pregled ili je objavljen.
          Napravite novu radnu verziju da biste nastavili da pišete.
        </p>
      ) : null}

      <div className="rounded-panel border-line bg-surface flex flex-col gap-5 border px-6 py-5">
        {slots.map((slotName) => {
          const spec = specs[slotName];
          if (!spec) return null;
          return (
            <div key={slotName} className="flex flex-col gap-3">
              {slotName === "body_intro" && editable ? (
                <KompasDocxImport
                  hasExistingText={hasExistingText}
                  onImported={applyImportedBody}
                />
              ) : null}
              <SlotEditor
                slotName={slotName}
                spec={spec}
                value={slotData[slotName]}
                onChange={(next) => {
                  setSlotData((current) => ({ ...current, [slotName]: next }));
                  setDirty(true);
                }}
              />
            </div>
          );
        })}
      </div>

      <KompasEditorHealth
        findings={health.data?.findings ?? []}
        isLoading={health.isLoading}
        isError={health.isError}
      />

      <div className="rounded-panel border-line bg-surface flex flex-wrap items-center justify-between gap-3 border px-6 py-4">
        <button
          type="button"
          disabled={!editable || isBusy || !dirty}
          onClick={() =>
            save.mutate({
              slotData,
              seo: entry.seo,
              discovery: entry.discovery,
            })
          }
          className="border-coffee bg-coffee text-panel-canvas min-h-11 cursor-pointer rounded-full border px-5 text-[13px] font-semibold disabled:cursor-not-allowed disabled:opacity-60"
        >
          {save.isPending ? "Čuvanje…" : "Sačuvaj tekst"}
        </button>

        <KompasContentActions
          entry={entry}
          isBusy={isBusy}
          onTransition={(target) => transition.mutate(target)}
          onDelete={() => remove.mutate()}
        />
      </div>
    </section>
  );
}
