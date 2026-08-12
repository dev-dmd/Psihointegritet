/**
 * Client for the Diagnostic Engine backend (`modules/diagnostics/router.py`),
 * proxied through `app/api/superadmin/diagnostics/**` Next Route Handlers
 * (same pattern as `legal-documents-api.ts` → `app/api/privacy/**`).
 *
 * The backend `DiagnosticRunRequest` uses `organizationId: null` for global
 * superadmin scope. The UI always sends `null` because the diagnostics screen
 * lives under the superadmin guard.
 */

export type DiagnosticStatusValue =
  "ok" | "info" | "warning" | "error" | "failed";

export type DiagnosticModeValue = "compact" | "full";

export interface DiagnosticDefinition {
  key: string;
  label: string;
  description: string;
  category: string;
  supportedModes: DiagnosticModeValue[];
  tenantAware: boolean;
}

export interface DiagnosticResult {
  key: string;
  status: DiagnosticStatusValue;
  affectedCount: number;
  summary: string;
  sampleRows: Record<string, unknown>[];
  suggestion: string | null;
  durationMs: number;
  checkedAt: string;
}

export interface DiagnosticRunSummary {
  ok: number;
  info: number;
  warning: number;
  error: number;
  failed: number;
}

export interface DiagnosticRunResponse {
  results: DiagnosticResult[];
  summary: DiagnosticRunSummary;
  checkedAt: string;
}

export interface RunDiagnosticsVariables {
  category?: string;
  mode?: DiagnosticModeValue;
  /** null = global scope (superadmin only). */
  organizationId?: string | null;
}

export class DiagnosticsApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "DiagnosticsApiError";
  }
}

async function parseOrThrow<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    let message = text || `Zahtev nije uspeo (${response.status}).`;
    try {
      const parsed: { detail?: { message?: string } } = JSON.parse(text);
      if (parsed.detail?.message) message = parsed.detail.message;
    } catch {
      // keep raw text
    }
    throw new DiagnosticsApiError(message, response.status);
  }
  return (await response.json()) as T;
}

/** GET /api/v1/superadmin/diagnostics — registered definitions, no execution. */
export async function fetchDiagnosticsDefinitions(): Promise<
  DiagnosticDefinition[]
> {
  const response = await fetch("/api/superadmin/diagnostics", {
    cache: "no-store",
  });
  return parseOrThrow<DiagnosticDefinition[]>(response);
}

/** POST /api/v1/superadmin/diagnostics/run — run all (or by category). */
export async function runDiagnostics(
  variables: RunDiagnosticsVariables,
): Promise<DiagnosticRunResponse> {
  const response = await fetch("/api/superadmin/diagnostics", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      category: variables.category ?? "booking",
      mode: variables.mode ?? "compact",
      organizationId: variables.organizationId ?? null,
    }),
  });
  return parseOrThrow<DiagnosticRunResponse>(response);
}

/** POST /api/v1/superadmin/diagnostics/{key}/run — run one diagnostic. */
export async function runDiagnosticByKey(
  key: string,
  variables: RunDiagnosticsVariables,
): Promise<DiagnosticRunResponse> {
  const response = await fetch(
    `/api/superadmin/diagnostics/${encodeURIComponent(key)}/run`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        category: variables.category ?? null,
        mode: variables.mode ?? "compact",
        organizationId: variables.organizationId ?? null,
      }),
    },
  );
  return parseOrThrow<DiagnosticRunResponse>(response);
}
