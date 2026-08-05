import { forwardStaffIntake } from "@/lib/intake/backend-proxy";

interface RouteContext {
  params: Promise<{ entryId: string; revisionId: string }>;
}

/** Proxy for the RW-3 new-draft endpoint. */
export async function POST(
  request: Request,
  context: RouteContext,
): Promise<Response> {
  const { entryId, revisionId } = await context.params;
  const body = await request.text();
  return forwardStaffIntake(
    `/api/v1/content/entries/${encodeURIComponent(entryId)}/revisions/${encodeURIComponent(revisionId)}/new-draft`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
    },
  );
}
