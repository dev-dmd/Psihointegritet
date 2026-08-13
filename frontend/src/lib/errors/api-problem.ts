/**
 * Stable problem-details envelope shared with the FastAPI backend.
 * The UI must never depend on raw backend exception strings.
 */
export interface ApiProblem {
  type: string;
  status: number;
  code: string;
  params?: Record<string, string | number | boolean>;
  fieldPath?: string;
  fieldErrors?: Record<
    string,
    Array<{ code: string; params?: Record<string, string | number | boolean> }>
  >;
}

export function isApiProblem(value: unknown): value is ApiProblem {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.type === "string" &&
    typeof candidate.status === "number" &&
    typeof candidate.code === "string"
  );
}
