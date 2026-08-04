"use client";

import type { TaxonomyTerm } from "../../taxonomy-api";
import { STATUS_META } from "../screen-kompas/constants";

import { AXIS_EDITOR_CONFIG, type ManagedTaxonomyAxis } from "./model";
import { DUPLICATE_REASON_COPY } from "./taxonomy-copy";
import {
  findTaxonomyDuplicates,
  looksLikeContentTitle,
} from "./taxonomy-duplicate-match";

/**
 * "Proveravamo da li slična oblast ili tema već postoji."
 *
 * Runs over the registry snapshot the panel already holds, so it answers while
 * the user is still typing. Nothing here blocks a save: the server's unique
 * constraint remains the authority, and a near-duplicate is a judgement call
 * that belongs to the person, not to a validator.
 */
export function TaxonomyDuplicateHint({
  candidateLabel,
  axis,
  terms,
  onOpenExisting,
}: {
  candidateLabel: string;
  axis: ManagedTaxonomyAxis;
  terms: TaxonomyTerm[];
  onOpenExisting?: (term: TaxonomyTerm) => void;
}) {
  const matches = findTaxonomyDuplicates({ candidateLabel, axis, terms });
  const titleWarning = looksLikeContentTitle(candidateLabel);
  if (matches.length === 0 && !titleWarning) return null;

  return (
    <div className="mt-3 space-y-2" aria-live="polite">
      {titleWarning ? (
        <p className="border-badge-amber/40 bg-badge-amber-bg text-badge-amber rounded-tile border px-3.5 py-2.5 text-[12.5px] leading-[1.5]">
          „{candidateLabel.trim()}” više liči na naslov članka ili videa nego na
          naziv {AXIS_EDITOR_CONFIG[axis].publicLabel.toLocaleLowerCase("sr")}.
          Da li želite da kreirate sadržaj umesto nove stavke registra?
        </p>
      ) : null}

      {matches.length > 0 ? (
        <div className="border-line rounded-tile bg-panel-canvas/50 border px-3.5 py-3">
          <p className="text-ink-70 text-[12.5px] font-semibold">
            Slične stavke već postoje
          </p>
          <ul className="mt-2 space-y-1.5">
            {matches.map((match) => {
              const existing = terms.find(
                (item) => item.termId === match.termId,
              );
              return (
                <li
                  key={match.termId}
                  className="flex flex-wrap items-center gap-2 text-[12.5px]"
                >
                  <span className="text-coffee font-semibold">
                    {match.publicLabel}
                  </span>
                  <span className="text-ink-55">
                    {match.axis === "topic_group" ? "oblast" : "tema"}
                    {match.parentStableId
                      ? ` · u oblasti ${match.parentStableId}`
                      : ""}
                    {" · "}
                    {STATUS_META[match.status].label}
                    {" · "}
                    {DUPLICATE_REASON_COPY[match.reason]}
                  </span>
                  {existing && onOpenExisting ? (
                    <button
                      type="button"
                      onClick={() => onOpenExisting(existing)}
                      className="text-forest min-h-11 cursor-pointer border-0 bg-transparent p-0 font-semibold underline"
                    >
                      Otvori postojeću stavku
                    </button>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
