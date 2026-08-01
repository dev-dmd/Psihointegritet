import { forwardStaffIntake } from "@/lib/intake/backend-proxy";

interface RouteContext {
  params: Promise<{ documentId: string; revisionId: string }>;
}

export async function GET(
  _: Request,
  context: RouteContext,
): Promise<Response> {
  const { documentId, revisionId } = await context.params;
  return forwardStaffIntake(
    `/api/v1/privacy/documents/${encodeURIComponent(documentId)}/revisions/${encodeURIComponent(revisionId)}/publish-check`,
    { method: "GET" },
  );
}
