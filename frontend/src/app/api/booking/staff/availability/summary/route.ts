import { forwardStaffBooking } from "@/lib/booking/backend-proxy";

/** Staff: one call behind all four availability cards. */
export async function GET(request: Request): Promise<Response> {
  const query = new URL(request.url).searchParams.toString();
  return forwardStaffBooking(`/api/v1/booking/availability/summary?${query}`, {
    method: "GET",
  });
}
