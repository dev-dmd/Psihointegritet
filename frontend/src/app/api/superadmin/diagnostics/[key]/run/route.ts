import { forwardSuperadminDiagnostics } from "@/lib/superadmin/backend-proxy";

/** POST → run a single diagnostic by key, superadmin only. */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ key: string }> },
): Promise<Response> {
  const { key } = await params;
  const body = await request.text();
  return forwardSuperadminDiagnostics(
    `/api/v1/superadmin/diagnostics/${encodeURIComponent(key)}/run`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
    },
  );
}
