"use client";

import type { Route } from "next";
import Link from "next/link";
import { useMemo, useState } from "react";

import {
  StatusBadge,
  type StatusBadgeTone,
} from "@/components/panel/status-badge";
import { ActorBadge } from "@/components/panel/actor-badge";
import { templateRegistry } from "@/lib/content-governance/limits";
import { slotSpecRegistry } from "@/lib/content-governance/slot-schema";

import type {
  ApiContentPublishBlock,
  ApiContentRevision,
} from "../content-api";
import {
  CONTENT_APPROVAL_LABELS,
  requiredContentApprovals,
} from "../content-approval-policy";
import { validateContentDraft } from "../content-editor-validation";
import { contentErrorMessage } from "../hooks/use-content-entries";
import {
  useContentEntriesCache,
  useContentReviewMutation,
  useContentRevisionHealthQuery,
  useContentTransitionMutation,
  useDeleteContentRevisionMutation,
  useSaveContentRevisionMutation,
} from "../hooks/use-content-revision";
import { usePanelErrors, type PanelErrorResource } from "../panel-errors";
import { SlotEditor } from "./slot-editor";
import { SeoPreviewPanel } from "./seo-preview-panel";
import { ContentDiscoveryMetadataEditor } from "./content-discovery-metadata";

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

function initialSlotData(entry: ApiContentRevision): Record<string, unknown> {
  const data = { ...entry.slotData };
  const definition = templateRegistry[entry.template];
  const specs = slotSpecRegistry[entry.template];
  for (const slotName of definition.requiredSlots) {
    if (data[slotName] !== undefined) continue;
    if (specs[slotName]?.editability === "computed") continue;
    data[slotName] = { mode: "inherit" };
  }
  return data;
}

/**
 * One revision: schema-driven fields, live validation, save/delete and the
 * governed review lifecycle. Action errors go through `usePanelErrors`
 * (nav red-border + Pregled list), same as `screen-dokumenti.tsx`.
 */
export function ContentRevisionEditor({
  entry,
  displayTitle,
  publicRoute,
  onDeleted,
}: {
  entry: ApiContentRevision;
  displayTitle: string;
  publicRoute: string;
  onDeleted: () => void;
}) {
  const { reportError, clearErrorsForResource } = usePanelErrors();
  const { replaceEntry: replaceInCache, removeEntry } =
    useContentEntriesCache();
  const [slotData, setSlotData] = useState<Record<string, unknown>>(() =>
    initialSlotData(entry),
  );
  const [seo, setSeo] = useState(entry.seo);
  const [discovery, setDiscovery] = useState(entry.discovery);
  const [pendingDelete, setPendingDelete] = useState(false);

  const definition = templateRegistry[entry.template];
  const slots = [...definition.requiredSlots, ...definition.optionalSlots];
  const specs = slotSpecRegistry[entry.template];
  const requiredApprovals = requiredContentApprovals(
    entry.contentType,
    entry.template,
  );
  const liveFindings = useMemo(
    () => validateContentDraft(entry, slotData, seo),
    [entry, seo, slotData],
  );
  const serverHealthQuery = useContentRevisionHealthQuery(entry);

  // Only draft/approved revisions are editable at all (mirrors the backend's
  // own `update_revision` guard); everything else needs CG-C4's lifecycle to
  // return to draft first.
  const isEditable = entry.status === "draft" || entry.status === "approved";
  const isDirty =
    JSON.stringify(slotData) !== JSON.stringify(entry.slotData) ||
    JSON.stringify(seo) !== JSON.stringify(entry.seo) ||
    JSON.stringify(discovery) !== JSON.stringify(entry.discovery);

  const reportApiError = (title: string, error: unknown) => {
    reportError({
      href: HREF,
      tabLabel: TAB_LABEL,
      resource: resourceFor(entry),
      title,
      description: contentErrorMessage(
        error,
        "Zahtev nije uspeo. Pokušajte ponovo.",
      ),
      details: [],
    });
  };

  const replaceEntry = (next: ApiContentRevision) => {
    clearErrorsForResource(resourceFor(entry));
    replaceInCache(next);
  };

  /** Renders a publish block as panel errors: one entry per finding when the
   * server returned findings, otherwise a single stage-level message. */
  const reportPublishBlock = (block: ApiContentPublishBlock) => {
    clearErrorsForResource(resourceFor(entry));
    if (block.findings.length > 0) {
      for (const finding of block.findings) {
        reportError({
          href: HREF,
          tabLabel: TAB_LABEL,
          resource: {
            ...resourceFor(entry),
            ruleId: finding.ruleId,
            ...(finding.fieldPath ? { fieldPath: finding.fieldPath } : {}),
          },
          title: finding.message,
          description: finding.remediation,
          details: finding.requiresApproval
            ? [
                `Potrebno odobrenje: ${CONTENT_APPROVAL_LABELS[finding.requiresApproval]}.`,
              ]
            : [],
        });
      }
      return;
    }
    reportError({
      href: HREF,
      tabLabel: TAB_LABEL,
      resource: resourceFor(entry),
      title: "Stranica još nije spremna za objavu",
      description:
        block.stage === "approvals"
          ? "Nedostaju obavezne odluke pregleda."
          : "Revizija mora prvo proći dozvoljeni lifecycle korak.",
      details: block.missing.map((item) => CONTENT_APPROVAL_LABELS[item]),
    });
  };

  const saveMutation = useSaveContentRevisionMutation(entry, {
    onSaved: replaceEntry,
    onFailed: (error) =>
      reportApiError(`Izmena nije sačuvana za „${publicRoute}”`, error),
  });

  const transitionMutation = useContentTransitionMutation(entry, {
    onOutcome: (outcome) => {
      if (outcome.kind === "blocked") {
        reportPublishBlock(outcome.block);
        return;
      }
      replaceEntry(outcome.entry);
    },
    onFailed: (error) =>
      reportApiError(`Promena statusa za „${publicRoute}” nije uspela`, error),
  });

  const reviewMutation = useContentReviewMutation(entry, {
    onRecorded: replaceEntry,
    onFailed: (error) =>
      reportApiError(`Odobrenje za „${publicRoute}” nije sačuvano`, error),
  });

  const lifecyclePending =
    transitionMutation.isPending || reviewMutation.isPending;

  const deleteMutation = useDeleteContentRevisionMutation(entry, {
    onRemoved: () => {
      clearErrorsForResource(resourceFor(entry));
      removeEntry(entry.entryId);
      onDeleted();
    },
    onFailed: (error) => {
      setPendingDelete(false);
      reportApiError(`CMS verzija za „${publicRoute}” nije uklonjena`, error);
    },
  });

  return (
    <div className="rounded-panel border-line bg-surface mt-4 border px-5 py-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-coffee text-[15px] font-semibold">
            {displayTitle}
          </div>
          <div className="text-ink-55 mt-0.5 text-[12.5px]">
            {publicRoute} · {entry.template} · {entry.versionLabel}
          </div>
        </div>
        <StatusBadge tone={STATUS_TONES[entry.status] ?? "neutral"}>
          {entry.status}
        </StatusBadge>
      </div>
      <div className="mb-4 flex flex-wrap gap-2">
        <ActorBadge action="Kreirao/la" actor={entry.createdBy} />
        <ActorBadge action="Poslednja izmena" actor={entry.updatedBy} />
      </div>

      <div
        className={`rounded-tile mb-4 border px-4 py-3 ${
          serverHealthQuery.data?.findings.length === 0 &&
          serverHealthQuery.data.missingApprovals.length === 0
            ? "border-badge-ok/40 bg-badge-ok-bg"
            : "border-line bg-panel-canvas"
        }`}
        aria-live="polite"
      >
        <div className="text-coffee text-[13.5px] font-semibold">
          Serverska Content Health provera
          {serverHealthQuery.data
            ? ` · pravila v${serverHealthQuery.data.ruleSetVersion}`
            : ""}
        </div>
        {serverHealthQuery.isLoading ? (
          <p className="text-ink-55 mt-1 text-[12.5px]">
            Provera sačuvane revizije…
          </p>
        ) : serverHealthQuery.isError ? (
          <p className="text-danger mt-1 text-[12.5px]">
            Serverska provera trenutno nije dostupna. Objavu i dalje
            autoritativno proverava backend.
          </p>
        ) : serverHealthQuery.data &&
          serverHealthQuery.data.findings.length > 0 ? (
          <>
            <ul className="mt-2 flex flex-col gap-2">
              {serverHealthQuery.data.findings.map((finding) => {
                const displayClass = finding.requiresApproval
                  ? "REVIEW_REQUIRED"
                  : finding.severity === "error"
                    ? "BLOCK"
                    : "WARNING";
                return (
                  <li
                    key={`${finding.ruleId}-${finding.fieldPath ?? ""}-${finding.message}`}
                    className={`rounded-lg border px-3 py-2 text-[12.5px] ${
                      displayClass === "BLOCK"
                        ? "border-danger/35 bg-danger/8 text-danger"
                        : "border-badge-amber/40 bg-badge-amber-bg text-coffee"
                    }`}
                  >
                    <div className="font-semibold">
                      {displayClass} · {finding.ruleId} v{finding.ruleVersion}
                      {finding.fieldPath ? ` · ${finding.fieldPath}` : ""}
                      {finding.requiresApproval
                        ? ` · ${CONTENT_APPROVAL_LABELS[finding.requiresApproval]}`
                        : ""}
                    </div>
                    <div className="mt-0.5">{finding.message}</div>
                    <div className="text-ink-70 mt-0.5">
                      {finding.remediation}
                    </div>
                  </li>
                );
              })}
            </ul>
            {serverHealthQuery.data.missingApprovals.length > 0 ? (
              <p className="text-ink-70 mt-2 text-[12px]">
                Nedostaju odobrenja:{" "}
                {serverHealthQuery.data.missingApprovals
                  .map((item) => CONTENT_APPROVAL_LABELS[item])
                  .join(", ")}
                .
              </p>
            ) : null}
          </>
        ) : serverHealthQuery.data ? (
          <>
            <p className="text-badge-ok mt-1 text-[12.5px]">
              PASSED · sačuvana revizija nema serverskih content nalaza.
            </p>
            {serverHealthQuery.data.missingApprovals.length > 0 ? (
              <p className="text-ink-70 mt-2 text-[12px]">
                Za sledeću fazu nedostaju odobrenja:{" "}
                {serverHealthQuery.data.missingApprovals
                  .map((item) => CONTENT_APPROVAL_LABELS[item])
                  .join(", ")}
                .
              </p>
            ) : null}
          </>
        ) : null}
      </div>

      {!isEditable ? (
        <p className="text-ink-55 mb-3 text-[12.5px]">
          Revizija u statusu „{entry.status}” se ne menja ovde — draft editor
          uređuje samo radne verzije.
        </p>
      ) : null}

      <div
        className={`rounded-tile mb-4 border px-4 py-3 ${
          liveFindings.length === 0
            ? "border-badge-ok/40 bg-badge-ok-bg"
            : "border-line bg-panel-canvas"
        }`}
        aria-live="polite"
      >
        <div className="text-coffee text-[13.5px] font-semibold">
          Živa provera trenutnog unosa ·{" "}
          {liveFindings.length === 0
            ? "PASSED"
            : `${liveFindings.length} nalaza`}
        </div>
        {liveFindings.length > 0 ? (
          <ul className="mt-2 flex flex-col gap-2">
            {liveFindings.map((finding) => {
              const displayClass = finding.requiresApproval
                ? "REVIEW_REQUIRED"
                : finding.severity === "error"
                  ? "BLOCK"
                  : "WARNING";
              return (
                <li
                  key={`${finding.ruleId}-${finding.field ?? ""}-${finding.message}`}
                  className={`rounded-lg border px-3 py-2 text-[12.5px] ${
                    displayClass === "BLOCK"
                      ? "border-danger/35 bg-danger/8 text-danger"
                      : "border-badge-amber/40 bg-badge-amber-bg text-coffee"
                  }`}
                >
                  <div className="font-semibold">
                    {displayClass} · {finding.ruleId}
                    {finding.ruleVersion ? ` v${finding.ruleVersion}` : ""}
                    {finding.field ? ` · ${finding.field}` : ""}
                    {finding.requiresApproval
                      ? ` · ${CONTENT_APPROVAL_LABELS[finding.requiresApproval]}`
                      : ""}
                  </div>
                  <div className="mt-0.5">{finding.message}</div>
                  <div className="text-ink-70 mt-0.5">
                    {finding.recommendation}
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-badge-ok mt-1 text-[12.5px]">
            Nema nalaza za trenutno unete vrednosti.
          </p>
        )}
      </div>

      <SeoPreviewPanel
        route={publicRoute}
        value={seo}
        onChange={setSeo}
        disabled={!isEditable}
      />

      <ContentDiscoveryMetadataEditor
        value={discovery}
        onChange={setDiscovery}
        disabled={!isEditable}
        entryId={entry.entryId}
      />

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

      {entry.status === "in_review" ? (
        <div className="border-line bg-panel-canvas rounded-tile mt-4 border px-4 py-3">
          <div className="text-coffee text-[13.5px] font-semibold">
            Obavezna odobrenja
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {requiredApprovals.map((capability) => {
              const decision = entry.decisions.find(
                (item) => item.capability === capability,
              );
              return (
                <button
                  key={capability}
                  type="button"
                  disabled={
                    lifecyclePending || decision?.outcome === "approved"
                  }
                  onClick={() => reviewMutation.mutate(capability)}
                  className="border-line-strong text-ink-70 disabled:bg-badge-ok-bg disabled:text-badge-ok cursor-pointer rounded-full border bg-transparent px-3.5 py-2 text-[13px] font-semibold disabled:cursor-default"
                >
                  {CONTENT_APPROVAL_LABELS[capability]}
                  {decision?.outcome === "approved"
                    ? ` · ${decision.decidedBy?.displayName ?? "odobreno"}`
                    : ""}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      <div className="mt-3 flex flex-wrap items-center gap-2.5">
        {isDirty ? (
          <button
            type="button"
            disabled
            title="Sačuvajte izmene pre pregleda."
            className="border-line-strong text-ink-70 rounded-full border bg-transparent px-4 py-2.5 text-[13px] font-semibold opacity-50"
          >
            Pregled revizije
          </button>
        ) : (
          <Link
            href={
              `/radni-prostor/sadrzaj/${entry.entryId}/revizije/${entry.revisionId}/pregled` as Route
            }
            target="_blank"
            rel="noopener noreferrer"
            className="border-line-strong text-forest hover:border-coffee/40 rounded-full border bg-transparent px-4 py-2.5 text-[13px] font-semibold"
          >
            Pregled revizije
          </Link>
        )}
        <button
          type="button"
          disabled={!isEditable || saveMutation.isPending}
          onClick={() => saveMutation.mutate({ slotData, seo, discovery })}
          className="bg-forest text-panel-canvas hover:bg-forest-hover cursor-pointer rounded-full border-0 px-5 py-2.5 text-[13px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saveMutation.isPending ? "Čuvanje…" : "Sačuvaj"}
        </button>
        {entry.status === "draft" ? (
          <LifecycleButton
            label="Pošalji na pregled"
            disabled={lifecyclePending || isDirty}
            onClick={() => transitionMutation.mutate("in_review")}
          />
        ) : null}
        {entry.status === "in_review" ? (
          <>
            <LifecycleButton
              label="Označi kao odobreno"
              disabled={lifecyclePending || isDirty}
              onClick={() => transitionMutation.mutate("approved")}
            />
            <LifecycleButton
              label="Vrati na doradu"
              disabled={lifecyclePending || isDirty}
              onClick={() => transitionMutation.mutate("draft")}
            />
          </>
        ) : null}
        {entry.status === "approved" ? (
          <>
            <LifecycleButton
              label="Objavi"
              disabled={lifecyclePending || isDirty}
              onClick={() => transitionMutation.mutate("published")}
            />
            <LifecycleButton
              label="Nova radna verzija"
              disabled={lifecyclePending || isDirty}
              onClick={() => transitionMutation.mutate("draft")}
            />
          </>
        ) : null}
        {entry.status === "published" ? (
          <LifecycleButton
            label="Arhiviraj"
            disabled={lifecyclePending || isDirty}
            onClick={() => transitionMutation.mutate("archived")}
          />
        ) : null}
        {entry.status === "archived" ? (
          <LifecycleButton
            label="Nova radna verzija"
            disabled={lifecyclePending || isDirty}
            onClick={() => transitionMutation.mutate("draft")}
          />
        ) : null}
        {entry.status === "draft" ? (
          <button
            type="button"
            onClick={() => setPendingDelete(true)}
            className="border-danger/45 text-danger hover:bg-danger/8 cursor-pointer rounded-full border bg-transparent px-5 py-2.5 text-[13px] font-semibold transition-colors"
          >
            Ukloni CMS radnu verziju
          </button>
        ) : null}
      </div>
      {isDirty ? (
        <p className="text-ink-55 mt-2 text-[12px]">
          Sačuvajte izmene pre promene statusa, da pregled i objava koriste
          upravo ovu verziju sadržaja.
        </p>
      ) : null}

      {pendingDelete ? (
        <div className="border-danger/45 bg-danger/8 rounded-tile mt-3 px-4 py-3">
          <p className="text-coffee text-[13.5px] font-semibold">
            Ukloniti CMS radnu verziju za „{displayTitle}”?
          </p>
          <p className="text-ink-70 mt-1 text-[12px]">
            Sistemska stranica i postojeći tekst iz koda ostaju dostupni.
          </p>
          <div className="mt-2.5 flex gap-2.5">
            <button
              type="button"
              onClick={() => deleteMutation.mutate()}
              className="bg-danger text-panel-canvas cursor-pointer rounded-full border-0 px-4 py-2 text-[13px] font-semibold"
            >
              Ukloni radnu verziju
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

function LifecycleButton({
  label,
  disabled,
  onClick,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="border-line-strong text-ink-70 hover:border-coffee/40 cursor-pointer rounded-full border bg-transparent px-4 py-2.5 text-[13px] font-semibold disabled:cursor-not-allowed disabled:opacity-50"
    >
      {label}
    </button>
  );
}
