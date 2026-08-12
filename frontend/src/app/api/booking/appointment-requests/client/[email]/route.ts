/** Public: GET /api/v1/booking/appointment-requests/client/{email} */
import { forwardPublicBooking } from "@/lib/booking/backend-proxy";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ email: string }> },
): Promise<Response> {
  const { email } = await params;
  return forwardPublicBooking(
    `/api/v1/booking/appointment-requests/client/${encodeURIComponent(email)}`,
    { method: "GET" },
  );
}
