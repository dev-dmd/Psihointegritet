import type { CreateTaxonomyTermInput, TaxonomyTerm } from "../../taxonomy-api";

export const AXIS_GROUP = "topic_group";
export const AXIS_TOPIC = "topic";

export function filterGroupTerms(
  terms: readonly TaxonomyTerm[],
): TaxonomyTerm[] {
  return terms.filter(
    (term) => term.axis === AXIS_GROUP && term.status !== "archived",
  );
}

export function filterTopicTerms(
  terms: readonly TaxonomyTerm[],
  parentTermId: string | null,
): TaxonomyTerm[] {
  return terms.filter(
    (term) =>
      term.axis === AXIS_TOPIC &&
      term.status !== "archived" &&
      term.primaryParentTermId === parentTermId,
  );
}

/** Strips diacritics and produces a lowercase kebab-case slug. */
export function slugFromLabel(label: string): string {
  return label
    .toLowerCase()
    .replace(/[đ]/g, "dj")
    .replace(/[ć]/g, "c")
    .replace(/[čš]/g, (ch) => (ch === "č" ? "c" : "s"))
    .replace(/[ž]/g, "z")
    .replace(/ /g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * Builds a minimal CreateTaxonomyTermInput for a new area.
 */
export function createAreaInput(
  label: string,
  description: string,
  searchTerms: string[],
): CreateTaxonomyTermInput {
  return {
    stableId: slugFromLabel(label),
    publicLabel: label,
    shortDescription: description,
    axis: AXIS_GROUP,
    locale: "sr-Latn",
    searchTerms,
    compassEnabled: true,
    publicVisible: true,
    sortOrder: 0,
  };
}

/**
 * Builds a minimal CreateTaxonomyTermInput for a new topic.
 */
export function createTopicInput(
  label: string,
  description: string,
  parentTermId: string,
  searchTerms: string[],
): CreateTaxonomyTermInput {
  return {
    stableId: slugFromLabel(label),
    publicLabel: label,
    shortDescription: description,
    axis: AXIS_TOPIC,
    locale: "sr-Latn",
    primaryParentTermId: parentTermId,
    searchTerms,
    compassEnabled: true,
    publicVisible: true,
    sortOrder: 0,
  };
}
