/** Staff: GET /api/v1/booking/appointment-requests?therapist_id=...&status=... */
import { forwardStaffBooking } from "@/lib/booking/backend-proxy";

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  return forwardStaffBooking(
    `/api/v1/booking/appointment-requests?${url.searchParams.toString()}`,
    { method: "GET" },
  );
}
