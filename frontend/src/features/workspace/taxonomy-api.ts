import {
  JsonRequestError,
  parseJsonResponse as parseOrThrow,
} from "@/lib/api/request-json";
import type { components } from "@/types/api.generated";

export type TaxonomyTerm = components["schemas"]["TaxonomyTermOut"];
export type TaxonomyIntakeLink = components["schemas"]["TaxonomyIntakeLinkOut"];
export type TaxonomyAxis = components["schemas"]["TaxonomyAxis"];
export type TaxonomyStatus = components["schemas"]["RevisionStatus"];
export type CreateTaxonomyTermInput =
  components["schemas"]["CreateTaxonomyTermRequest"];
export type UpdateTaxonomyRevisionInput =
  components["schemas"]["UpdateTaxonomyRevisionRequest"];
export type CreateTaxonomyIntakeLinkInput =
  components["schemas"]["CreateTaxonomyIntakeLinkRequest"];
export type TaxonomyReviewDecisionInput =
  components["schemas"]["TaxonomyReviewDecisionRequest"];
export type TaxonomyIntakeLinkReviewInput =
  components["schemas"]["TaxonomyIntakeLinkReviewRequest"];
export type TaxonomyRouteSuggestion =
  components["schemas"]["TaxonomyRouteSuggestionOut"];
export type TaxonomyRoute = components["schemas"]["TaxonomyRouteOut"];

export const TAXONOMY_REGISTRY_QUERY_KEY = [
  "kompas-taxonomy-registry",
  "sr-Latn",
] as const;

export interface TaxonomyRegistrySnapshot {
  terms: TaxonomyTerm[];
  intakeLinks: TaxonomyIntakeLink[];
}

export { JsonRequestError as TaxonomyApiError };

export async function fetchTaxonomyRegistry(
  locale = "sr-Latn",
): Promise<TaxonomyRegistrySnapshot> {
  const query = `?locale=${encodeURIComponent(locale)}`;
  const [termsResponse, intakeLinksResponse] = await Promise.all([
    fetch(`/api/content/taxonomy/terms${query}`, { cache: "no-store" }),
    fetch("/api/content/taxonomy/intake-links", { cache: "no-store" }),
  ]);
  const [terms, intakeLinks] = await Promise.all([
    parseOrThrow<TaxonomyTerm[]>(termsResponse),
    parseOrThrow<TaxonomyIntakeLink[]>(intakeLinksResponse),
  ]);
  return { terms, intakeLinks };
}

export async function createTaxonomyTerm(
  input: CreateTaxonomyTermInput,
): Promise<TaxonomyTerm> {
  const response = await fetch("/api/content/taxonomy/terms", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return parseOrThrow<TaxonomyTerm>(response);
}

export async function updateTaxonomyRevision(
  termId: string,
  revisionId: string,
  input: UpdateTaxonomyRevisionInput,
): Promise<TaxonomyTerm> {
  const response = await fetch(
    `/api/content/taxonomy/terms/${encodeURIComponent(termId)}/revisions/${encodeURIComponent(revisionId)}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    },
  );
  return parseOrThrow<TaxonomyTerm>(response);
}

export async function suggestTaxonomyRoute(
  termId: string,
  locale = "sr-Latn",
): Promise<TaxonomyRouteSuggestion> {
  const response = await fetch(
    `/api/content/taxonomy/terms/${encodeURIComponent(termId)}/routes/suggestion`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ locale }),
    },
  );
  return parseOrThrow<TaxonomyRouteSuggestion>(response);
}

export async function confirmTaxonomyRoute(
  termId: string,
  input: { slug: string; lockVersion?: number | null; locale?: string },
): Promise<TaxonomyRoute> {
  const response = await fetch(
    `/api/content/taxonomy/terms/${encodeURIComponent(termId)}/routes/canonical`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        locale: input.locale ?? "sr-Latn",
        slug: input.slug,
        ...(input.lockVersion == null
          ? {}
          : { lockVersion: input.lockVersion }),
      }),
    },
  );
  return parseOrThrow<TaxonomyRoute>(response);
}

export async function createTaxonomyIntakeLink(
  input: CreateTaxonomyIntakeLinkInput,
): Promise<TaxonomyIntakeLink> {
  const response = await fetch("/api/content/taxonomy/intake-links", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return parseOrThrow<TaxonomyIntakeLink>(response);
}

export async function transitionTaxonomyRevision(
  termId: string,
  revisionId: string,
  lockVersion: number,
  target: TaxonomyStatus,
): Promise<TaxonomyTerm> {
  const response = await fetch(
    `/api/content/taxonomy/terms/${encodeURIComponent(termId)}/revisions/${encodeURIComponent(revisionId)}/transition`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lockVersion, target }),
    },
  );
  return parseOrThrow<TaxonomyTerm>(response);
}

export async function deleteTaxonomyRevision(
  termId: string,
  revisionId: string,
): Promise<void> {
  const response = await fetch(
    `/api/content/taxonomy/terms/${encodeURIComponent(termId)}/revisions/${encodeURIComponent(revisionId)}/delete`,
    { method: "POST" },
  );
  await parseOrThrow<void>(response);
}

export async function recordTaxonomyReviewDecision(
  termId: string,
  revisionId: string,
  input: TaxonomyReviewDecisionInput,
): Promise<TaxonomyTerm> {
  const response = await fetch(
    `/api/content/taxonomy/terms/${encodeURIComponent(termId)}/revisions/${encodeURIComponent(revisionId)}/reviews`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    },
  );
  return parseOrThrow<TaxonomyTerm>(response);
}

export async function transitionTaxonomyIntakeLink(
  linkId: string,
  lockVersion: number,
  target: TaxonomyStatus,
): Promise<TaxonomyIntakeLink> {
  const response = await fetch(
    `/api/content/taxonomy/intake-links/${encodeURIComponent(linkId)}/transition`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lockVersion, target }),
    },
  );
  return parseOrThrow<TaxonomyIntakeLink>(response);
}

export async function recordTaxonomyIntakeLinkReview(
  linkId: string,
  input: TaxonomyIntakeLinkReviewInput,
): Promise<TaxonomyIntakeLink> {
  const response = await fetch(
    `/api/content/taxonomy/intake-links/${encodeURIComponent(linkId)}/reviews`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    },
  );
  return parseOrThrow<TaxonomyIntakeLink>(response);
}
