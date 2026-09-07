import type { Metadata } from "next";
import Link from "next/link";

import { getTranslations } from "next-intl/server";

import { SIGN_IN_PATH } from "@/lib/routes/auth-paths";
import {
  PLATFORM_NAME,
  TENANT_DOMAINS,
  tenantSiteUrl,
} from "@/lib/tenant/domain-registry";

/**
 * The platform's own front page.
 *
 * Reached only by rewrite: the proxy maps the platform host's `/` here, and
 * refuses this pathname from outside so it cannot be indexed or linked as a
 * second address for the same page.
 *
 * **It is deliberately not `app/(public)/page.tsx`.** That tree is the founding
 * tenant's ~26 pages with copy written for one practice; borrowing it would put
 * Psihointegritet's home page on the platform's domain, which is the identity
 * D-080 retired and the hole phase 2b closed. The platform having no page of
 * its own was the reason that hole existed, so it gets one.
 *
 * Minimal on purpose. The real marketing site is PDC-1's job; this exists so
 * the platform host can answer 200 with something true about itself, and so the
 * `PLATFORM_HOST` cutover is an env change rather than a content project.
 */
export const metadata: Metadata = {
  // `absolute`, so the root layout's template cannot sign the platform's page
  // with the founding tenant's brand.
  title: { absolute: PLATFORM_NAME },
  // Nothing here is worth indexing until it is a real landing page.
  robots: { index: false, follow: false },
};

export default async function PlatformHomePage() {
  const t = await getTranslations("screens.platform");

  return (
    <main className="mx-auto flex min-h-screen max-w-[640px] flex-col justify-center px-6 py-24">
      <h1 className="text-coffee font-serif text-[clamp(32px,8vw,52px)] leading-[1.1] font-normal">
        {t("landingTitle")}
      </h1>
      <p className="text-coffee/70 mt-5 text-[17px] leading-[1.7]">
        {t("landingLead")}
      </p>
      <Link
        href={SIGN_IN_PATH}
        className="border-coffee/12 text-coffee hover:border-sage bg-surface mt-10 inline-flex w-fit items-center rounded-full border px-5 py-2.5 text-[15px] font-semibold transition-colors"
      >
        {t("signIn")}
      </Link>

      {/* Deliberately unstyled, and built from the registry rather than a
          second list of links to keep in step. `tenantSiteUrl` prefers a
          tenant's temporary host, so Sanja resolves to the address that
          actually answers and reverts to her own domain the day that field is
          deleted.

          Plain <a>, not <Link>: these are cross-origin, and typed routes only
          know about this app's own paths. */}
      <section className="mt-12">
        <h2 className="text-coffee/60 text-[13px] font-semibold tracking-wide uppercase">
          {t("tenantsHeading")}
        </h2>
        <ul className="mt-3">
          {TENANT_DOMAINS.map((tenant) => (
            <li key={tenant.organizationSlug}>
              <a
                href={tenantSiteUrl(tenant)}
                className="text-coffee/80 hover:text-coffee text-[15px] underline"
              >
                {tenantSiteUrl(tenant)}
              </a>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
