import { forwardStaffIntake } from "@/lib/intake/backend-proxy";

/**
 * Changes the organization's languages (D-077).
 *
 * The body is forwarded untouched: authorization, the org-admin gate and the
 * audit record all live in FastAPI. Validating here as well would put the rule
 * in two places and let them drift — the proxy is never the authority.
 */
export async function PATCH(request: Request): Promise<Response> {
  return forwardStaffIntake("/api/v1/organizations/me/locales", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: await request.text(),
  });
}
