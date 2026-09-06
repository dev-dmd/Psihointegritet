/** Public: DELETE /api/v1/booking/slots/hold/{holdId} */
import { forwardPublicBooking } from "@/lib/booking/backend-proxy";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ holdId: string }> },
): Promise<Response> {
  const { holdId } = await params;
  return forwardPublicBooking(`/api/v1/booking/slots/hold/${holdId}`, {
    method: "DELETE",
  });
}
