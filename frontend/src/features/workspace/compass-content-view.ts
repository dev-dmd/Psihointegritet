import { findSystemContentDefinition } from "@/lib/content-governance/system-content-catalog";
import type {
  ContentType,
  PublicationStatus,
} from "@/lib/content-governance/types";

import {
  compassContentLink,
  type CompassContentLink,
} from "./compass-content-linking";
import type { ApiContentRevision } from "./content-api";
import type { TaxonomyTerm } from "./taxonomy-api";

/**
 * One CMS entry, described the way the Kompas content workspace shows it.
 *
 * Kept out of the component so the join — entry × taxonomy registry × system
 * catalogue — can be asserted without rendering anything, and so the screen
 * stays a layout file. Nothing here copies content into Kompas: every value is
 * read from the entry the CMS already owns.
 */

export const CONTENT_TYPE_LABEL: Record<ContentType, string> = {
  static_page: "Stranica",
  service: "Usluga",
  therapist: "Terapeut",
  program: "Program",
  company_plan: "Kompanijski plan",
  package_offer: "Paket",
  article: "Članak",
};

export const CMS_STATUS_LABEL: Record<PublicationStatus, string> = {
  draft: "Radna verzija",
  in_review: "Na pregledu",
  approved: "Odobreno",
  published: "Objavljeno",
  archived: "Arhivirano",
};

export interface CompassContentRow {
  entryId: string;
  revisionId: string;
  title: string;
  contentType: ContentType;
  typeLabel: string;
  slug: string;
  statusLabel: string;
  areaLabel: string | null;
  topicLabels: string[];
  audienceLabels: string[];
  goalLabels: string[];
  link: CompassContentLink;
}

function entryTitle(entry: ApiContentRevision): string {
  const definition = findSystemContentDefinition(entry.contentType, entry.slug);
  if (definition) return definition.title;
  const authored = entry.seo?.title?.trim();
  // A brand-new article has no title yet; the slug is the only honest label.
  return authored && authored.length > 0 ? authored : entry.slug;
}

function labelsFor(
  termIds: readonly string[],
  byId: Map<string, TaxonomyTerm>,
): string[] {
  return termIds
    .map((termId) => byId.get(termId)?.publicLabel)
    .filter((label): label is string => Boolean(label));
}

export function compassContentRow(
  entry: ApiContentRevision,
  terms: readonly TaxonomyTerm[],
): CompassContentRow {
  const byId = new Map(terms.map((term) => [term.termId, term]));
  const area = entry.discovery.topicGroupTermId
    ? byId.get(entry.discovery.topicGroupTermId)
    : undefined;

  return {
    entryId: entry.entryId,
    revisionId: entry.revisionId,
    title: entryTitle(entry),
    contentType: entry.contentType,
    typeLabel: CONTENT_TYPE_LABEL[entry.contentType] ?? entry.contentType,
    slug: entry.slug,
    statusLabel: CMS_STATUS_LABEL[entry.status] ?? entry.status,
    areaLabel: area?.publicLabel ?? null,
    topicLabels: labelsFor(entry.discovery.topicTermIds, byId),
    audienceLabels: labelsFor(entry.discovery.audienceTermIds, byId),
    goalLabels: labelsFor(entry.discovery.contentGoalTermIds, byId),
    link: compassContentLink(entry, terms),
  };
}

export type CompassContentFilter = "all" | "linked" | "unlinked" | "incomplete";

export const COMPASS_CONTENT_FILTERS: {
  id: CompassContentFilter;
  label: string;
}[] = [
  { id: "all", label: "Sve" },
  { id: "unlinked", label: "Nije povezano" },
  { id: "incomplete", label: "Nedostaju podaci" },
  { id: "linked", label: "Spremno za Kompas" },
];

function matchesFilter(
  row: CompassContentRow,
  filter: CompassContentFilter,
): boolean {
  if (filter === "all") return true;
  if (filter === "unlinked") return row.link.stage === "not-linked";
  if (filter === "incomplete") return row.link.stage === "incomplete";
  return row.link.stage !== "not-linked" && row.link.stage !== "incomplete";
}

function matchesSearch(row: CompassContentRow, search: string): boolean {
  const needle = search.trim().toLocaleLowerCase("sr-Latn");
  if (needle.length === 0) return true;
  return [row.title, row.typeLabel, row.areaLabel ?? "", ...row.topicLabels]
    .join(" ")
    .toLocaleLowerCase("sr-Latn")
    .includes(needle);
}

/**
 * The rows this screen is responsible for.
 *
 * Therapist pages are excluded rather than listed as ineligible: the server
 * drops the whole content type before any rule is evaluated, so offering to
 * "link" one would be an action with no effect.
 */
export function compassContentRows(
  entries: readonly ApiContentRevision[],
  terms: readonly TaxonomyTerm[],
  options: { filter: CompassContentFilter; search: string },
): CompassContentRow[] {
  return entries
    .filter((entry) => entry.contentType !== "therapist")
    .map((entry) => compassContentRow(entry, terms))
    .filter(
      (row) =>
        matchesFilter(row, options.filter) &&
        matchesSearch(row, options.search),
    )
    .sort((left, right) => left.title.localeCompare(right.title, "sr-Latn"));
}
