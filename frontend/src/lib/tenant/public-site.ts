import "server-only";

import {
  deploymentPublicSite,
  organizationLocationsLabel,
  type OrganizationPublicSite,
} from "@/lib/tenant/organizations";
import { getDeploymentOrganization } from "@/lib/tenant/org-context";

export type { OrganizationLocation } from "@/lib/tenant/organizations";
export type { OrganizationPublicSite };

/**
 * Who this deployment is, on public surfaces.
 *
 * The replacement for `content/site-settings.ts`. That module exported one
 * frozen object, so every deployment claimed the same name and the same
 * contact address no matter which organization it served — the footer, the
 * contact page, legal documents and JSON-LD all said "Psihointegritet" even
 * with `DEFAULT_ORGANIZATION_SLUG` set to someone else.
 *
 * Resolution goes through `getDeploymentOrganization()` rather than reading the
 * registry directly, so public identity travels the same path as locale and
 * inherits its backend override the day `organizations` carries these columns.
 * Nothing here reads a request API, so public pages stay prerendered.
 */
export async function getPublicSiteSettings(): Promise<OrganizationPublicSite> {
  return (await getDeploymentOrganization()).publicSite;
}

/**
 * The same answer, without awaiting.
 *
 * Only for module-level constants that are built at import time and cannot be
 * async — `content-governance/static-provider.ts` builds its route catalogue
 * this way. It reads the checked-in registry alone, so it never sees a backend
 * override; anything that renders per request should await
 * `getPublicSiteSettings()` instead.
 *
 * Mirrors `deploymentContentPack()` in `content/registry.ts`, which resolves
 * the deployment's pack the same way and for the same reason.
 */
export const deploymentPublicSiteSettings = deploymentPublicSite;

/** Re-exported so server components have one import for tenant identity. */
export const locationsShortLabel = organizationLocationsLabel;

/** Plain city list. Per-therapist phrasing is inflected elsewhere. */
export function locationCities(
  settings: OrganizationPublicSite,
): readonly string[] {
  return settings.locations.map((location) => location.city);
}
