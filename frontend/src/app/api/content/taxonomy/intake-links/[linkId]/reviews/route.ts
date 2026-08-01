import { forwardStaffIntake } from "@/lib/intake/backend-proxy";

interface RouteContext {
  params: Promise<{ linkId: string }>;
}

export async function POST(
  request: Request,
  context: RouteContext,
): Promise<Response> {
  const { linkId } = await context.params;
  const body = await request.text();
  return forwardStaffIntake(
    `/api/v1/content/taxonomy/intake-links/${encodeURIComponent(linkId)}/reviews`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
    },
  );
}
