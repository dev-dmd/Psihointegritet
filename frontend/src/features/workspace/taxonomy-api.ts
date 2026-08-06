import { isApiProblem } from "@/lib/errors/api-problem";
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

export class TaxonomyApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly problem?: {
      code?: string;
      fieldPath?: string;
      fieldErrors?: Record<string, string[]>;
      correlationId?: string;
    },
  ) {
    super(message);
    this.name = "TaxonomyApiError";
  }
}

function serbianValidationMessage(message: string): string {
  if (message === "Field required") return "Ovo polje je obavezno.";
  if (message === "Input should be a valid integer") {
    return "Unesite ceo broj.";
  }
  if (message === "Input should be a valid UUID") {
    return "Izaberite postojeću vrednost iz liste.";
  }
  const maximum = message.match(
    /^String should have at most (\d+) characters$/,
  );
  if (maximum) return `Polje može imati najviše ${maximum[1]} karaktera.`;
  const minimum = message.match(
    /^String should have at least (\d+) characters$/,
  );
  if (minimum) return `Polje mora imati najmanje ${minimum[1]} karaktera.`;
  return message;
}

function normalizedFieldPath(path: string): string {
  const withoutBody = path.replace(/^body\./, "");
  return withoutBody.replace(/_([a-z])/g, (_, letter: string) =>
    letter.toUpperCase(),
  );
}

export function taxonomyFieldErrors(error: unknown): Record<string, string> {
  if (!(error instanceof TaxonomyApiError)) return {};
  const fields: Record<string, string> = {};
  if (error.problem?.fieldPath) {
    fields[normalizedFieldPath(error.problem.fieldPath)] = error.message;
  }
  for (const [path, messages] of Object.entries(
    error.problem?.fieldErrors ?? {},
  )) {
    if (messages[0]) {
      fields[normalizedFieldPath(path)] = serbianValidationMessage(messages[0]);
    }
  }
  return fields;
}

async function parseOrThrow<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    let message = text || `Zahtev nije uspeo (${response.status}).`;
    let parsed: unknown = null;
    try {
      parsed = text ? JSON.parse(text) : null;
      if (isApiProblem(parsed)) {
        message =
          parsed.status >= 500
            ? `Kompas registar trenutno nije dostupan. Pokušajte ponovo. Ako se greška ponovi, pošaljite podršci ID greške: ${parsed.correlationId}.`
            : parsed.code === "validation_error"
              ? "Proverite označena polja i ispravite unos."
              : (parsed.detail ?? parsed.title);
      } else if (
        typeof parsed === "object" &&
        parsed !== null &&
        "error" in parsed &&
        typeof parsed.error === "string"
      ) {
        message = parsed.error;
      }
    } catch {
      // Proxy/network responses need not use the API problem envelope.
    }
    throw new TaxonomyApiError(message, response.status, {
      ...(isApiProblem(parsed)
        ? {
            code: parsed.code,
            fieldPath: parsed.fieldPath,
            fieldErrors: parsed.fieldErrors,
            correlationId: parsed.correlationId,
          }
        : {}),
    });
  }
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

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
