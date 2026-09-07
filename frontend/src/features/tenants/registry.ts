import type { ComponentType } from "react";
import type { Metadata } from "next";

import { SanjaLandingPage, sanjaSeo } from "@/features/tenants/sanja-neuer";

/**
 * Which tenants have a site of their own, and what it is.
 *
 * A registry rather than a branch in the page, for the reason D-081 states as
 * the whole point of the consolidation: **a third tenant must be an entry here,
 * not another `if` in a shared route.** The tenant page asks this map; a tenant
 * that is absent gets the placeholder, which is the correct answer rather than
 * a missing case.
 *
 * Hand-written today. When PDC-1 lands the page model, a tenant's entry becomes
 * "render from the CMS" and this map is where that switch happens — one place,
 * per tenant, without touching the route.
 */
export interface TenantSite {
  Page: ComponentType;
  metadata: Metadata;
}

export const TENANT_SITES: Readonly<Record<string, TenantSite>> = {
  "sanja-neuer": {
    Page: SanjaLandingPage,
    metadata: {
      title: { absolute: sanjaSeo.title },
      description: sanjaSeo.description,
      keywords: [...sanjaSeo.keywords],
      // Her domain is real and her page is finished, so unlike the placeholder
      // this one is meant to be found.
      robots: { index: true, follow: true },
      openGraph: {
        type: "website",
        title: sanjaSeo.ogTitle,
        description: sanjaSeo.ogDescription,
        locale: "sr_RS",
        // Explicitly empty, not omitted. Next's file-based `opengraph-image`
        // in `app/` applies to every route beneath it, so leaving this out
        // puts the founding tenant's artwork on her link previews.
        images: [],
      },
      twitter: { card: "summary_large_image", images: [] },
    },
  },
};

export function tenantSiteFor(slug: string): TenantSite | undefined {
  return TENANT_SITES[slug];
}
