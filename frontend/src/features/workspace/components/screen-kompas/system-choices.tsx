"use client";

import type { ReactNode } from "react";

import { approvalCapabilities } from "@/lib/content-governance/types";

import type {
  TaxonomyAxis,
  TaxonomyStatus,
  TaxonomyTerm,
} from "../../taxonomy-api";
import { LockIcon } from "../icons";
import {
  APPROVAL_LABELS,
  PLANNED_ACCESS_OPTIONS,
  STATUS_META,
} from "./constants";
import { sortTerms } from "./helpers";

export function SystemChoiceGroup({
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

export function SystemChoices({ terms }: { terms: TaxonomyTerm[] }) {
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
