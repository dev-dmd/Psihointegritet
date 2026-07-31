import { forwardStaffIntake } from "@/lib/intake/backend-proxy";

interface RouteContext {
  params: Promise<{ termId: string; revisionId: string }>;
}

export async function PATCH(
  request: Request,
  context: RouteContext,
): Promise<Response> {
  const { termId, revisionId } = await context.params;
  const body = await request.text();
  return forwardStaffIntake(
    `/api/v1/content/taxonomy/terms/${encodeURIComponent(termId)}/revisions/${encodeURIComponent(revisionId)}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body,
    },
  );
}
