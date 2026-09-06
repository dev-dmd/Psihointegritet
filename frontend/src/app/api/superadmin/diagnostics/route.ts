import { forwardSuperadminDiagnostics } from "@/lib/superadmin/backend-proxy";

/**
 * GET  → list registered diagnostic definitions (no execution).
 * POST → run diagnostics (all or by category), superadmin only.
 */
export async function GET(): Promise<Response> {
  return forwardSuperadminDiagnostics("/api/v1/superadmin/diagnostics", {
    method: "GET",
  });
}

export async function POST(request: Request): Promise<Response> {
  const body = await request.text();
  return forwardSuperadminDiagnostics("/api/v1/superadmin/diagnostics/run", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
  });
}
