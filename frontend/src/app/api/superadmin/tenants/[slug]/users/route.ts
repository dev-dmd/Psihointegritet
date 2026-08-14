import { forwardSuperadminDiagnostics } from "@/lib/superadmin/backend-proxy";

export async function GET(
  _: Request,
  { params }: { params: Promise<{ slug: string }> },
): Promise<Response> {
  const { slug } = await params;
  return forwardSuperadminDiagnostics(
    `/api/v1/superadmin/organizations/${encodeURIComponent(slug)}/users`,
    { method: "GET" },
  );
}
