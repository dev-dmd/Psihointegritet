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
import type { RichDoc } from "@/lib/content-governance/rich-doc";

import { KompasContentActions } from "./kompas-content-actions";
import { KompasEditorHeader } from "./kompas-editor-header";
import { NextActionCard } from "./next-action-card";
import { ArticleChecklist } from "./article-checklist";
import { deriveArticleCompletion } from "./article-completion";
import { ArticleBasicsStep } from "./article-basics-step";
import { ArticleTextStep } from "./article-text-step";
import { TechnicalDetails } from "../taxonomy-term-form/technical-details";

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
  const [bodyImportKey, setBodyImportKey] = useState(0);

  const health = useContentRevisionHealthQuery(entry);

  // Derive the article's completion state from slot data, discovery metadata,
  // and server-side Content Health findings. The same state feeds the stepper,
  // the next-action card, and the checklist.
  const completion = deriveArticleCompletion(
    { slotData, discovery: entry.discovery, status: entry.status },
    health.data?.findings ?? [],
  );

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

  const applyImportedBody = (body: RichDoc) => {
    setBodyImportKey((v) => v + 1);
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
  const isBusy = save.isPending || transition.isPending || remove.isPending;

  const changeSlot = (name: string, next: unknown) => {
    setSlotData((current) => ({ ...current, [name]: next }));
    setDirty(true);
  };

  const handleApplySection = () => {
    save.mutate({
      slotData,
      seo: entry.seo,
      discovery: entry.discovery,
    });
  };

  return (
    <section className="animate-fade-up flex flex-col gap-4">
      <KompasEditorHeader entry={entry} completion={completion} />

      <NextActionCard state={completion} />

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

      <ArticleBasicsStep
        slotData={slotData}
        onChangeSlot={changeSlot}
        disabled={!editable}
      />

      <ArticleTextStep
        slotData={slotData}
        onChangeSlot={changeSlot}
        bodyImportKey={bodyImportKey}
        onImportedBody={applyImportedBody}
        editable={editable}
        onApplySection={handleApplySection}
      />

      {health.data && health.data.findings.length > 0 ? (
        <TechnicalDetails summary="Tehnički nalazi servera">
          <ul className="flex flex-col gap-1.5">
            {health.data.findings.map((finding) => (
              <li
                key={`${finding.ruleId}-${finding.fieldPath ?? ""}`}
                className="text-ink-55 text-[12px] leading-[1.5]"
              >
                <span className="font-semibold">{finding.ruleId}</span> v
                {finding.ruleVersion}
                {finding.fieldPath ? ` · ${finding.fieldPath}` : ""}:{" "}
                {finding.message}
              </li>
            ))}
          </ul>
        </TechnicalDetails>
      ) : null}
      <ArticleChecklist state={completion} />

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
