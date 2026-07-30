import { forwardStaffIntake } from "@/lib/intake/backend-proxy";

interface RouteContext {
  params: Promise<{
    documentId: string;
    revisionId: string;
    capability: string;
  }>;
}

export async function DELETE(
  _request: Request,
  context: RouteContext,
): Promise<Response> {
  const { documentId, revisionId, capability } = await context.params;
  return forwardStaffIntake(
    `/api/v1/privacy/documents/${encodeURIComponent(documentId)}/revisions/${encodeURIComponent(revisionId)}/approvals/${encodeURIComponent(capability)}`,
    { method: "DELETE" },
  );
}
