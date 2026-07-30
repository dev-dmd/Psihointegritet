import { forwardStaffIntake } from "@/lib/intake/backend-proxy";

interface RouteContext {
  params: Promise<{ entryId: string; revisionId: string }>;
}

export async function GET(
  _request: Request,
  context: RouteContext,
): Promise<Response> {
  const { entryId, revisionId } = await context.params;
  return forwardStaffIntake(
    `/api/v1/content/entries/${encodeURIComponent(entryId)}/revisions/${encodeURIComponent(revisionId)}/content-health`,
    { method: "GET" },
  );
}
