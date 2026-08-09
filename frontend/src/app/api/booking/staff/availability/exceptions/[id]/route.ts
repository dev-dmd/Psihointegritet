import { forwardStaffBooking } from "@/lib/booking/backend-proxy";

/**
 * GET lists the exceptions of a *therapist* in a date range (the range is
 * forwarded as-is); DELETE addresses one *exception*.
 */

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await context.params;
  const query = new URL(request.url).searchParams.toString();
  return forwardStaffBooking(
    `/api/v1/booking/availability/exceptions/${id}${query ? `?${query}` : ""}`,
    { method: "GET" },
  );
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await context.params;
  return forwardStaffBooking(`/api/v1/booking/availability/exceptions/${id}`, {
    method: "DELETE",
  });
}
