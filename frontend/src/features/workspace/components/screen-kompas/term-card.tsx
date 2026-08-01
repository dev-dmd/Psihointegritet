"use client";

import { useState } from "react";

import { ConfirmModal } from "@/components/panel/confirm-modal";
import { StatusBadge } from "@/components/panel/status-badge";

import {
  taxonomyErrorMessage,
  useDeleteTaxonomyRevisionMutation,
} from "../../hooks/use-taxonomy-registry";
import type { TaxonomyTerm } from "../../taxonomy-api";
import { LockIcon } from "../icons";
import { ActivityActorBadges, ApprovalEvidence } from "./activity-evidence";
import { STATUS_META } from "./constants";
import { formatDate, publicLabelFor } from "./helpers";
import { RegistryFlag } from "./registry-flag";
import { RouteGovernanceControls } from "./route-governance-controls";
import { TermGovernanceControls } from "./term-governance-controls";

export function TermCard({
  term,
  registryTerms,
  onEdit,
  onChanged,
  onDeleted,
}: {
  term: TaxonomyTerm;
  registryTerms: TaxonomyTerm[];
  onEdit?: () => void;
  onChanged?: (term: TaxonomyTerm) => void;
  onDeleted?: () => void;
}) {
  const [deleteOpen, setDeleteOpen] = useState(false);
  const deleteMutation = useDeleteTaxonomyRevisionMutation(term, () => {
    setDeleteOpen(false);
    onDeleted?.();
  });
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

      {isRouteTerm && !term.systemDefined && onChanged ? (
        <RouteGovernanceControls
          term={term}
          onConfirmed={(route) =>
            onChanged({ ...term, canonicalPath: route.canonicalPath })
          }
        />
      ) : null}

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
        <div className="flex flex-wrap gap-2">
          {onEdit ? (
            <button
              type="button"
              onClick={onEdit}
              className="border-line-strong text-ink-70 hover:border-coffee/40 cursor-pointer rounded-full border bg-transparent px-3.5 py-2 text-[12.5px] font-semibold transition-colors"
            >
              Uredi
            </button>
          ) : null}
          {!term.systemDefined && onDeleted ? (
            <button
              type="button"
              disabled={deleteMutation.isPending}
              onClick={() => setDeleteOpen(true)}
              className="border-danger/40 text-danger hover:bg-danger/8 cursor-pointer rounded-full border bg-transparent px-3.5 py-2 text-[12.5px] font-semibold disabled:cursor-not-allowed disabled:opacity-60"
            >
              {deleteMutation.isPending ? "Brisanje…" : "Obriši verziju"}
            </button>
          ) : null}
        </div>
      </div>
      {deleteMutation.isError ? (
        <p className="text-danger mt-2 text-right text-[12px]">
          {taxonomyErrorMessage(
            deleteMutation.error,
            "Radna verzija nije obrisana. Pokušajte ponovo.",
          )}
        </p>
      ) : null}
      <ConfirmModal
        open={deleteOpen}
        eyebrow="Brisanje verzije registra"
        title="Obrisati sačuvanu verziju?"
        description={`Brišete „${term.publicLabel}“, ${term.versionLabel} u statusu „${STATUS_META[term.status].label}“. Ova radnja se ne može poništiti.`}
        reasonLabel="Razlog brisanja"
        reasonPlaceholder="Npr. duplikat ili pogrešan unos"
        note="Brisanje objavljene verzije uklanja je iz aktivnog registra. Prethodna verzija, ako postoji, ostaje zasebna istorijska verzija."
        confirmLabel={deleteMutation.isPending ? "Brisanje…" : "Obriši verziju"}
        onConfirm={() => {
          setDeleteOpen(false);
          deleteMutation.mutate();
        }}
        onClose={() => setDeleteOpen(false)}
      />
      {!term.systemDefined && onChanged ? (
        <TermGovernanceControls term={term} onChanged={onChanged} />
      ) : null}
    </article>
  );
}
