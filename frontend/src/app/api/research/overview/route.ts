import "server-only";

import { forwardStaffIntake } from "@/lib/intake/backend-proxy";

/** Staff-only aggregates; the Clerk bearer token is forwarded by the shared
 * proxy, same as every other workspace read. */
export async function GET() {
  return forwardStaffIntake("/api/v1/research/overview", { method: "GET" });
}
