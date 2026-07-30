import { forwardStaffIntake } from "@/lib/intake/backend-proxy";

interface RouteContext {
  params: Promise<{ documentId: string; revisionId: string }>;
}

export async function POST(
  request: Request,
  context: RouteContext,
): Promise<Response> {
  const { documentId, revisionId } = await context.params;
  const body = await request.text();
  return forwardStaffIntake(
    `/api/v1/privacy/documents/${encodeURIComponent(documentId)}/revisions/${encodeURIComponent(revisionId)}/approvals`,
    { method: "POST", headers: { "Content-Type": "application/json" }, body },
  );
}
