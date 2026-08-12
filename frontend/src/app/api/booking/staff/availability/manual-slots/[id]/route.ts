import { forwardStaffBooking } from "@/lib/booking/backend-proxy";

/** GET lists a *profile's* slots in a range; DELETE removes one *slot*. */

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await context.params;
  const query = new URL(request.url).searchParams.toString();
  return forwardStaffBooking(
    `/api/v1/booking/availability/manual-slots/${id}${query ? `?${query}` : ""}`,
    { method: "GET" },
  );
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await context.params;
  return forwardStaffBooking(
    `/api/v1/booking/availability/manual-slots/${id}`,
    { method: "DELETE" },
  );
}
