import { forwardStaffIntake } from "@/lib/intake/backend-proxy";

interface RouteContext {
  params: Promise<{ caseId: string }>;
}

export async function POST(
  _: Request,
  context: RouteContext,
): Promise<Response> {
  const { caseId } = await context.params;
  return forwardStaffIntake(
    `/api/v1/intake/cases/${encodeURIComponent(caseId)}/claim`,
    { method: "POST" },
  );
}
