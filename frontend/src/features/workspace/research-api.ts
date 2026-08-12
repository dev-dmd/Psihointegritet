import { isApiProblem } from "@/lib/errors/api-problem";
import type { components } from "@/types/api.generated";

export type SurveyResults = components["schemas"]["SurveyResultsOut"];

export class ResearchPanelError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "ResearchPanelError";
  }
}

async function parseOrThrow<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    let message = text || `Zahtev nije uspeo (${response.status}).`;
    try {
      const parsed: unknown = text ? JSON.parse(text) : null;
      if (isApiProblem(parsed)) message = parsed.detail ?? parsed.title;
    } catch {
      // Not JSON — keep the raw text.
    }
    throw new ResearchPanelError(message, response.status);
  }
  return (await response.json()) as T;
}

/** Every survey version the tenant has, aggregated per version. */
export async function fetchResearchOverview(): Promise<SurveyResults[]> {
  const response = await fetch("/api/research/overview", {
    cache: "no-store",
  });
  const body = await parseOrThrow<{ surveys: SurveyResults[] }>(response);
  return body.surveys;
}
