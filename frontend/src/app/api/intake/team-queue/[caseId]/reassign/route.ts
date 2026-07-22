import { forwardStaffIntake } from "@/lib/intake/backend-proxy";

interface RouteContext {
  params: Promise<{ caseId: string }>;
}

export async function POST(
  request: Request,
  context: RouteContext,
): Promise<Response> {
  const { caseId } = await context.params;
  const body = await request.text();
  if (new TextEncoder().encode(body).byteLength > 1_000) {
    return Response.json({ error: "Zahtev je prevelik." }, { status: 413 });
  }
  return forwardStaffIntake(
    `/api/v1/intake/cases/${encodeURIComponent(caseId)}/reassign`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
    },
  );
}
