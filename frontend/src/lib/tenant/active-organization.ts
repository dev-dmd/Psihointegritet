import "server-only";

import { getDeploymentOrganization } from "@/lib/tenant/org-context";

/**
 * Which organization the current request is acting in.
 *
 * This exists so authorization can be tenant-scoped **before** B2 routing lands.
 * The guards need an organization to check a membership against; where that
 * organization comes from is a separate question, and one that is about to
 * change.
 *
 * Today, under the transitional C2(a) runtime, it is the deployment's own
 * organization — the deployment serves exactly one, so "the tenant of this
 * request" and "the tenant of this deployment" are the same answer.
 *
 * Under B2 (D-077 A7) it becomes the `/s/[organizationSlug]` route param, and
 * only this function changes. Every guard already asks the question through
 * here, so none of them is rewritten twice.
 *
 * **Not a security boundary by itself.** It answers *which* tenant, never
 * *whether this person may act in it* — that is `hasRole`, and the two are kept
 * apart on purpose. The frontend guard is also never the last word: FastAPI
 * re-derives the actor from its own organization context per request
 * (`resolve_staff_actor`, already tenant-scoped), so a frontend mistake cannot
 * by itself grant access to another tenant's data.
 */
export async function getActiveOrganizationSlug(): Promise<string> {
  return (await getDeploymentOrganization()).slug;
}
