/**
 * Stable problem-details envelope shared with the FastAPI backend.
 * The UI must never depend on raw backend exception strings.
 */
export interface ApiProblem {
  type: string;
  title: string;
  status: number;
  code: string;
  detail?: string;
  correlationId: string;
  fieldErrors?: Record<string, string[]>;
}

export function isApiProblem(value: unknown): value is ApiProblem {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.type === "string" &&
    typeof candidate.title === "string" &&
    typeof candidate.status === "number" &&
    typeof candidate.code === "string" &&
    typeof candidate.correlationId === "string"
  );
}
