import { forwardStaffBooking } from "@/lib/booking/backend-proxy";

/** Staff: add one explicit start (layer 2, ADR-015 v2 §2.7.5). */
export async function POST(request: Request): Promise<Response> {
  return forwardStaffBooking("/api/v1/booking/availability/manual-slots", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: await request.text(),
  });
}
