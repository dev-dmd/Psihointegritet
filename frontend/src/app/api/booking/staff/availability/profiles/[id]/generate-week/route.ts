import { forwardStaffBooking } from "@/lib/booking/backend-proxy";

/** Staff: materialise slots for a week (ADR-015 v2 §2.7.5). */
export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await context.params;
  const query = new URL(request.url).searchParams.toString();
  return forwardStaffBooking(
    `/api/v1/booking/availability/profiles/${id}/generate-week?${query}`,
    { method: "POST" },
  );
}
