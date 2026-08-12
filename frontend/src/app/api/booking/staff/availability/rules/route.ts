import { forwardStaffBooking } from "@/lib/booking/backend-proxy";

/** Staff: create a recurring working-hours rule (ADR-015 v2 §2.7). */
export async function POST(request: Request): Promise<Response> {
  return forwardStaffBooking("/api/v1/booking/availability/rules", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: await request.text(),
  });
}
