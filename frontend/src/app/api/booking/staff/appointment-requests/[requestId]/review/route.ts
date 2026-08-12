/** Staff: POST /api/v1/booking/appointment-requests/{id}/review */
import { forwardStaffBooking } from "@/lib/booking/backend-proxy";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ requestId: string }> },
): Promise<Response> {
  const { requestId } = await params;
  return forwardStaffBooking(
    `/api/v1/booking/appointment-requests/${requestId}/review`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: await request.text(),
    },
  );
}
