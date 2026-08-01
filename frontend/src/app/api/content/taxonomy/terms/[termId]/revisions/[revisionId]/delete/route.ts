import { forwardStaffIntake } from "@/lib/intake/backend-proxy";

interface RouteContext {
  params: Promise<{ termId: string; revisionId: string }>;
}

export async function POST(
  _: Request,
  context: RouteContext,
): Promise<Response> {
  const { termId, revisionId } = await context.params;
  return forwardStaffIntake(
    `/api/v1/content/taxonomy/terms/${encodeURIComponent(termId)}/revisions/${encodeURIComponent(revisionId)}/delete`,
    { method: "POST" },
  );
}
