import { forwardStaffBooking } from "@/lib/booking/backend-proxy";

/** Staff: therapists whose schedule the caller may open. */
export async function GET(): Promise<Response> {
  return forwardStaffBooking("/api/v1/booking/availability/therapists", {
    method: "GET",
  });
}
