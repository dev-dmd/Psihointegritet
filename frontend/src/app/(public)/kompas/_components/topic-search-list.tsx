"use client";

import { useDeferredValue, useId, useState } from "react";

import type { RoutablePublicTaxonomyTerm } from "@/lib/compass/types";

import { TaxonomyLinkCard } from "./taxonomy-link-card";

export interface TopicSearchItem {
  term: RoutablePublicTaxonomyTerm;
  parentLabel?: string;
}

interface TopicSearchListProps {
  items: readonly TopicSearchItem[];
}

function normalized(value: string): string {
  return value.trim().toLocaleLowerCase("sr-Latn");
}

export function TopicSearchList({ items }: TopicSearchListProps) {
  const inputId = useId();
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const needle = normalized(deferredQuery);
  const filtered = needle
    ? items.filter(({ term, parentLabel }) =>
        [
          term.publicLabel,
          term.shortDescription,
          parentLabel ?? "",
          ...term.searchTerms,
        ].some((value) => normalized(value).includes(needle)),
      )
    : items;

  return (
    <div>
      <div className="max-w-[620px]">
        <label
          htmlFor={inputId}
          className="text-forest mb-2 block text-[14px] font-semibold"
        >
          Pretražite teme
        </label>
        <input
          id={inputId}
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Naziv teme ili pojam"
          className="border-coffee/18 bg-surface text-coffee placeholder:text-coffee/45 focus:border-sage focus:ring-sage/25 min-h-12 w-full rounded-2xl border px-4 outline-none focus:ring-4"
        />
      </div>

      <p aria-live="polite" className="text-coffee/60 mt-4 text-sm">
        {filtered.length === 1
          ? "Pronađena je 1 tema."
          : `Pronađeno je ${filtered.length} tema.`}
      </p>

      {filtered.length ? (
        <div className="mt-7 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map(({ term, parentLabel }) => (
            <TaxonomyLinkCard
              key={term.stableId}
              term={term}
              {...(parentLabel ? { parentLabel } : {})}
            />
          ))}
        </div>
      ) : (
        <p className="bg-meadow/20 text-coffee/72 mt-7 rounded-[20px] px-5 py-6 text-[15px]">
          Nema objavljene teme koja odgovara toj pretrazi.
        </p>
      )}
    </div>
  );
}
