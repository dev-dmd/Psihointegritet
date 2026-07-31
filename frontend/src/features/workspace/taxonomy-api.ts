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
  ) {
    super(message);
    this.name = "TaxonomyApiError";
  }
}

async function parseOrThrow<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    let message = text || `Zahtev nije uspeo (${response.status}).`;
    try {
      const parsed: unknown = text ? JSON.parse(text) : null;
      if (isApiProblem(parsed)) {
        message =
          parsed.status >= 500
            ? `Kompas registar trenutno nije dostupan. Pokušajte ponovo. Ako se greška ponovi, pošaljite podršci ID greške: ${parsed.correlationId}.`
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
    throw new TaxonomyApiError(message, response.status);
  }
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
