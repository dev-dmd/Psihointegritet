import { forwardStaffIntake } from "@/lib/intake/backend-proxy";

/** Clerk authenticates the session; FastAPI returns PostgreSQL identity/roles. */
export async function GET(): Promise<Response> {
  return forwardStaffIntake("/api/v1/me", { method: "GET" });
}
