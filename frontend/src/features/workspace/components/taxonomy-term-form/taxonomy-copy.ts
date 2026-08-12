/**
 * Human wording for values the registry stores as numbers or codes.
 *
 * Deliberately small: labels that are *authored data* (journey intent, area
 * names) are read from the registry, never re-spelled here — two sources of
 * truth for the same sentence is how a panel and a public page start
 * disagreeing. Only values with no editorial home live in this file.
 */

import type { TaxonomyDuplicateReason } from "./taxonomy-duplicate-match";

/**
 * "Redosled prikaza" was a raw 0–100000 integer. Nobody outside the team can
 * say what 37 means, and the field only ever needs three answers. The numbers
 * stay spaced so a later manual override still fits between them.
 */
export const DISPLAY_ORDER_PRESETS = [
  { id: "early", label: "Prikaži ranije", value: 10 },
  { id: "normal", label: "Uobičajeni redosled", value: 50 },
  { id: "late", label: "Prikaži kasnije", value: 90 },
] as const;

export type DisplayOrderPresetId = (typeof DISPLAY_ORDER_PRESETS)[number]["id"];

/** Classifies a stored number back into the closest preset for display. */
export function displayOrderPreset(value: number): DisplayOrderPresetId {
  if (value < 30) return "early";
  if (value > 70) return "late";
  return "normal";
}

export const DUPLICATE_REASON_COPY: Record<TaxonomyDuplicateReason, string> = {
  "same-id": "Ista interna oznaka",
  "same-name": "Isti naziv",
  "similar-name": "Sličan naziv",
  "search-term": "Već postoji kao izraz za pretragu",
};

/** What each registry is, said once, for the launcher cards. */
export const TAXONOMY_KIND_COPY = {
  topic_group: {
    title: "Oblast",
    description: "Šira grupa kroz koju posetioci istražuju sadržaj.",
    example: "Strah, brige i napetost",
  },
  topic: {
    title: "Tema",
    description: "Konkretnije iskustvo unutar jedne oblasti.",
    example: "Anksioznost",
  },
  content: {
    title: "Sadržaj",
    description: "Članak ili drugi materijal koji Kompas može da preporuči.",
    example: "Anksioznost nije vaš neprijatelj",
  },
} as const;
