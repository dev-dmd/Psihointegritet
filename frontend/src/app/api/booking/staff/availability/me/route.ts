import { forwardStaffBooking } from "@/lib/booking/backend-proxy";

/** Staff: which therapist the signed-in account is (availability screens). */
export async function GET(): Promise<Response> {
  return forwardStaffBooking("/api/v1/booking/availability/me", {
    method: "GET",
  });
}
