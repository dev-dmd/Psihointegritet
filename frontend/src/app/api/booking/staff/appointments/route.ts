/** Staff: GET /api/v1/booking/appointments?therapist_id=...&date_from=...&date_until=... */
import { forwardStaffBooking } from "@/lib/booking/backend-proxy";

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  return forwardStaffBooking(
    `/api/v1/booking/appointments?${url.searchParams.toString()}`,
    { method: "GET" },
  );
}
