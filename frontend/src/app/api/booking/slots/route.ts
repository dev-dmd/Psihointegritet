/** Public: GET /api/v1/booking/slots?service_id=...&therapist_profile_id=... */
import { forwardPublicBooking } from "@/lib/booking/backend-proxy";

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  return forwardPublicBooking(
    `/api/v1/booking/slots?${url.searchParams.toString()}`,
    { method: "GET" },
  );
}
