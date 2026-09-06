import { parseJsonResponse } from "@/lib/api/request-json";
import type { components } from "@/types/api.generated";

export type SurveyResults = components["schemas"]["SurveyResultsOut"];

/** Every survey version the tenant has, aggregated per version. */
export async function fetchResearchOverview(): Promise<SurveyResults[]> {
  const response = await fetch("/api/research/overview", {
    cache: "no-store",
  });
  const body = await parseJsonResponse<{ surveys: SurveyResults[] }>(response);
  return body.surveys;
}
