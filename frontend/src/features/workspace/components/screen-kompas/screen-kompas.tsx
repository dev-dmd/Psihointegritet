"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { StatCard } from "@/components/panel/stat-card";
import { TabPills } from "@/components/panel/tab-pills";

import { useCompassFlowAdmin } from "../../hooks/use-compass-flow-admin";
import {
  taxonomyErrorMessage,
  useTaxonomyRegistryCache,
  useTaxonomyRegistryQuery,
} from "../../hooks/use-taxonomy-registry";
import type { TaxonomyTerm } from "../../taxonomy-api";
import { LockIcon } from "../icons";
import { PageHeader } from "../page-header";
import { TaxonomyQuickEntry } from "../taxonomy-quick-entry";
import {
  type ManagedTaxonomyAxis,
  TaxonomyTermEditor,
} from "../taxonomy-term-editor";
import { AXIS_BY_TAB, TABS } from "./constants";
import { KompasContentList } from "../kompas-sadrzaj/kompas-content-list";
import { isEditableManagedTerm, isManagedAxis } from "./helpers";
import { IntakeLinks } from "./intake-links";
import { ReviewQueue } from "./review-queue";
import { SystemChoices } from "./system-choices";
import { TermList } from "./term-list";
import type { KompasTab } from "./types";
import {
  CompassAdminWorkspace,
  initialDefinition,
  type CompassWorkspaceSection,
} from "./compass-admin-workspace";

const WORKSPACE_TABS = [
  { id: "overview", label: "Pregled" },
  { id: "content", label: "Sadržaj" },
  { id: "registry", label: "Registar" },
  { id: "flow", label: "Tok pitanja" },
  { id: "results", label: "Prikaz rezultata" },
  { id: "testing", label: "Testiranje" },
  { id: "publishing", label: "Pregled i objavljivanje" },
] as const;

type WorkspaceTab = (typeof WORKSPACE_TABS)[number]["id"];

function isWorkspaceTab(value: string | null): value is WorkspaceTab {
  return WORKSPACE_TABS.some((tab) => tab.id === value);
}

/** Tabs whose content lives inside `CompassAdminWorkspace` and may need the
 * taxonomy registry query. */
const TABS_NEEDING_REGISTRY = new Set<WorkspaceTab>([
  "overview",
  "results",
  "testing",
  "publishing",
]);

/** Tabs whose content lives inside `CompassAdminWorkspace` and may need the
 * compass flow query. The "flow" tab only needs flows (not registry). */
const TABS_NEEDING_FLOWS = new Set<WorkspaceTab>([
  "overview",
  "flow",
  "results",
  "testing",
  "publishing",
]);

export function ScreenKompas({
  initialTab = null,
}: {
  /** Lets the CMS editor send the author back to the tab they came from. */
  initialTab?: string | null;
} = {}) {
  const [workspaceTab, setWorkspaceTab] = useState<WorkspaceTab>(
    isWorkspaceTab(initialTab) ? initialTab : "overview",
  );

  // Lift queries to ScreenKompas so they only fire when the active tab needs
  // them. The "content" and "registry" tabs manage their own data fetching.
  const registry = useTaxonomyRegistryQuery({
    enabled: TABS_NEEDING_REGISTRY.has(workspaceTab),
  });
  const flowAdmin = useCompassFlowAdmin(initialDefinition, {
    enabled: TABS_NEEDING_FLOWS.has(workspaceTab),
  });
  return (
    <section className="animate-fade-up">
      <PageHeader
        title="Kompas"
        description="Od registra i toka pitanja do testiranja istog Engine-a i kontrolisane objave."
      />
      <div className="rounded-panel border-line bg-surface mb-6 border px-4 py-4">
        <TabPills
          tabs={[...WORKSPACE_TABS]}
          activeId={workspaceTab}
          onChange={(id) => setWorkspaceTab(id as WorkspaceTab)}
        />
      </div>
      {workspaceTab === "content" ? (
        <KompasContentList />
      ) : workspaceTab === "registry" ? (
        <CompassRegistryPanel />
      ) : (
        <CompassAdminWorkspace
          section={workspaceTab as CompassWorkspaceSection}
          registry={registry}
          flowAdmin={flowAdmin}
        />
      )}
    </section>
  );
}

/**
 * K2 — admin surface over the canonical Kompas registry (D-053/ADR-022).
 *
 * Orchestration only: it owns the active tab and which term the editor has
 * open, and delegates every card, list and lifecycle control to this folder.
 * Network lifecycle lives in `hooks/use-taxonomy-registry.ts`; the backend
 * stays the authority for locks, validation and publication.
 */
function CompassRegistryPanel() {
  // The launcher's third card is content, and content now has its own screen
  // (D-063) rather than a tab in this one.
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<KompasTab>("areas");
  const [editorState, setEditorState] = useState<{
    axis: ManagedTaxonomyAxis;
    termId: string | null;
  } | null>(null);

  const registryQuery = useTaxonomyRegistryQuery();
  const { upsertTerm, upsertIntakeLink, invalidate } =
    useTaxonomyRegistryCache();

  const terms = registryQuery.data?.terms ?? [];
  const intakeLinks = registryQuery.data?.intakeLinks ?? [];
  const managedTerms = terms.filter((term) => !term.systemDefined);
  const areas = terms.filter((term) => term.axis === "topic_group");
  const topics = terms.filter((term) => term.axis === "topic");
  const waitingCount =
    managedTerms.filter((term) => term.status === "in_review").length +
    intakeLinks.filter((link) => link.status === "in_review").length;
  const publishedCount = managedTerms.filter(
    (term) => term.status === "published",
  ).length;
  const loadError = registryQuery.isError
    ? taxonomyErrorMessage(
        registryQuery.error,
        "Kompas registar se trenutno ne može učitati. Osvežite stranicu.",
      )
    : null;

  const activeAxis = AXIS_BY_TAB[activeTab];
  const activeTerms = activeAxis
    ? terms.filter((term) => term.axis === activeAxis)
    : [];
  const activeManagedAxis = isManagedAxis(activeAxis) ? activeAxis : undefined;
  const editorTerm = editorState?.termId
    ? (terms.find((term) => term.termId === editorState.termId) ?? null)
    : null;
  const editableEditorTerm =
    editorTerm && editorState && isManagedAxis(editorState.axis)
      ? isEditableManagedTerm(editorTerm, editorState.axis)
        ? editorTerm
        : null
      : null;

  const handleSaved = (saved: TaxonomyTerm) => {
    upsertTerm(saved);
    setEditorState(null);
  };

  return (
    <section>
      {loadError ? (
        <div className="border-danger/45 bg-danger/8 rounded-panel mb-6 border px-5 py-4">
          <p className="text-coffee text-[14.5px] font-semibold">
            Kompas registar se ne može učitati
          </p>
          <p className="text-ink-70 mt-1 text-[13px] leading-[1.5]">
            {loadError}
          </p>
        </div>
      ) : null}

      {registryQuery.isLoading ? (
        <p className="text-ink-55 text-[13.5px]">Učitavanje registra…</p>
      ) : loadError ? null : (
        <>
          <aside className="border-line bg-sage/8 rounded-panel mb-6 flex gap-3 border px-5 py-4">
            <LockIcon
              size={17}
              aria-hidden
              className="text-forest mt-0.5 shrink-0"
            />
            <div>
              <h2 className="text-forest text-[13.5px] font-semibold">
                Zaštićen identitet registra
              </h2>
              <p className="text-ink-55 mt-1 text-[12.5px] leading-[1.5]">
                Stabilni ID se postavlja samo pri kreiranju i zatim ostaje
                zaključan. Sistemske vrednosti i njihova semantika nisu slobodna
                polja ovog panela; koriste se samo kroz kontrolisane izbore.
              </p>
            </div>
          </aside>

          <SystemChoices terms={terms} />

          <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard value={String(areas.length)} label="Oblasti" />
            <StatCard value={String(topics.length)} label="Konkretne teme" />
            <StatCard
              value={String(waitingCount)}
              label="Čeka pregled"
              dot={waitingCount > 0 ? "warm" : undefined}
            />
            <StatCard
              value={String(publishedCount)}
              label="Objavljeno u registru"
              dot={publishedCount > 0 ? "meadow" : undefined}
            />
          </div>

          <TaxonomyQuickEntry
            terms={terms}
            onSaved={upsertTerm}
            onOpenContentWorkspace={() =>
              router.push("/radni-prostor/kompas/sadrzaj")
            }
          />

          <div className="rounded-panel border-line bg-surface border px-4 py-4 md:px-5">
            <TabPills
              tabs={TABS}
              activeId={activeTab}
              onChange={(tab) => {
                setActiveTab(tab as KompasTab);
                setEditorState(null);
              }}
            />
          </div>

          <div className="mt-6">
            {activeAxis && activeManagedAxis ? (
              <TermList
                terms={activeTerms}
                registryTerms={terms}
                tab={activeTab as Exclude<KompasTab, "links" | "review">}
                axis={activeManagedAxis}
                editor={
                  editorState?.axis === activeManagedAxis &&
                  (!editorState.termId || editableEditorTerm) ? (
                    <TaxonomyTermEditor
                      key={`${activeManagedAxis}:${editableEditorTerm?.revisionId ?? "new"}`}
                      axis={activeManagedAxis}
                      term={editableEditorTerm}
                      registryTerms={terms}
                      onSaved={handleSaved}
                      onCancel={() => setEditorState(null)}
                    />
                  ) : null
                }
                onCreate={() =>
                  setEditorState({ axis: activeManagedAxis, termId: null })
                }
                onEdit={(term) =>
                  setEditorState({
                    axis: activeManagedAxis,
                    termId: term.termId,
                  })
                }
                onChanged={handleSaved}
                onDeleted={() => {
                  setEditorState(null);
                  invalidate();
                }}
              />
            ) : null}
            {activeTab === "links" ? (
              <IntakeLinks
                links={intakeLinks}
                terms={terms}
                onCreated={upsertIntakeLink}
                onChanged={upsertIntakeLink}
              />
            ) : null}
            {activeTab === "review" ? (
              <ReviewQueue
                terms={terms}
                links={intakeLinks}
                onTermChanged={handleSaved}
                onLinkChanged={upsertIntakeLink}
              />
            ) : null}
          </div>
        </>
      )}
    </section>
  );
}
