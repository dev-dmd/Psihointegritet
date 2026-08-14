import "server-only";

import { getDeploymentOrganization } from "@/lib/tenant/org-context";

import { getFallbackContentForLocale, type FallbackContent } from "./registry";

/** SSG/ISR-safe fallback selected from the organization's cached `ui_locale`. */
export async function getFallbackContent(): Promise<FallbackContent> {
  const organization = await getDeploymentOrganization();
  return getFallbackContentForLocale(
    organization.uiLocale,
    organization.contentPack,
  );
}
