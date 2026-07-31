"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { FormEvent, ReactNode } from "react";
import { useState } from "react";

import { ActorBadge, type ActorSummary } from "@/components/panel/actor-badge";
import { EmptyDashedCard } from "@/components/panel/empty-dashed-card";
import { StatCard } from "@/components/panel/stat-card";
import {
  StatusBadge,
  type StatusBadgeTone,
} from "@/components/panel/status-badge";
import { TabPills } from "@/components/panel/tab-pills";
import { cn } from "@/helpers/cn";
import {
  approvalCapabilities,
  type ApprovalCapability,
} from "@/lib/content-governance/types";

import {
  createTaxonomyIntakeLink,
  fetchTaxonomyRegistry,
  recordTaxonomyIntakeLinkReview,
  recordTaxonomyReviewDecision,
  TAXONOMY_REGISTRY_QUERY_KEY,
  TaxonomyApiError,
  taxonomyFieldErrors,
  transitionTaxonomyIntakeLink,
  transitionTaxonomyRevision,
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

const APPROVAL_LABELS: Record<ApprovalCapability, string> = {
  clinical: "Stručno",
  legal: "Pravno",
  business: "Poslovno",
};

const PLANNED_ACCESS_OPTIONS = [
  { stableId: "subscriber", label: "Pretplata" },
  { stableId: "purchased", label: "Kupljen materijal" },
] as const;

const TERM_APPROVAL_CAPABILITIES: ApprovalCapability[] = [
  "clinical",
  "business",
];
const LINK_APPROVAL_CAPABILITIES: ApprovalCapability[] = ["clinical"];

interface ReviewDecisionView {
  capability: ApprovalCapability;
  outcome: "approved" | "rejected";
  note?: string | null;
  decidedBy?: ActorSummary | null;
  decidedAt?: string;
}

interface AuditEventView {
  toStatus: TaxonomyStatus;
  actor?: ActorSummary | null;
}

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

function latestActorForStatus(
  events: readonly AuditEventView[],
  status: TaxonomyStatus,
): ActorSummary | null {
  return events.find((event) => event.toStatus === status)?.actor ?? null;
}

function ActivityActorBadges({
  createdBy,
  updatedBy,
  events,
}: {
  createdBy?: ActorSummary | null;
  updatedBy?: ActorSummary | null;
  events: readonly AuditEventView[];
}) {
  const publishedBy = latestActorForStatus(events, "published");
  const archivedBy = latestActorForStatus(events, "archived");

  return (
    <div className="flex flex-wrap items-center gap-2">
      <ActorBadge action="Kreirao/la" actor={createdBy ?? null} />
      <ActorBadge action="Poslednja izmena" actor={updatedBy ?? null} />
      <ActorBadge action="Objavio/la" actor={publishedBy} />
      <ActorBadge action="Arhivirao/la" actor={archivedBy} />
    </div>
  );
}

function ApprovalEvidence({
  decisions,
}: {
  decisions: readonly ReviewDecisionView[];
}) {
  if (decisions.length === 0) return null;

  return (
    <section className="border-line mt-4 border-t pt-3">
      <h4 className="text-ink-45 text-[10.5px] font-semibold tracking-[0.1em] uppercase">
        Odluke o odobrenju
      </h4>
      <div className="mt-2 flex flex-wrap gap-2">
        {decisions.map((decision) => {
          const decisionLabel = `${APPROVAL_LABELS[decision.capability]} ${
            decision.outcome === "approved" ? "odobrenje" : "nije odobreno"
          }`;
          return (
            <div
              key={decision.capability}
              className="border-line-strong rounded-tile flex flex-wrap items-center gap-2 border px-2.5 py-2"
            >
              <span
                className={cn(
                  "text-[11.5px] font-semibold",
                  decision.outcome === "approved"
                    ? "text-badge-ok"
                    : "text-danger",
                )}
              >
                {decisionLabel}
              </span>
              <ActorBadge
                action={decision.outcome === "approved" ? "Odobrio/la" : "Odbio/la"}
                actor={decision.decidedBy ?? null}
              />
              {decision.decidedAt ? (
                <span className="text-ink-45 text-[11px]">
                  {formatDate(decision.decidedAt)}
                </span>
              ) : null}
            </div>
          );
        })}
      </div>
    </section>
  );
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

function SystemChoiceGroup({
  title,
  description,
  terms,
  planned = [],
  children,
}: {
  title: string;
  description: string;
  terms: TaxonomyTerm[];
  planned?: readonly { stableId: string; label: string }[];
  children?: ReactNode;
}) {
  return (
    <section className="border-line rounded-tile border px-4 py-3.5">
      <h3 className="text-ink-70 text-[13px] font-semibold">{title}</h3>
      <p className="text-ink-55 mt-1 text-[12px] leading-[1.45]">
        {description}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {terms.map((term) => (
          <span
            key={term.termId}
            className="border-line-strong text-ink-70 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11.5px] font-semibold"
          >
            <LockIcon size={11} aria-hidden />
            {term.publicLabel}
          </span>
        ))}
        {planned.map((option) => (
          <span
            key={option.stableId}
            aria-label={`${option.label} — u pripremi`}
            aria-disabled="true"
            className="border-line text-ink-45 inline-flex items-center gap-1.5 rounded-full border border-dashed px-2.5 py-1 text-[11.5px]"
          >
            {option.label}
            <span className="bg-badge-neutral-bg text-badge-neutral rounded-full px-1.5 py-0.5 text-[9.5px] font-semibold">
              U pripremi
            </span>
          </span>
        ))}
        {children}
        {terms.length === 0 && planned.length === 0 && !children ? (
          <span className="text-ink-45 text-[12px] italic">
            Nema dostupnih sistemskih vrednosti.
          </span>
        ) : null}
      </div>
    </section>
  );
}

function SystemChoices({ terms }: { terms: TaxonomyTerm[] }) {
  const systemTerms = (axis: TaxonomyAxis) =>
    sortTerms(
      terms.filter(
        (term) =>
          term.axis === axis &&
          term.systemDefined &&
          term.status !== "archived",
      ),
    );

  return (
    <section
      aria-labelledby="kompas-system-options-title"
      className="rounded-panel border-line bg-surface mb-6 border px-5 py-5"
    >
      <div className="flex items-start gap-3">
        <LockIcon
          size={17}
          aria-hidden
          className="text-forest mt-0.5 shrink-0"
        />
        <div>
          <h2
            id="kompas-system-options-title"
            className="text-forest text-[15px] font-semibold"
          >
            Kontrolisane sistemske opcije
          </h2>
          <p className="text-ink-55 mt-1 max-w-[780px] text-[12.5px] leading-[1.5]">
            Ove vrednosti dolaze iz registra ili zaključanog ugovora sistema.
            Administrator ih bira gde su relevantne, ali ne unosi slobodan tekst
            niti menja njihovu semantiku.
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        <SystemChoiceGroup
          title="Put korisnika"
          description="Bira se pri uređivanju konkretne teme."
          terms={systemTerms("journey_intent")}
        />
        <SystemChoiceGroup
          title="Format sadržaja"
          description="Kontrolisani izbor za CMS metapodatke u K3."
          terms={systemTerms("content_format")}
        />
        <SystemChoiceGroup
          title="Nivo pristupa"
          description="Izvršive vrednosti su spremne za CMS; plaćeni nivoi čekaju entitlement sloj."
          terms={systemTerms("access_level")}
          planned={PLANNED_ACCESS_OPTIONS}
        />
        <SystemChoiceGroup
          title="Tok i odobrenja"
          description="Status i tip odobrenja su sistemski ugovor; stvarne akcije se uvode u K2.6."
          terms={[]}
        >
          {(Object.keys(STATUS_META) as TaxonomyStatus[]).map((status) => (
            <span
              key={status}
              className="bg-badge-neutral-bg text-badge-neutral rounded-full px-2.5 py-1 text-[11.5px] font-semibold"
            >
              {STATUS_META[status].label}
            </span>
          ))}
          {approvalCapabilities.map((capability) => (
            <span
              key={capability}
              className="border-line-strong text-ink-70 rounded-full border px-2.5 py-1 text-[11.5px] font-semibold"
            >
              {APPROVAL_LABELS[capability]}
            </span>
          ))}
        </SystemChoiceGroup>
      </div>
    </section>
  );
}

function GovernanceError({ error }: { error: string | null }) {
  return error ? (
    <p
      role="alert"
      className="border-danger/45 bg-danger/8 text-ink-70 rounded-tile mt-3 border px-3 py-2.5 text-[12.5px] leading-[1.5]"
    >
      {error}
    </p>
  ) : null;
}

function FieldError({ message, id }: { message?: string; id: string }) {
  return message ? (
    <p id={id} role="alert" className="text-danger mt-1.5 text-[12px] leading-[1.4]">
      {message}
    </p>
  ) : null;
}

function ApprovalControls({
  capabilities,
  decisions,
  disabled,
  onDecision,
}: {
  capabilities: readonly ApprovalCapability[];
  decisions: readonly ReviewDecisionView[];
  disabled: boolean;
  onDecision: (
    capability: ApprovalCapability,
    outcome: "approved" | "rejected",
    note: string | undefined,
  ) => void;
}) {
  const [note, setNote] = useState("");
  return (
    <div className="border-line rounded-tile mt-3 border px-3.5 py-3.5">
      <h4 className="text-ink-70 text-[12.5px] font-semibold">
        Odobrenja za pregled
      </h4>
      <p className="text-ink-55 mt-1 text-[12px] leading-[1.45]">
        Svaka odluka ostavlja dokaz u ovoj reviziji. Nova odluka iste vrste
        zamenjuje prethodnu dok je stavka na pregledu.
      </p>
      <div className="mt-3 space-y-2.5">
        {capabilities.map((capability) => {
          const decision = decisions.find(
            (item) => item.capability === capability,
          );
          const label = APPROVAL_LABELS[capability];
          return (
            <div
              key={capability}
              className="border-line-strong rounded-tile flex flex-wrap items-center justify-between gap-2 border px-3 py-2.5"
            >
              <div>
                <div className="text-ink-70 text-[12.5px] font-semibold">
                  {label}
                </div>
                <div className="text-ink-45 mt-0.5 text-[11px]">
                  {decision?.outcome === "approved"
                    ? "Odobreno"
                    : decision?.outcome === "rejected"
                      ? "Nije odobreno"
                      : "Čeka odluku"}
                </div>
                {decision?.decidedBy ? (
                  <div className="mt-1.5">
                    <ActorBadge
                      action={
                        decision.outcome === "approved"
                          ? "Odobrio/la"
                          : "Odbio/la"
                      }
                      actor={decision.decidedBy}
                    />
                  </div>
                ) : null}
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() =>
                    onDecision(capability, "approved", note.trim() || undefined)
                  }
                  className="bg-forest text-panel-canvas hover:bg-forest-hover disabled:bg-ink-45 cursor-pointer rounded-full border-0 px-3 py-1.5 text-[11.5px] font-semibold transition-colors disabled:cursor-not-allowed"
                >
                  Odobri
                </button>
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() =>
                    onDecision(capability, "rejected", note.trim() || undefined)
                  }
                  className="border-line-strong text-ink-70 hover:border-danger/45 disabled:text-ink-45 cursor-pointer rounded-full border bg-transparent px-3 py-1.5 text-[11.5px] font-semibold transition-colors disabled:cursor-not-allowed"
                >
                  Ne odobravaj
                </button>
              </div>
            </div>
          );
        })}
      </div>
      <label className="text-ink-55 mt-3 block text-[11.5px]">
        Napomena odluke (opciono)
        <textarea
          value={note}
          maxLength={500}
          rows={2}
          disabled={disabled}
          onChange={(event) => setNote(event.target.value)}
          className="border-line-strong rounded-tile bg-panel-canvas text-coffee focus:border-sage mt-1.5 w-full resize-y border px-3 py-2 text-[12.5px] leading-[1.5] outline-none disabled:opacity-60"
        />
      </label>
    </div>
  );
}

function TermGovernanceControls({
  term,
  onChanged,
}: {
  term: TaxonomyTerm;
  onChanged: (term: TaxonomyTerm) => void;
}) {
  const transitionMutation = useMutation({
    mutationFn: (target: TaxonomyStatus) =>
      transitionTaxonomyRevision(
        term.termId,
        term.revisionId,
        term.lockVersion,
        target,
      ),
    onSuccess: onChanged,
  });
  const reviewMutation = useMutation({
    mutationFn: ({
      capability,
      outcome,
      note,
    }: {
      capability: ApprovalCapability;
      outcome: "approved" | "rejected";
      note?: string;
    }) =>
      recordTaxonomyReviewDecision(term.termId, term.revisionId, {
        capability,
        outcome,
        ...(note ? { note } : {}),
      }),
    onSuccess: onChanged,
  });
  const approvedCapabilities = new Set(
    term.decisions
      .filter((decision) => decision.outcome === "approved")
      .map((decision) => decision.capability),
  );
  const approvalsComplete = TERM_APPROVAL_CAPABILITIES.every((capability) =>
    approvedCapabilities.has(capability),
  );
  const busy = transitionMutation.isPending || reviewMutation.isPending;
  const error = transitionMutation.isError
    ? transitionMutation.error instanceof TaxonomyApiError
      ? transitionMutation.error.message
      : "Promena statusa nije sačuvana. Pokušajte ponovo."
    : reviewMutation.isError
      ? reviewMutation.error instanceof TaxonomyApiError
        ? reviewMutation.error.message
        : "Odluka nije sačuvana. Pokušajte ponovo."
      : null;

  const transitionButton = (
    target: TaxonomyStatus,
    label: string,
    disabled = false,
  ) => (
    <button
      key={target}
      type="button"
      disabled={busy || disabled}
      onClick={() => transitionMutation.mutate(target)}
      className="border-line-strong text-ink-70 hover:border-coffee/40 disabled:text-ink-45 cursor-pointer rounded-full border bg-transparent px-3.5 py-2 text-[12px] font-semibold transition-colors disabled:cursor-not-allowed"
    >
      {busy ? "Čuvanje…" : label}
    </button>
  );

  return (
    <div className="border-line mt-4 border-t pt-3">
      <div className="text-ink-55 text-[12px] leading-[1.45]">
        {term.status === "draft"
          ? "Radna verzija je spremna za slanje na pregled."
          : term.status === "in_review"
            ? "Za odobrenje su potrebni stručno i poslovno odobrenje."
            : term.status === "approved"
              ? "Odobrena verzija može biti objavljena ili vraćena u novu radnu verziju."
              : term.status === "published"
                ? "Objavljena verzija ostaje u registru dok je ne arhivirate."
                : "Arhivirana verzija može otvoriti novu radnu verziju."}
      </div>
      {term.status === "in_review" ? (
        <ApprovalControls
          capabilities={TERM_APPROVAL_CAPABILITIES}
          decisions={term.decisions}
          disabled={busy}
          onDecision={(capability, outcome, note) =>
            reviewMutation.mutate({ capability, outcome, note })
          }
        />
      ) : null}
      <div className="mt-3 flex flex-wrap gap-2">
        {term.status === "draft"
          ? transitionButton("in_review", "Pošalji na pregled")
          : null}
        {term.status === "in_review"
          ? [
              transitionButton("draft", "Vrati u radnu verziju"),
              transitionButton(
                "approved",
                "Označi kao odobreno",
                !approvalsComplete,
              ),
            ]
          : null}
        {term.status === "approved"
          ? [
              transitionButton("draft", "Otvori novu radnu verziju"),
              transitionButton("published", "Objavi"),
            ]
          : null}
        {term.status === "published"
          ? transitionButton("archived", "Arhiviraj")
          : null}
        {term.status === "archived"
          ? transitionButton("draft", "Otvori novu radnu verziju")
          : null}
      </div>
      <GovernanceError error={error} />
    </div>
  );
}

function IntakeLinkGovernanceControls({
  link,
  onChanged,
}: {
  link: TaxonomyIntakeLink;
  onChanged: (link: TaxonomyIntakeLink) => void;
}) {
  const transitionMutation = useMutation({
    mutationFn: (target: TaxonomyStatus) =>
      transitionTaxonomyIntakeLink(link.linkId, link.lockVersion, target),
    onSuccess: onChanged,
  });
  const reviewMutation = useMutation({
    mutationFn: ({
      outcome,
      note,
    }: {
      outcome: "approved" | "rejected";
      note?: string;
    }) =>
      recordTaxonomyIntakeLinkReview(link.linkId, {
        capability: "clinical",
        outcome,
        ...(note ? { note } : {}),
      }),
    onSuccess: onChanged,
  });
  const approvalsComplete = link.decisions.some(
    (decision) =>
      decision.capability === "clinical" && decision.outcome === "approved",
  );
  const busy = transitionMutation.isPending || reviewMutation.isPending;
  const error = transitionMutation.isError
    ? transitionMutation.error instanceof TaxonomyApiError
      ? transitionMutation.error.message
      : "Promena statusa povezivanja nije sačuvana. Pokušajte ponovo."
    : reviewMutation.isError
      ? reviewMutation.error instanceof TaxonomyApiError
        ? reviewMutation.error.message
        : "Odluka nije sačuvana. Pokušajte ponovo."
      : null;

  const transitionButton = (
    target: TaxonomyStatus,
    label: string,
    disabled = false,
  ) => (
    <button
      key={target}
      type="button"
      disabled={busy || disabled}
      onClick={() => transitionMutation.mutate(target)}
      className="border-line-strong text-ink-70 hover:border-coffee/40 disabled:text-ink-45 cursor-pointer rounded-full border bg-transparent px-3.5 py-2 text-[12px] font-semibold transition-colors disabled:cursor-not-allowed"
    >
      {busy ? "Čuvanje…" : label}
    </button>
  );

  return (
    <div className="border-line mt-4 border-t pt-3">
      <div className="text-ink-55 text-[12px] leading-[1.45]">
        {link.status === "draft"
          ? "Povezivanje je radna verzija i čeka stručni pregled."
          : link.status === "in_review"
            ? "Za ovu vezu je potrebno stručno odobrenje."
            : link.status === "approved"
              ? "Odobrena veza može biti objavljena ili vraćena u novu radnu verziju."
              : link.status === "published"
                ? "Objavljena veza je aktivna u autorizovanom mostu ka Intake-u."
                : "Arhivirana veza može otvoriti novu radnu verziju."}
      </div>
      {link.status === "in_review" ? (
        <ApprovalControls
          capabilities={LINK_APPROVAL_CAPABILITIES}
          decisions={link.decisions}
          disabled={busy}
          onDecision={(_capability, outcome, note) =>
            reviewMutation.mutate({ outcome, note })
          }
        />
      ) : null}
      <div className="mt-3 flex flex-wrap gap-2">
        {link.status === "draft"
          ? transitionButton("in_review", "Pošalji na pregled")
          : null}
        {link.status === "in_review"
          ? [
              transitionButton("draft", "Vrati u radnu verziju"),
              transitionButton(
                "approved",
                "Označi kao odobreno",
                !approvalsComplete,
              ),
            ]
          : null}
        {link.status === "approved"
          ? [
              transitionButton("draft", "Otvori novu radnu verziju"),
              transitionButton("published", "Objavi"),
            ]
          : null}
        {link.status === "published"
          ? transitionButton("archived", "Arhiviraj")
          : null}
        {link.status === "archived"
          ? transitionButton("draft", "Otvori novu radnu verziju")
          : null}
      </div>
      <GovernanceError error={error} />
    </div>
  );
}

function TermCard({
  term,
  registryTerms,
  onEdit,
  onChanged,
}: {
  term: TaxonomyTerm;
  registryTerms: TaxonomyTerm[];
  onEdit?: () => void;
  onChanged?: (term: TaxonomyTerm) => void;
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

      <ApprovalEvidence decisions={term.decisions} />

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
          <ActivityActorBadges
            createdBy={term.createdBy}
            updatedBy={term.updatedBy}
            events={term.events}
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
      {!term.systemDefined && onChanged ? (
        <TermGovernanceControls term={term} onChanged={onChanged} />
      ) : null}
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
  onChanged,
}: {
  terms: TaxonomyTerm[];
  registryTerms: TaxonomyTerm[];
  tab: Exclude<KompasTab, "links" | "review">;
  axis: ManagedTaxonomyAxis;
  editor: ReactNode;
  onCreate: () => void;
  onEdit: (term: TaxonomyTerm) => void;
  onChanged: (term: TaxonomyTerm) => void;
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
              onChanged={onChanged}
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

function IntakeLinkCards({
  links,
  onChanged,
}: {
  links: TaxonomyIntakeLink[];
  onChanged?: (link: TaxonomyIntakeLink) => void;
}) {
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
                <ActivityActorBadges
                  createdBy={link.createdBy}
                  updatedBy={link.updatedBy}
                  events={link.events}
                />
                <span className="text-ink-45 text-[11.5px]">
                  {formatDate(link.updatedAt)}
                </span>
              </div>
              <ApprovalEvidence decisions={link.decisions} />
              {onChanged ? (
                <IntakeLinkGovernanceControls
                  link={link}
                  onChanged={onChanged}
                />
              ) : null}
            </article>
          );
        })}
    </div>
  );
}

function IntakeLinkCreator({
  terms,
  links,
  onCreated,
}: {
  terms: TaxonomyTerm[];
  links: TaxonomyIntakeLink[];
  onCreated: (link: TaxonomyIntakeLink) => void;
}) {
  const [topicTermId, setTopicTermId] = useState("");
  const [supportAreaTermId, setSupportAreaTermId] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const topics = sortTerms(
    terms.filter((term) => term.axis === "topic" && term.status !== "archived"),
  );
  const supportAreas = sortTerms(
    terms.filter(
      (term) =>
        term.axis === "support_area" &&
        term.systemDefined &&
        term.status !== "archived",
    ),
  );
  const createMutation = useMutation({
    mutationFn: () =>
      createTaxonomyIntakeLink({ topicTermId, supportAreaTermId }),
    onSuccess: (link) => {
      onCreated(link);
      setTopicTermId("");
      setSupportAreaTermId("");
    },
    onError: (error) => {
      const apiFieldErrors = taxonomyFieldErrors(error);
      if (Object.keys(apiFieldErrors).length > 0) {
        setFieldErrors(apiFieldErrors);
        const field = Object.keys(apiFieldErrors)[0];
        const elementId =
          field === "topicTermId"
            ? "kompas-intake-topic"
            : field === "supportAreaTermId"
              ? "kompas-intake-support-area"
              : null;
        if (elementId) {
          requestAnimationFrame(() =>
            document.getElementById(elementId)?.focus({ preventScroll: true }),
          );
        }
        return;
      }
      setServerError(
        error instanceof TaxonomyApiError || error instanceof Error
          ? error.message
          : "Povezivanje nije sačuvano. Pokušajte ponovo.",
      );
    },
  });

  const clearFieldError = (field: string) => {
    setServerError(null);
    setFieldErrors((current) => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
  };
  const focusLinkField = (id: string) =>
    requestAnimationFrame(() =>
      document.getElementById(id)?.focus({ preventScroll: true }),
    );

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFieldErrors({});
    setServerError(null);
    if (!topicTermId) {
      setFieldErrors({ topicTermId: "Izaberite konkretnu Kompas temu." });
      focusLinkField("kompas-intake-topic");
      return;
    }
    if (!supportAreaTermId) {
      setFieldErrors({ supportAreaTermId: "Izaberite Intake oblast podrške." });
      focusLinkField("kompas-intake-support-area");
      return;
    }
    if (
      links.some(
        (link) =>
          link.topicTermId === topicTermId &&
          link.supportAreaTermId === supportAreaTermId,
      )
    ) {
      setServerError("Ovo povezivanje već postoji u registru.");
      return;
    }
    createMutation.mutate();
  };

  return (
    <form
      onSubmit={submit}
      className="rounded-panel border-line bg-surface mb-5 border px-5 py-5"
    >
      <h3 className="text-forest font-serif text-[19px]">
        Novo povezivanje ka Intake-u
      </h3>
      <p className="text-ink-55 mt-1 max-w-[760px] text-[12.5px] leading-[1.5]">
        Povezujete konkretnu Kompas temu sa postojećom Intake oblasti podrške.
        Intake oblasti su sistemske i ovde se samo biraju; ne menjaju se niti
        stvaraju kroz Kompas.
      </p>

      {serverError ? (
        <div
          role="alert"
          className="border-danger/45 bg-danger/8 text-ink-70 rounded-tile mt-4 border px-4 py-3 text-[13px] leading-[1.5]"
        >
          {serverError}
        </div>
      ) : null}

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div>
          <label
            htmlFor="kompas-intake-topic"
            className="text-ink-70 mb-1.5 block text-[13px] font-semibold"
          >
            Koju Kompas temu povezujete?
          </label>
          <select
            id="kompas-intake-topic"
            value={topicTermId}
            disabled={createMutation.isPending || topics.length === 0}
            onChange={(event) => {
              setTopicTermId(event.target.value);
              clearFieldError("topicTermId");
            }}
            aria-invalid={Boolean(fieldErrors.topicTermId)}
            aria-describedby={fieldErrors.topicTermId ? "kompas-intake-topic-error" : undefined}
            className={cn(
              "border-line-strong rounded-tile bg-panel-canvas text-coffee focus:border-sage w-full border px-3.5 py-2.5 text-sm outline-none disabled:opacity-60",
              fieldErrors.topicTermId ? "border-danger focus:border-danger" : "",
            )}
          >
            <option value="">Izaberite temu</option>
            {topics.map((topic) => (
              <option key={topic.termId} value={topic.termId}>
                {topic.publicLabel}
              </option>
            ))}
          </select>
          <FieldError id="kompas-intake-topic-error" message={fieldErrors.topicTermId} />
        </div>

        <div>
          <label
            htmlFor="kompas-intake-support-area"
            className="text-ink-70 mb-1.5 block text-[13px] font-semibold"
          >
            Kojoj Intake oblasti podrške odgovara?
          </label>
          <select
            id="kompas-intake-support-area"
            value={supportAreaTermId}
            disabled={createMutation.isPending || supportAreas.length === 0}
            onChange={(event) => {
              setSupportAreaTermId(event.target.value);
              clearFieldError("supportAreaTermId");
            }}
            aria-invalid={Boolean(fieldErrors.supportAreaTermId)}
            aria-describedby={fieldErrors.supportAreaTermId ? "kompas-intake-support-area-error" : undefined}
            className={cn(
              "border-line-strong rounded-tile bg-panel-canvas text-coffee focus:border-sage w-full border px-3.5 py-2.5 text-sm outline-none disabled:opacity-60",
              fieldErrors.supportAreaTermId ? "border-danger focus:border-danger" : "",
            )}
          >
            <option value="">Izaberite Intake oblast podrške</option>
            {supportAreas.map((supportArea) => (
              <option key={supportArea.termId} value={supportArea.termId}>
                {supportArea.publicLabel}
              </option>
            ))}
          </select>
          <FieldError id="kompas-intake-support-area-error" message={fieldErrors.supportAreaTermId} />
          <p className="text-ink-55 mt-1.5 text-[12px] leading-[1.45]">
            Zaključana sistemska vrednost iz D-052; izbor ne rangira terapeute.
          </p>
        </div>
      </div>

      <div className="border-line mt-5 flex flex-wrap gap-2.5 border-t pt-4">
        <button
          type="submit"
          disabled={
            createMutation.isPending ||
            topics.length === 0 ||
            supportAreas.length === 0
          }
          className="bg-forest text-panel-canvas hover:bg-forest-hover disabled:bg-ink-45 cursor-pointer rounded-full border-0 px-4 py-2.5 text-[13px] font-semibold transition-colors disabled:cursor-not-allowed"
        >
          {createMutation.isPending ? "Čuvanje…" : "Sačuvaj radnu verziju veze"}
        </button>
      </div>
    </form>
  );
}

function IntakeLinks({
  links,
  terms,
  onCreated,
  onChanged,
}: {
  links: TaxonomyIntakeLink[];
  terms: TaxonomyTerm[];
  onCreated: (link: TaxonomyIntakeLink) => void;
  onChanged: (link: TaxonomyIntakeLink) => void;
}) {
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
      <IntakeLinkCreator terms={terms} links={links} onCreated={onCreated} />
      {links.length === 0 ? (
        <EmptyDashedCard title="Još nema povezivanja">
          Kompas teme i Intake oblasti podrške ostaju odvojene dok stručni tim
          ne potvrdi njihovu vezu.
        </EmptyDashedCard>
      ) : (
        <IntakeLinkCards links={links} onChanged={onChanged} />
      )}
    </div>
  );
}

function ReviewQueue({
  terms,
  links,
  onTermChanged,
  onLinkChanged,
}: {
  terms: TaxonomyTerm[];
  links: TaxonomyIntakeLink[];
  onTermChanged: (term: TaxonomyTerm) => void;
  onLinkChanged: (link: TaxonomyIntakeLink) => void;
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
                    onChanged={onTermChanged}
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
              <IntakeLinkCards links={reviewLinks} onChanged={onLinkChanged} />
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

  const handleIntakeLinkCreated = (saved: TaxonomyIntakeLink) => {
    queryClient.setQueryData<TaxonomyRegistrySnapshot>(
      TAXONOMY_REGISTRY_QUERY_KEY,
      (current) => ({
        terms: current?.terms ?? [],
        intakeLinks: [
          ...(current?.intakeLinks ?? []).filter(
            (link) => link.linkId !== saved.linkId,
          ),
          saved,
        ],
      }),
    );
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
              />
            ) : null}
            {activeTab === "links" ? (
              <IntakeLinks
                links={intakeLinks}
                terms={terms}
                onCreated={handleIntakeLinkCreated}
                onChanged={handleIntakeLinkCreated}
              />
            ) : null}
            {activeTab === "review" ? (
              <ReviewQueue
                terms={terms}
                links={intakeLinks}
                onTermChanged={handleSaved}
                onLinkChanged={handleIntakeLinkCreated}
              />
            ) : null}
          </div>
        </>
      )}
    </section>
  );
}
