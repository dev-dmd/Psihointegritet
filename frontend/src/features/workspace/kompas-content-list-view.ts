import type { PublicationStatus } from "@/lib/content-governance/types";

import {
  compassContentLink,
  type CompassContentLink,
} from "./compass-content-linking";
import { CMS_STATUS_LABEL } from "./compass-content-view";
import type { ApiContentRevision } from "./content-api";
import {
  articleAuthorTargetId,
  articleTitle,
  therapistSlugFromTargetId,
} from "./kompas-article-view";
import type { TaxonomyTerm } from "./taxonomy-api";

/**
 * The Kompas content list shows Kompas material and nothing else (D-063).
 *
 * The old screen listed every CMS entry and asked the author to "link" a price
 * page to a topic. Pages of the site are edited in „Sadržaj"; this list is the
 * author's own work, so it filters to `article` and says who signs each text.
 */

export interface KompasArticleRow {
  entryId: string;
  revisionId: string;
  title: string;
  slug: string;
  /** Therapist slug taken from the byline CTA, when one is set. */
  authorSlug: string | null;
  status: PublicationStatus;
  statusLabel: string;
  areaLabel: string | null;
  topicLabels: string[];
  updatedAt: string;
  link: CompassContentLink;
}

export type KompasContentFilter = "all" | "draft" | "review" | "published";

export const KOMPAS_CONTENT_FILTERS: {
  id: KompasContentFilter;
  label: string;
}[] = [
  { id: "all", label: "Sve" },
  { id: "draft", label: "Radne verzije" },
  { id: "review", label: "Na pregledu" },
  { id: "published", label: "Objavljeno" },
];

export function kompasArticleRow(
  entry: ApiContentRevision,
  terms: readonly TaxonomyTerm[],
): KompasArticleRow {
  const byId = new Map(terms.map((term) => [term.termId, term]));
  const area = entry.discovery.topicGroupTermId
    ? byId.get(entry.discovery.topicGroupTermId)
    : undefined;

  return {
    entryId: entry.entryId,
    revisionId: entry.revisionId,
    title: articleTitle(entry),
    slug: entry.slug,
    authorSlug: therapistSlugFromTargetId(articleAuthorTargetId(entry)),
    status: entry.status,
    statusLabel: CMS_STATUS_LABEL[entry.status] ?? entry.status,
    areaLabel: area?.publicLabel ?? null,
    topicLabels: entry.discovery.topicTermIds
      .map((termId) => byId.get(termId)?.publicLabel)
      .filter((label): label is string => Boolean(label)),
    updatedAt: entry.updatedAt,
    link: compassContentLink(entry, terms),
  };
}

function matchesFilter(
  row: KompasArticleRow,
  filter: KompasContentFilter,
): boolean {
  if (filter === "all") return true;
  if (filter === "review") return row.status === "in_review";
  if (filter === "published") return row.status === "published";
  // "Radne verzije" groups draft and approved-but-not-yet-published: both are
  // still the author's to move, which is the question this filter answers.
  return row.status === "draft" || row.status === "approved";
}

function matchesSearch(row: KompasArticleRow, search: string): boolean {
  const needle = search.trim().toLocaleLowerCase("sr-Latn");
  if (needle.length === 0) return true;
  return [row.title, row.areaLabel ?? "", ...row.topicLabels]
    .join(" ")
    .toLocaleLowerCase("sr-Latn")
    .includes(needle);
}

/** Newest first — an author returns to what they were last working on. */
export function kompasArticleRows(
  entries: readonly ApiContentRevision[],
  terms: readonly TaxonomyTerm[],
  options: { filter: KompasContentFilter; search: string },
): KompasArticleRow[] {
  return entries
    .filter((entry) => entry.contentType === "article")
    .map((entry) => kompasArticleRow(entry, terms))
    .filter(
      (row) =>
        matchesFilter(row, options.filter) &&
        matchesSearch(row, options.search),
    )
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
}
