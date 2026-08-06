import { forwardStaffIntake } from "@/lib/intake/backend-proxy";

export async function GET(): Promise<Response> {
  return forwardStaffIntake("/api/v1/content/staff-users", {});
}
