import { revalidateTag } from "next/cache";

import { forwardStaffIntake } from "@/lib/intake/backend-proxy";
import { organizationLocaleTag } from "@/lib/tenant/org-context";
import { serverEnv } from "@/lib/validation/env";

/**
 * Changes the organization's languages (D-077).
 *
 * The body is forwarded untouched: authorization, the org-admin gate and the
 * audit record all live in FastAPI. Validating here as well would put the rule
 * in two places and let them drift — the proxy is never the authority.
 *
 * On success the locale tag is revalidated, which is what makes the setting
 * take effect. Without it the choice is saved, audited, and then sits behind a
 * cached read until it expires — a screen that says "saved" and changes
 * nothing, which is worse than no screen at all.
 */
export async function PATCH(request: Request): Promise<Response> {
  const response = await forwardStaffIntake(
    "/api/v1/organizations/me/locales",
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: await request.text(),
    },
  );

  if (response.ok) {
    // Next 16 requires a cache-life profile alongside the tag. `minutes`
    // matches the `revalidate: 300` on the read in `org-context.ts`; the two
    // describe the same data and drifting them apart would leave the setting
    // visible on one path and stale on another.
    revalidateTag(
      organizationLocaleTag(serverEnv.DEFAULT_ORGANIZATION_SLUG),
      "minutes",
    );
  }

  return response;
}
