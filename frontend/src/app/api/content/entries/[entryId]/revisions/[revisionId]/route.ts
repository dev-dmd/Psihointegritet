import { forwardStaffIntake } from "@/lib/intake/backend-proxy";

interface RouteContext {
  params: Promise<{ entryId: string; revisionId: string }>;
}

function backendPath(entryId: string, revisionId: string): string {
  return `/api/v1/content/entries/${encodeURIComponent(entryId)}/revisions/${encodeURIComponent(revisionId)}`;
}

export async function PATCH(
  request: Request,
  context: RouteContext,
): Promise<Response> {
  const { entryId, revisionId } = await context.params;
  const body = await request.text();
  return forwardStaffIntake(backendPath(entryId, revisionId), {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body,
  });
}

export async function DELETE(
  _: Request,
  context: RouteContext,
): Promise<Response> {
  const { entryId, revisionId } = await context.params;
  return forwardStaffIntake(backendPath(entryId, revisionId), {
    method: "DELETE",
  });
}
