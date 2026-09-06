"use client";

import Link from "next/link";

import type { TaxonomyTerm } from "../../taxonomy-api";
import { TermGovernanceControls } from "../screen-kompas/term-governance-controls";
import { localizedPath } from "@/lib/routes/localized-path";
import { useUiLocale } from "@/i18n/use-ui-locale";

import {
  AXIS_EDITOR_CONFIG,
  taxonomySeoWarnings,
  type ManagedTaxonomyAxis,
} from "./model";

export function QuickEntryReview({
  axis,
  term,
  registryTerms,
  busy,
  onChanged,
  onSaveDraft,
  onBack,
  onExit,
}: {
  axis: ManagedTaxonomyAxis;
  term: TaxonomyTerm;
  registryTerms: TaxonomyTerm[];
  busy: boolean;
  onChanged: (term: TaxonomyTerm) => void;
  onSaveDraft: () => void;
  onBack: () => void;
  onExit: () => void;
}) {
  const locale = useUiLocale();
  const parent = registryTerms.find(
    (candidate) => candidate.termId === term.primaryParentTermId,
  );
  const journey = registryTerms.find(
    (candidate) => candidate.termId === term.journeyIntentTermId,
  );
  const seoWarnings = taxonomySeoWarnings(term);

  return (
    <div className="mt-5">
      <dl className="border-line rounded-tile grid gap-4 border px-4 py-4 sm:grid-cols-2">
        <div>
          <dt className="text-ink-45 text-[11px] font-semibold uppercase">
            Registar
          </dt>
          <dd className="text-coffee mt-1 text-[13px] font-semibold">
            {AXIS_EDITOR_CONFIG[axis].newLabel.replace(/^Nov[ai]? /, "")}
          </dd>
        </div>
        <div>
          <dt className="text-ink-45 text-[11px] font-semibold uppercase">
            Status
          </dt>
          <dd className="text-coffee mt-1 text-[13px] font-semibold">
            {term.status} · {term.versionLabel}
          </dd>
        </div>
        <div>
          <dt className="text-ink-45 text-[11px] font-semibold uppercase">
            Naziv i stabilni ID
          </dt>
          <dd className="text-coffee mt-1 text-[13px]">
            {term.publicLabel} ·{" "}
            <span className="font-mono">{term.stableId}</span>
          </dd>
          {seoWarnings.publicLabel ? (
            <dd className="text-badge-amber mt-1 text-[11.5px]">
              {seoWarnings.publicLabel}
            </dd>
          ) : null}
        </div>
        <div>
          <dt className="text-ink-45 text-[11px] font-semibold uppercase">
            Javna putanja
          </dt>
          <dd className="text-coffee mt-1 font-mono text-[12px]">
            {term.canonicalPath ?? "Nije primenljiva ili još nije potvrđena"}
          </dd>
        </div>
        {axis === "topic" ? (
          <div className="sm:col-span-2">
            <dt className="text-ink-45 text-[11px] font-semibold uppercase">
              Organizacija teme
            </dt>
            <dd className="text-coffee mt-1 text-[13px]">
              {parent?.publicLabel ?? "Oblast nije izabrana"} ·{" "}
              {journey?.publicLabel ?? "Put nije izabran"}
            </dd>
          </div>
        ) : null}
        <div className="sm:col-span-2">
          <dt className="text-ink-45 text-[11px] font-semibold uppercase">
            Kratak javni opis
          </dt>
          <dd className="text-ink-70 mt-1 text-[13px] leading-[1.5]">
            {term.shortDescription || "Opis nije unet"}
          </dd>
          {seoWarnings.shortDescription ? (
            <dd className="text-badge-amber mt-1 text-[11.5px]">
              {seoWarnings.shortDescription}
            </dd>
          ) : null}
        </div>
      </dl>

      {term.status === "draft" ? (
        <button
          type="button"
          disabled={busy}
          onClick={onSaveDraft}
          className="border-line-strong text-ink-70 hover:border-coffee/40 mt-4 cursor-pointer rounded-full border bg-transparent px-4 py-2 text-[12.5px] font-semibold disabled:opacity-50"
        >
          {busy ? "Čuvanje…" : "Sačuvaj radnu verziju"}
        </button>
      ) : null}

      <TermGovernanceControls term={term} onChanged={onChanged} />

      <aside className="border-line bg-panel-canvas rounded-tile mt-5 border px-4 py-4">
        <h3 className="text-forest text-[14px] font-semibold">Nastavi u CMS</h3>
        <p className="text-ink-55 mt-1 text-[12.5px] leading-[1.5]">
          Postojeći sadržaj povezuje se kroz K3 discovery metadata. Kreiranje
          proizvoljnog punog edukativnog članka ostaje K3A/ADR-019 preduslov;
          ovaj tok ne zloupotrebljava static page, program ili service tip.
        </p>
        <Link
          href={localizedPath("workspace.content.list", { locale })}
          className="text-forest mt-3 inline-flex text-[12.5px] font-semibold underline underline-offset-4"
        >
          Otvori postojeći CMS tok
        </Link>
      </aside>

      <div className="border-line mt-5 flex flex-wrap gap-2.5 border-t pt-4">
        <button
          type="button"
          onClick={onExit}
          className="bg-forest text-panel-canvas hover:bg-forest-hover cursor-pointer rounded-full border-0 px-5 py-2.5 text-[13px] font-semibold"
        >
          Završi i izađi
        </button>
        <button
          type="button"
          onClick={onBack}
          className="text-ink-55 hover:text-coffee cursor-pointer border-0 bg-transparent px-3 py-2.5 text-[12.5px] font-semibold"
        >
          Nazad
        </button>
      </div>
    </div>
  );
}
