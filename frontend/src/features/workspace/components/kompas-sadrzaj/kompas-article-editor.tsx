"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { slotSpecRegistry } from "@/lib/content-governance/slot-schema";
import { templateRegistry } from "@/lib/content-governance/limits";

import type { ApiContentRevision } from "../../content-api";
import {
  useContentEntriesCache,
  useContentReviewMutation,
  useContentRevisionHealthQuery,
  useContentTransitionMutation,
  useDeleteContentRevisionMutation,
  useNewContentDraftMutation,
  useSaveContentRevisionMutation,
  useSubmitArticleReviewMutation,
} from "../../hooks/use-content-revision";
import { useTaxonomyRegistryLookupQuery } from "../../hooks/use-taxonomy-registry";
import { contentErrorMessage } from "../../hooks/use-content-entries";
import { usePanelErrors } from "../../panel-errors";
import type { RichDoc } from "@/lib/content-governance/rich-doc";

import { KompasContentActions } from "./kompas-content-actions";
import { KompasEditorHeader } from "./kompas-editor-header";
import { NextActionCard } from "./next-action-card";
import { deriveArticleCompletion } from "./article-completion";
import { ArticleBasicsStep } from "./article-basics-step";
import { ArticleTextStep } from "./article-text-step";
import { ArticleTaxonomyStep } from "./article-taxonomy-step";
import { ArticleCompassStep } from "./article-compass-step";
import { ArticleReviewStep } from "./article-review-step";
import { TechnicalDetails } from "../taxonomy-term-form/technical-details";
import type { ApiContentDiscovery } from "../../content-api";

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
  const [discovery, setDiscovery] = useState<ApiContentDiscovery>(
    () => entry.discovery,
  );
  const [dirty, setDirty] = useState(false);
  const [bodyImportKey, setBodyImportKey] = useState(0);

  const health = useContentRevisionHealthQuery(entry);
  const registry = useTaxonomyRegistryLookupQuery();

  // Auto-populate format and access level from the registry. These are
  // system defaults — computed as a derived value rather than an effect so
  // the checklist is accurate from the first render that has registry data.
  const effectiveDiscovery = useMemo((): ApiContentDiscovery => {
    if (!registry.data) return discovery;
    const formatTerm = registry.data.terms.find(
      (term) => term.axis === "content_format" && term.systemDefined === true,
    );
    const accessTerm = registry.data.terms.find(
      (term) => term.axis === "access_level" && term.systemDefined === true,
    );
    if (!formatTerm && !accessTerm) return discovery;
    const formatId =
      discovery.contentFormatTermId ?? formatTerm?.termId ?? null;
    const accessId = discovery.accessLevelTermId ?? accessTerm?.termId ?? null;
    if (
      formatId === discovery.contentFormatTermId &&
      accessId === discovery.accessLevelTermId
    )
      return discovery;
    return {
      ...discovery,
      contentFormatTermId: formatId,
      accessLevelTermId: accessId,
    };
  }, [discovery, registry.data]);

  // Derive the article's completion state from slot data, discovery metadata,
  // and server-side Content Health findings. The same state feeds the stepper,
  // the next-action card, and the checklist.
  const completion = deriveArticleCompletion(
    { slotData, discovery: effectiveDiscovery, status: entry.status },
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
    },
    onFailed: fail("Tekst nije sačuvan"),
  });

  const transition = useContentTransitionMutation(entry, {
    onOutcome: (outcome) => {
      if (outcome.kind === "moved") {
        replaceEntry(outcome.entry);
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

  const submit = useSubmitArticleReviewMutation(entry, {
    onSubmitted: (next) => {
      replaceEntry(next);
      setDirty(false);
    },
    onFailed: fail("Tekst nije poslat na pregled"),
  });

  const newDraft = useNewContentDraftMutation(entry, {
    onCreated: (next) => {
      replaceEntry(next);
      setDirty(false);
      // Navigate to the newly created draft so the editor is attached to the
      // correct revisionId and the wizard is interactive again.
      window.location.href = `/radni-prostor/kompas/sadrzaj/${next.entryId}`;
    },
    onFailed: fail("Nova radna verzija nije kreirana"),
  });

  const remove = useDeleteContentRevisionMutation(entry, {
    onRemoved: () => {
      removeEntry(entry.entryId);
      router.push(HREF);
    },
    onFailed: fail("Radna verzija nije obrisana"),
  });

  const review = useContentReviewMutation(entry, {
    onRecorded: (next) => {
      replaceEntry(next);
      // Rejected decisions return a new draft revision — navigate to it.
      if (next.status === "draft" && next.revisionId !== entry.revisionId) {
        window.location.href = `/radni-prostor/kompas/sadrzaj/${next.entryId}`;
      }
    },
    onFailed: fail("Odluka nije zabeležena"),
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
  const isBusy =
    save.isPending ||
    transition.isPending ||
    submit.isPending ||
    newDraft.isPending ||
    review.isPending ||
    remove.isPending;

  const changeSlot = (name: string, next: unknown) => {
    setSlotData((current) => ({ ...current, [name]: next }));
    setDirty(true);
  };

  const changeDiscovery = (next: ApiContentDiscovery) => {
    setDiscovery(next);
    setDirty(true);
  };

  const handleApplySection = () => {
    save.mutate({
      slotData,
      seo: entry.seo,
      discovery: effectiveDiscovery,
    });
  };

  const handleSendForReview = () => {
    submit.mutate({
      slotData,
      seo: entry.seo,
      discovery: effectiveDiscovery,
      idempotencyKey: crypto.randomUUID(),
    });
  };

  const handleNewDraft = () => {
    const reason =
      entry.status === "approved"
        ? "edit_after_approval"
        : entry.status === "published"
          ? "edit_published_content"
          : entry.status === "archived"
            ? "edit_archived_content"
            : "author_withdrawal";
    newDraft.mutate(reason);
  };

  const handleReview = (input: {
    capability: "clinical" | "business" | "legal";
    outcome: "approved" | "rejected";
    note?: string;
  }) => {
    review.mutate(input);
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
        isApplying={save.isPending}
      />

      <ArticleTaxonomyStep discovery={discovery} onChange={changeDiscovery} />

      <ArticleCompassStep discovery={discovery} onChange={changeDiscovery} />

      <ArticleReviewStep
        completion={completion}
        canSubmit={completion.canSubmitForReview}
        entryStatus={entry.status}
        isBusy={isBusy}
        decisions={entry.decisions}
        onSubmit={handleSendForReview}
        {...(health.data
          ? {
              requiredApprovals: health.data.requiredApprovals,
              missingApprovals: health.data.missingApprovals,
            }
          : {})}
        {...(entry.status === "in_review"
          ? { onWithdraw: handleNewDraft, onReview: handleReview }
          : {})}
        {...(entry.status === "approved" ||
        entry.status === "published" ||
        entry.status === "archived"
          ? { onNewDraft: handleNewDraft }
          : {})}
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
      <div className="rounded-panel border-line bg-surface flex flex-wrap items-center justify-between gap-3 border px-6 py-4">
        <button
          type="button"
          disabled={!editable || isBusy || !dirty}
          onClick={() =>
            save.mutate({
              slotData,
              seo: entry.seo,
              discovery: effectiveDiscovery,
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
