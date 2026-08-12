/**
 * "Does something like this already exist?" — answered while the user types.
 *
 * Pure, synchronous, and computed over the registry snapshot the panel has
 * already loaded, so it costs no request. The server's unique constraint
 * `(organization_id, axis, stable_id)` stays the only authority; this exists
 * because that authority answers *after* the save, with a code, about a field
 * (`stableId`) the therapist no longer sees. A near-duplicate area is not even
 * a constraint violation — it is simply a mess someone has to clean up later.
 *
 * Archived and draft rows are included on purpose: "it already exists but is
 * archived" is exactly the case where a second one gets created by accident.
 */

import type { TaxonomyTerm } from "../../taxonomy-api";
import { type ManagedTaxonomyAxis, suggestTaxonomyStableId } from "./model";

export type TaxonomyDuplicateReason =
  "same-id" | "same-name" | "similar-name" | "search-term";

export interface TaxonomyDuplicateMatch {
  termId: string;
  publicLabel: string;
  axis: TaxonomyTerm["axis"];
  status: TaxonomyTerm["status"];
  parentStableId: string | null;
  reason: TaxonomyDuplicateReason;
}

/**
 * One folding for comparison, borrowed from the slug suggester so a label and
 * an existing `stableId` are compared in the same alphabet (`đ→dj`, diacritics
 * stripped, everything else collapsed to hyphens).
 */
export function normalizeTaxonomyLabel(value: string): string {
  return suggestTaxonomyStableId(value);
}

const REASON_RANK: Record<TaxonomyDuplicateReason, number> = {
  "same-id": 0,
  "same-name": 1,
  "search-term": 2,
  "similar-name": 3,
};

/** Below this, "contains" is noise: "san" appears inside "sanjarenje". */
const MIN_SIMILARITY_LENGTH = 5;

function similarity(
  candidate: string,
  existing: string,
): TaxonomyDuplicateReason | null {
  if (!candidate || !existing) return null;
  if (candidate === existing) return "same-name";
  if (candidate.length < MIN_SIMILARITY_LENGTH) return null;
  if (existing.includes(candidate) || candidate.includes(existing)) {
    return "similar-name";
  }
  return null;
}

export function findTaxonomyDuplicates({
  candidateLabel,
  axis,
  terms,
  limit = 4,
}: {
  candidateLabel: string;
  axis: ManagedTaxonomyAxis;
  terms: readonly TaxonomyTerm[];
  limit?: number;
}): TaxonomyDuplicateMatch[] {
  const candidate = normalizeTaxonomyLabel(candidateLabel);
  if (candidate.length < 3) return [];

  const matches: TaxonomyDuplicateMatch[] = [];
  for (const term of terms) {
    // A term on another axis is not a duplicate of this one, but an area and a
    // topic with the same name still collide in the visitor's head, so both
    // registries are searched and the result says which one it found.
    const reason: TaxonomyDuplicateReason | null =
      term.axis === axis && term.stableId === candidate
        ? "same-id"
        : (similarity(candidate, normalizeTaxonomyLabel(term.publicLabel)) ??
          (term.searchTerms.some(
            (entry) => normalizeTaxonomyLabel(entry) === candidate,
          )
            ? "search-term"
            : null));
    if (!reason) continue;
    matches.push({
      termId: term.termId,
      publicLabel: term.publicLabel,
      axis: term.axis,
      status: term.status,
      parentStableId: term.primaryParentStableId ?? null,
      reason,
    });
  }

  return matches
    .sort((left, right) => REASON_RANK[left.reason] - REASON_RANK[right.reason])
    .slice(0, limit);
}

/**
 * A registry name is a thing ("Anksioznost"); an article name is a sentence
 * about it ("Anksioznost nije vaš neprijatelj"). Advisory only — a legitimate
 * area may well be several words.
 */
const SENTENCE_MARKERS = [
  "nije",
  "jeste",
  "kako",
  "zasto",
  "kada",
  "sta",
  "vas",
  "vasa",
  "vase",
  "moj",
  "moja",
];

export function looksLikeContentTitle(label: string): boolean {
  const words = normalizeTaxonomyLabel(label).split("-").filter(Boolean);
  if (words.length < 4) return false;
  return words.some((word) => SENTENCE_MARKERS.includes(word));
}

/**
 * Search terms this broad match nearly everything, so they bury the results
 * they were meant to surface. Not blocked — a team may have a reason.
 */
const BROAD_SEARCH_TERMS = new Set([
  "emocije",
  "emocija",
  "potrebe",
  "potreba",
  "problem",
  "problemi",
  "pomoc",
  "podrska",
  "zdravlje",
  "terapija",
  "psihoterapija",
  "osecanja",
]);

export function broadSearchTerms(entries: readonly string[]): string[] {
  return entries.filter((entry) =>
    BROAD_SEARCH_TERMS.has(normalizeTaxonomyLabel(entry)),
  );
}
