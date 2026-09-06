import { forwardSuperadminDiagnostics } from "@/lib/superadmin/backend-proxy";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ slug: string; userId: string }> },
): Promise<Response> {
  const { slug, userId } = await params;
  return forwardSuperadminDiagnostics(
    `/api/v1/superadmin/organizations/${encodeURIComponent(slug)}/users/${encodeURIComponent(userId)}/roles`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: await request.text(),
    },
  );
}
