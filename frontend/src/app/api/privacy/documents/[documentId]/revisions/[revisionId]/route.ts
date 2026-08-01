import { forwardStaffIntake } from "@/lib/intake/backend-proxy";

interface RouteContext {
  params: Promise<{ documentId: string; revisionId: string }>;
}

function backendPath(documentId: string, revisionId: string): string {
  return `/api/v1/privacy/documents/${encodeURIComponent(documentId)}/revisions/${encodeURIComponent(revisionId)}`;
}

export async function PATCH(
  request: Request,
  context: RouteContext,
): Promise<Response> {
  const { documentId, revisionId } = await context.params;
  const body = await request.text();
  return forwardStaffIntake(backendPath(documentId, revisionId), {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body,
  });
}

export async function DELETE(
  _: Request,
  context: RouteContext,
): Promise<Response> {
  const { documentId, revisionId } = await context.params;
  return forwardStaffIntake(backendPath(documentId, revisionId), {
    method: "DELETE",
  });
}
