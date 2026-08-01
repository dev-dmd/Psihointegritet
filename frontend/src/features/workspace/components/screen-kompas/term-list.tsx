"use client";

import type { ReactNode } from "react";

import { EmptyDashedCard } from "@/components/panel/empty-dashed-card";

import type { TaxonomyTerm } from "../../taxonomy-api";
import {
  AXIS_EDITOR_CONFIG,
  type ManagedTaxonomyAxis,
} from "../taxonomy-term-editor";
import { TAB_COPY } from "./constants";
import { isEditableManagedTerm, sortTerms } from "./helpers";
import { TermCard } from "./term-card";
import type { KompasTab } from "./types";

export function TermList({
  terms,
  registryTerms,
  tab,
  axis,
  editor,
  onCreate,
  onEdit,
  onChanged,
  onDeleted,
}: {
  terms: TaxonomyTerm[];
  registryTerms: TaxonomyTerm[];
  tab: Exclude<KompasTab, "links" | "review">;
  axis: ManagedTaxonomyAxis;
  editor: ReactNode;
  onCreate: () => void;
  onEdit: (term: TaxonomyTerm) => void;
  onChanged: (term: TaxonomyTerm) => void;
  onDeleted: () => void;
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
              onDeleted={onDeleted}
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
