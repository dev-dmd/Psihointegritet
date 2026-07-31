"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useState } from "react";

import { ActorBadge } from "@/components/panel/actor-badge";
import { EmptyDashedCard } from "@/components/panel/empty-dashed-card";
import { StatCard } from "@/components/panel/stat-card";
import {
  StatusBadge,
  type StatusBadgeTone,
} from "@/components/panel/status-badge";
import { TabPills } from "@/components/panel/tab-pills";
import { cn } from "@/helpers/cn";

import {
  fetchTaxonomyRegistry,
  TAXONOMY_REGISTRY_QUERY_KEY,
  TaxonomyApiError,
  type TaxonomyAxis,
  type TaxonomyIntakeLink,
  type TaxonomyRegistrySnapshot,
  type TaxonomyStatus,
  type TaxonomyTerm,
} from "../taxonomy-api";
import { LockIcon } from "./icons";
import { PageHeader } from "./page-header";
import {
  AXIS_EDITOR_CONFIG,
  type ManagedTaxonomyAxis,
  TaxonomyTermEditor,
} from "./taxonomy-term-editor";

type KompasTab =
  "areas" | "topics" | "audiences" | "goals" | "links" | "review";

const TABS: { id: KompasTab; label: string }[] = [
  { id: "areas", label: "Oblasti" },
  { id: "topics", label: "Teme" },
  { id: "audiences", label: "Publike" },
  { id: "goals", label: "Ciljevi sadržaja" },
  { id: "links", label: "Povezivanja" },
  { id: "review", label: "Pregled i odobrenja" },
];

const STATUS_META: Record<
  TaxonomyStatus,
  { label: string; tone: StatusBadgeTone }
> = {
  draft: { label: "Radna verzija", tone: "neutral" },
  in_review: { label: "U pregledu", tone: "wait" },
  approved: { label: "Odobreno", tone: "amber" },
  published: { label: "Objavljeno", tone: "ok" },
  archived: { label: "Arhivirano", tone: "soft" },
};

const AXIS_BY_TAB: Partial<Record<KompasTab, TaxonomyAxis>> = {
  areas: "topic_group",
  topics: "topic",
  audiences: "audience",
  goals: "content_goal",
};

const TAB_COPY: Record<
  Exclude<KompasTab, "links" | "review">,
  { title: string; description: string; empty: string }
> = {
  areas: {
    title: "Oblasti",
    description:
      "Široke javne grupe koje ljudima pomažu da započnu istraživanje. Ovo je Kompas oblast, ne Intake oblast podrške.",
    empty: "Još nema oblasti u registru.",
  },
  topics: {
    title: "Teme",
    description:
      "Konkretnije teme unutar jedne oblasti, sa kontrolisanim putem ka sadržaju ili stručnoj podršci.",
    empty: "Još nema konkretnih tema u registru.",
  },
  audiences: {
    title: "Publike",
    description:
      "Kontrolisane vrednosti koje opisuju kome je sadržaj prvenstveno namenjen.",
    empty: "Još nema definisanih publika.",
  },
  goals: {
    title: "Ciljevi sadržaja",
    description:
      "Šta korisnik može da dobije iz sadržaja: razumevanje, praktičan korak ili pripremu za razgovor.",
    empty: "Još nema definisanih ciljeva sadržaja.",
  },
};

const DATE_FORMATTER = new Intl.DateTimeFormat("sr-Latn-RS", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

function formatDate(value: string): string {
  return DATE_FORMATTER.format(new Date(value));
}

function sortTerms(terms: TaxonomyTerm[]): TaxonomyTerm[] {
  return [...terms].sort(
    (left, right) =>
      left.sortOrder - right.sortOrder ||
      left.publicLabel.localeCompare(right.publicLabel, "sr-Latn"),
  );
}

function publicLabelFor(
  terms: TaxonomyTerm[],
  axis: TaxonomyAxis,
  stableId: string | null | undefined,
): string | null {
  if (!stableId) return null;
  return (
    terms.find((term) => term.axis === axis && term.stableId === stableId)
      ?.publicLabel ?? null
  );
}

function isManagedAxis(
  axis: TaxonomyAxis | undefined,
): axis is ManagedTaxonomyAxis {
  return (
    axis === "topic_group" ||
    axis === "topic" ||
    axis === "audience" ||
    axis === "content_goal"
  );
}

function isEditableManagedTerm(
  term: TaxonomyTerm,
  axis: ManagedTaxonomyAxis,
): boolean {
  return term.axis === axis && !term.systemDefined && term.status === "draft";
}

function RegistryFlag({
  active,
  children,
}: {
  active: boolean;
  children: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-1 text-[11.5px] font-semibold",
        active
          ? "bg-badge-ok-bg text-badge-ok"
          : "bg-badge-neutral-bg text-badge-neutral",
      )}
    >
      {children}
    </span>
  );
}

function TermCard({
  term,
  registryTerms,
  onEdit,
}: {
  term: TaxonomyTerm;
  registryTerms: TaxonomyTerm[];
  onEdit?: () => void;
}) {
  const status = STATUS_META[term.status];
  const isRouteTerm = term.axis === "topic_group" || term.axis === "topic";
  const parentLabel = publicLabelFor(
    registryTerms,
    "topic_group",
    term.primaryParentStableId,
  );
  const journeyLabel = publicLabelFor(
    registryTerms,
    "journey_intent",
    term.journeyIntent,
  );
  const relatedLabels = term.relations
    .filter((relation) => relation.kind === "related_topic")
    .map((relation) => ({
      key: relation.targetTermId,
      label:
        publicLabelFor(registryTerms, "topic", relation.targetStableId) ??
        relation.targetStableId,
    }));

  return (
    <article className="rounded-card border-line bg-surface border px-5 py-[18px] md:px-6 md:py-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-coffee font-serif text-[20px] leading-tight">
            {term.publicLabel}
          </h3>
          <div className="text-ink-45 mt-1 flex items-center gap-1.5 font-mono text-[11.5px]">
            <LockIcon size={12} aria-hidden />
            <span>Stabilni ID: {term.stableId}</span>
          </div>
        </div>
        <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
      </div>

      <p className="text-ink-55 mt-3 text-[13.5px] leading-[1.55]">
        {term.shortDescription || "Kratak javni opis još nije unet."}
      </p>

      {term.axis === "topic" ? (
        <div className="text-ink-55 mt-3 grid gap-1 text-[12.5px] sm:grid-cols-2">
          <span>Oblast: {parentLabel ?? "nije izabrana"}</span>
          <span>Put korisnika: {journeyLabel ?? "nije izabran"}</span>
        </div>
      ) : null}

      <div className="text-ink-45 mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11.5px]">
        <span>Redosled: {term.sortOrder}</span>
        {term.iconKey ? <span>Ikona: {term.iconKey}</span> : null}
        {term.assetId ? <span>Asset: {term.assetId}</span> : null}
      </div>

      {term.searchTerms.length > 0 ? (
        <div className="mt-3">
          <div className="text-ink-45 mb-1.5 text-[10.5px] font-semibold tracking-[0.1em] uppercase">
            Sinonimi i pretraga
          </div>
          <div className="flex flex-wrap gap-1.5">
            {term.searchTerms.slice(0, 6).map((searchTerm) => (
              <span
                key={searchTerm}
                className="border-line-strong text-ink-55 rounded-full border px-2.5 py-1 text-[11.5px]"
              >
                {searchTerm}
              </span>
            ))}
            {term.searchTerms.length > 6 ? (
              <span className="text-ink-45 px-1 py-1 text-[11.5px]">
                +{term.searchTerms.length - 6}
              </span>
            ) : null}
          </div>
        </div>
      ) : null}

      {relatedLabels.length > 0 ? (
        <div className="mt-3">
          <div className="text-ink-45 mb-1.5 text-[10.5px] font-semibold tracking-[0.1em] uppercase">
            Povezane teme
          </div>
          <div className="flex flex-wrap gap-1.5">
            {relatedLabels.map((related) => (
              <span
                key={related.key}
                className="bg-badge-soft-bg text-badge-soft rounded-full px-2.5 py-1 text-[11.5px] font-semibold"
              >
                {related.label}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      {term.internalExpertNote ? (
        <details className="border-line rounded-tile mt-3 border px-3 py-2.5">
          <summary className="text-ink-70 cursor-pointer text-[12px] font-semibold">
            Interna stručna napomena
          </summary>
          <p className="text-ink-55 mt-2 text-[12.5px] leading-[1.55] whitespace-pre-wrap">
            {term.internalExpertNote}
          </p>
        </details>
      ) : null}

      <div className="border-line mt-4 flex flex-wrap items-center gap-2 border-t pt-3">
        <RegistryFlag active={term.publicVisible}>
          {term.publicVisible ? "Javno vidljivo" : "Nije javno"}
        </RegistryFlag>
        <RegistryFlag active={term.compassEnabled}>
          {term.compassEnabled ? "Aktivno u Kompasu" : "Van Kompasa"}
        </RegistryFlag>
        {isRouteTerm ? (
          term.canonicalPath ? (
            <span className="bg-badge-soft-bg text-badge-soft max-w-full truncate rounded-full px-2.5 py-1 font-mono text-[11px]">
              {term.canonicalPath}
            </span>
          ) : (
            <span className="bg-badge-amber-bg text-badge-amber rounded-full px-2.5 py-1 text-[11.5px] font-semibold">
              Putanja nije potvrđena
            </span>
          )
        ) : null}
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <ActorBadge
            action="Poslednja izmena"
            actor={term.updatedBy ?? null}
          />
          <span className="text-ink-45 text-[11.5px]">
            {term.versionLabel} · {formatDate(term.updatedAt)}
          </span>
        </div>
        {onEdit ? (
          <button
            type="button"
            onClick={onEdit}
            className="border-line-strong text-ink-70 hover:border-coffee/40 cursor-pointer rounded-full border bg-transparent px-3.5 py-2 text-[12.5px] font-semibold transition-colors"
          >
            Uredi
          </button>
        ) : null}
      </div>
    </article>
  );
}

function TermList({
  terms,
  registryTerms,
  tab,
  axis,
  editor,
  onCreate,
  onEdit,
}: {
  terms: TaxonomyTerm[];
  registryTerms: TaxonomyTerm[];
  tab: Exclude<KompasTab, "links" | "review">;
  axis: ManagedTaxonomyAxis;
  editor: ReactNode;
  onCreate: () => void;
  onEdit: (term: TaxonomyTerm) => void;
}) {
  const copy = TAB_COPY[tab];
  return (
    <div role="tabpanel" aria-label={copy.title}>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-forest font-serif text-[22px]">{copy.title}</h2>
          <p className="text-ink-55 mt-1 max-w-[760px] text-[13.5px] leading-[1.5]">
            {copy.description}
          </p>
        </div>
        <button
          type="button"
          onClick={onCreate}
          className="bg-forest text-panel-canvas hover:bg-forest-hover cursor-pointer rounded-full border-0 px-4 py-2.5 text-[13px] font-semibold transition-colors"
        >
          {AXIS_EDITOR_CONFIG[axis].newLabel}
        </button>
      </div>
      {editor}
      {terms.length === 0 ? (
        <EmptyDashedCard title={copy.empty}>
          Podaci će se pojaviti ovde čim budu uneti kroz registar. Panel ne
          koristi rezervne kategorije iz frontend koda.
        </EmptyDashedCard>
      ) : (
        <div className="grid grid-cols-1 gap-3.5 xl:grid-cols-2">
          {sortTerms(terms).map((term) => (
            <TermCard
              key={term.revisionId}
              term={term}
              registryTerms={registryTerms}
              {...(isEditableManagedTerm(term, axis)
                ? { onEdit: () => onEdit(term) }
                : {})}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function IntakeLinkCards({ links }: { links: TaxonomyIntakeLink[] }) {
  return (
    <div className="grid grid-cols-1 gap-3.5 xl:grid-cols-2">
      {[...links]
        .sort((left, right) =>
          left.topicLabel.localeCompare(right.topicLabel, "sr-Latn"),
        )
        .map((link) => {
          const status = STATUS_META[link.status];
          return (
            <article
              key={link.linkId}
              className="rounded-card border-line bg-surface border px-5 py-[18px] md:px-6 md:py-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="text-ink-45 text-[10.5px] font-semibold tracking-[0.12em] uppercase">
                    Kompas tema
                  </div>
                  <h3 className="text-coffee mt-1 font-serif text-[20px]">
                    {link.topicLabel}
                  </h3>
                  <div className="text-ink-45 mt-0.5 font-mono text-[11.5px]">
                    {link.topicStableId}
                  </div>
                </div>
                <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
              </div>
              <div className="border-line mt-4 border-t pt-4">
                <div className="text-ink-45 text-[10.5px] font-semibold tracking-[0.12em] uppercase">
                  Intake oblast podrške
                </div>
                <div className="text-forest mt-1 text-[14px] font-semibold">
                  {link.supportAreaLabel}
                </div>
                <div className="text-ink-45 mt-0.5 font-mono text-[11.5px]">
                  {link.supportAreaStableId}
                </div>
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <ActorBadge
                  action="Poslednja izmena"
                  actor={link.updatedBy ?? null}
                />
                <span className="text-ink-45 text-[11.5px]">
                  {formatDate(link.updatedAt)}
                </span>
              </div>
            </article>
          );
        })}
    </div>
  );
}

function IntakeLinks({ links }: { links: TaxonomyIntakeLink[] }) {
  return (
    <div role="tabpanel" aria-label="Povezivanja">
      <div className="mb-4">
        <h2 className="text-forest font-serif text-[22px]">Povezivanja</h2>
        <p className="text-ink-55 mt-1 max-w-[760px] text-[13.5px] leading-[1.5]">
          Kontrolisani most između konkretne Kompas teme i zaključane sistemske
          Intake oblasti podrške. Status pokazuje da li je veza stručno
          potvrđena; ona ne bira niti rangira terapeuta.
        </p>
      </div>
      {links.length === 0 ? (
        <EmptyDashedCard title="Još nema povezivanja">
          Kompas teme i Intake oblasti podrške ostaju odvojene dok stručni tim
          ne potvrdi njihovu vezu.
        </EmptyDashedCard>
      ) : (
        <IntakeLinkCards links={links} />
      )}
    </div>
  );
}

function ReviewQueue({
  terms,
  links,
}: {
  terms: TaxonomyTerm[];
  links: TaxonomyIntakeLink[];
}) {
  const reviewTerms = sortTerms(
    terms.filter(
      (term) =>
        !term.systemDefined &&
        (term.status === "in_review" || term.status === "approved"),
    ),
  );
  const reviewLinks = links.filter(
    (link) => link.status === "in_review" || link.status === "approved",
  );

  return (
    <div role="tabpanel" aria-label="Pregled i odobrenja">
      <div className="mb-4">
        <h2 className="text-forest font-serif text-[22px]">
          Pregled i odobrenja
        </h2>
        <p className="text-ink-55 mt-1 max-w-[760px] text-[13.5px] leading-[1.5]">
          Zajednički pregled stavki koje čekaju stručnu ili poslovnu odluku i
          odobrenih stavki spremnih za objavu.
        </p>
      </div>
      {reviewTerms.length === 0 && reviewLinks.length === 0 ? (
        <EmptyDashedCard title="Nema stavki koje čekaju odluku">
          Radne verzije će se pojaviti ovde nakon slanja na pregled.
        </EmptyDashedCard>
      ) : (
        <div className="space-y-5">
          {reviewTerms.length > 0 ? (
            <section>
              <h3 className="text-ink-70 mb-2 text-[12px] font-semibold tracking-[0.12em] uppercase">
                Registar · {reviewTerms.length}
              </h3>
              <div className="grid grid-cols-1 gap-3.5 xl:grid-cols-2">
                {reviewTerms.map((term) => (
                  <TermCard
                    key={term.revisionId}
                    term={term}
                    registryTerms={terms}
                  />
                ))}
              </div>
            </section>
          ) : null}
          {reviewLinks.length > 0 ? (
            <section>
              <h3 className="text-ink-70 mb-2 text-[12px] font-semibold tracking-[0.12em] uppercase">
                Povezivanja · {reviewLinks.length}
              </h3>
              <IntakeLinkCards links={reviewLinks} />
            </section>
          ) : null}
        </div>
      )}
    </div>
  );
}

export function ScreenKompas() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<KompasTab>("areas");
  const [editorState, setEditorState] = useState<{
    axis: ManagedTaxonomyAxis;
    termId: string | null;
  } | null>(null);
  const registryQuery = useQuery({
    queryKey: TAXONOMY_REGISTRY_QUERY_KEY,
    queryFn: () => fetchTaxonomyRegistry(),
    staleTime: 30_000,
  });

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
    ? registryQuery.error instanceof TaxonomyApiError
      ? registryQuery.error.message
      : "Kompas registar se trenutno ne može učitati. Osvežite stranicu."
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
    queryClient.setQueryData<TaxonomyRegistrySnapshot>(
      TAXONOMY_REGISTRY_QUERY_KEY,
      (current) => ({
        terms: [
          ...(current?.terms ?? []).filter(
            (term) => term.termId !== saved.termId,
          ),
          saved,
        ],
        intakeLinks: current?.intakeLinks ?? [],
      }),
    );
    setEditorState(null);
  };

  return (
    <section className="animate-fade-up">
      <PageHeader
        title="Kompas"
        description="Centralni registar oblasti, tema i kontrolisanih veza koje koriste CMS, preporuke i javni Kompas. Podaci se učitavaju iz baze kao jedinog autoriteta."
      />

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
              />
            ) : null}
            {activeTab === "links" ? <IntakeLinks links={intakeLinks} /> : null}
            {activeTab === "review" ? (
              <ReviewQueue terms={terms} links={intakeLinks} />
            ) : null}
          </div>
        </>
      )}
    </section>
  );
}
