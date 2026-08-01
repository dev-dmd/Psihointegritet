import { forwardStaffIntake } from "@/lib/intake/backend-proxy";

interface RouteContext {
  params: Promise<{ termId: string }>;
}

export async function PUT(
  request: Request,
  context: RouteContext,
): Promise<Response> {
  const { termId } = await context.params;
  const body = await request.text();
  return forwardStaffIntake(
    `/api/v1/content/taxonomy/terms/${encodeURIComponent(termId)}/routes/canonical`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body,
    },
  );
}
