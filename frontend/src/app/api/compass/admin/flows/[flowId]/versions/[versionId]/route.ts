import { forwardStaffIntake } from "@/lib/intake/backend-proxy";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ flowId: string; versionId: string }> },
): Promise<Response> {
  const { flowId, versionId } = await params;
  return forwardStaffIntake(
    `/api/v1/compass/flows/${encodeURIComponent(flowId)}/versions/${encodeURIComponent(versionId)}`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: await request.text(),
    },
  );
}
