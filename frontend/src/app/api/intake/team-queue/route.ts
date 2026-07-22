import { forwardStaffIntake } from "@/lib/intake/backend-proxy";

export async function GET(): Promise<Response> {
  return forwardStaffIntake("/api/v1/intake/cases/queue", { method: "GET" });
}
