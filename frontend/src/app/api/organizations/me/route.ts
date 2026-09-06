import { forwardStaffIntake } from "@/lib/intake/backend-proxy";

/** Organization settings for the signed-in staff member (D-077). */
export async function GET(): Promise<Response> {
  return forwardStaffIntake("/api/v1/organizations/me", {});
}
