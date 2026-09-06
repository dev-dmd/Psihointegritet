import { forwardStaffBooking } from "@/lib/booking/backend-proxy";

/** Staff: replace a profile's whole week atomically. */
export async function PUT(request: Request): Promise<Response> {
  return forwardStaffBooking("/api/v1/booking/availability/rules/bulk", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: await request.text(),
  });
}
