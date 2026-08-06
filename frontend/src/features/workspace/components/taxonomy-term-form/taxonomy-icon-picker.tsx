"use client";

import { useState } from "react";

import { cn } from "@/helpers/cn";

import { FieldError } from "../screen-kompas/governance-error";

import {
  findTaxonomyIcon,
  searchTaxonomyIcons,
} from "./taxonomy-icon-registry";

/**
 * Pick a mark by looking at it.
 *
 * The field this replaces was a free-text "Ključ ikone" over a value nothing
 * renders — an author could only ever guess, and a typo produced no icon and
 * no complaint. The catalogue is curated, so whatever is chosen here is known
 * to exist, and the stored value is still the same `iconKey` string.
 */
export function TaxonomyIconPicker({
  value,
  onChange,
  disabled,
  editorId,
  error,
  errorId,
}: {
  value: string;
  onChange: (iconKey: string) => void;
  disabled: boolean;
  editorId: string;
  error?: string;
  errorId: string;
}) {
  const [query, setQuery] = useState("");
  const results = searchTaxonomyIcons(query);
  const selected = findTaxonomyIcon(value);

  return (
    <div className="mt-3">
      <label
        htmlFor={`${editorId}-icon-key`}
        className="text-ink-70 mb-1.5 block text-[12.5px] font-semibold"
      >
        Oznaka
      </label>
      <input
        id={`${editorId}-icon-key`}
        value={query}
        disabled={disabled}
        placeholder="Pretražite: razgovor, san, granice…"
        onChange={(event) => setQuery(event.target.value)}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : undefined}
        className="border-line-strong rounded-tile bg-panel-canvas text-coffee focus:border-sage w-full max-w-[460px] border px-3.5 py-2.5 text-sm outline-none disabled:opacity-60"
      />

      <div
        role="radiogroup"
        aria-label="Vizuelna oznaka"
        className="mt-3 flex flex-wrap gap-2"
      >
        {results.map((entry) => {
          const Icon = entry.icon;
          const isSelected = entry.key === value;
          return (
            <button
              key={entry.key}
              type="button"
              role="radio"
              aria-checked={isSelected}
              aria-label={entry.label}
              title={entry.label}
              disabled={disabled}
              onClick={() => onChange(entry.key)}
              className={cn(
                "rounded-tile flex w-[84px] cursor-pointer flex-col items-center gap-1.5 border px-2 py-2.5 transition-colors disabled:cursor-not-allowed disabled:opacity-50",
                isSelected
                  ? "border-sage bg-sage/10 text-coffee"
                  : "border-line-strong text-ink-70 hover:border-coffee/35 bg-transparent",
              )}
            >
              <Icon size={20} aria-hidden />
              <span className="text-[11.5px] leading-tight">{entry.label}</span>
            </button>
          );
        })}
      </div>

      {results.length === 0 ? (
        <p className="text-ink-55 mt-2 text-[12px]">
          Nema oznake za taj pojam. Pokušajte drugu reč ili ostavite stavku bez
          oznake.
        </p>
      ) : null}

      <FieldError id={errorId} message={error} />

      <p className="text-ink-55 mt-2 text-[12px]">
        {selected
          ? `Izabrano: ${selected.label}. Oznaka se prikazuje uz naziv na javnoj kartici.`
          : "Oznaka je opciona i prikazuje se uz naziv na javnoj kartici."}
      </p>
    </div>
  );
}
