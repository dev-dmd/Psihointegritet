import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { tenantSiteFor } from "@/features/tenants/registry";
import { TENANT_DOMAINS, tenantForSlug } from "@/lib/tenant/domain-registry";
import { findOrganizationPublicSite } from "@/lib/tenant/organizations";

/**
 * A tenant's public home page.
 *
 * Today this renders the deliberate empty state for a tenant that has no page
 * definition yet. That is the whole content model this slice ships: **missing
 * tenant content means an empty tenant, never the founding tenant's content.**
 * Falling back to the latter is how one practice's marketing copy ends up on
 * another practitioner's domain.
 *
 * PDC-1 replaces this body with the page model. The routing around it — one
 * project, host to tenant, prerendered per tenant — does not change then.
 */
export const revalidate = 300;
export const dynamicParams = false;

export function generateStaticParams() {
  return TENANT_DOMAINS.filter((tenant) => !tenant.usesLegacyPublicTree).map(
    (tenant) => ({ organizationSlug: tenant.organizationSlug }),
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ organizationSlug: string }>;
}): Promise<Metadata> {
  const { organizationSlug } = await params;
  const tenant = tenantForSlug(organizationSlug);
  const site = findOrganizationPublicSite(organizationSlug);
  if (!tenant || !site) return {};

  // A tenant who has a finished site owns its metadata outright — including
  // whether it may be indexed, which the placeholder below always refuses.
  const own = tenantSiteFor(organizationSlug);
  if (own) {
    return {
      ...own.metadata,
      metadataBase: new URL(tenant.publicUrl),
      alternates: { canonical: "/" },
    };
  }

  return {
    // `absolute`, not a plain string. The root layout appends the founding
    // tenant's brand through a title template, which on this surface would
    // render "Sanja Neuer | Psihointegritet" — one practitioner's page signed
    // with another's name. Every field the root asserts is overridden here for
    // the same reason; a tenant page states its own identity completely.
    title: { absolute: site.publicName },
    description: site.description,
    // The tenant's own origin, never the internal `/s/...` path and never one
    // shared platform URL — canonical has to name the domain people visit.
    metadataBase: new URL(tenant.publicUrl),
    alternates: { canonical: "/" },
    openGraph: {
      title: site.publicName,
      description: site.description,
      url: tenant.publicUrl,
      siteName: site.publicName,
      // Explicitly none: the shared `opengraph-image` is the founding tenant's
      // artwork, and inheriting it would put their branding on her link previews.
      images: [],
    },
    twitter: {
      title: site.publicName,
      description: site.description,
      images: [],
    },
    // Nothing here is worth indexing until the tenant has authored a site.
    robots: { index: false, follow: false },
  };
}

export default async function TenantHomePage({
  params,
}: {
  params: Promise<{ organizationSlug: string }>;
}) {
  const { organizationSlug } = await params;
  const site = findOrganizationPublicSite(organizationSlug);
  if (!site) notFound();

  // A registry lookup, not a branch per tenant (D-081): the third tenant is an
  // entry in `TENANT_SITES`, and a tenant without one gets the empty state
  // below — which is the correct answer, not a missing case.
  const own = tenantSiteFor(organizationSlug);
  if (own) return <own.Page />;

  return (
    <main className="mx-auto flex min-h-screen max-w-[640px] flex-col justify-center px-6 py-24">
      <h1 className="text-coffee font-serif text-[clamp(32px,8vw,52px)] leading-[1.1] font-normal">
        {site.publicName}
      </h1>
      <p className="text-coffee/70 mt-5 text-[17px] leading-[1.7]">
        Sajt je u pripremi.
      </p>
    </main>
  );
}
