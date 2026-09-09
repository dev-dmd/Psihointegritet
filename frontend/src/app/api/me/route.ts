import { forwardStaffIntake } from "@/lib/intake/backend-proxy";

/** The PDC session says who; FastAPI returns PostgreSQL identity/roles (D-083). */
export async function GET(): Promise<Response> {
  return forwardStaffIntake("/api/v1/me", { method: "GET" });
}
