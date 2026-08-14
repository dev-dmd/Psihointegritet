import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { PageHero } from "@/components/shared/page-hero";
import { locationsShortLabel, siteSettings } from "@/content/site-settings";
import { metadataForRoute } from "@/lib/content-governance/discoverability";
import { getContentProvider } from "@/lib/content-governance/provider-resolver";

export async function generateMetadata() {
  return metadataForRoute("/kontakt", await getContentProvider());
}

export default async function ContactPage() {
  const t = await getTranslations("public.pages.contact");
  return (
    <>
      <PageHero id="kontakt" tone="warm">
        <div className="max-w-[720px]">
          <p className="text-coffee/60 mb-4 text-[12px] font-semibold tracking-[0.14em] uppercase">
            {t("eyebrow")}
          </p>
          <h1 className="text-coffee mb-4 font-serif text-[clamp(32px,8.5vw,52px)] leading-[1.06] font-normal">
            {t("title")}
          </h1>
          <p className="text-coffee/75 text-[16.5px] leading-[1.65]">
            {t("intro", { email: siteSettings.contactEmail })}
          </p>
        </div>
      </PageHero>
      <div className="mx-auto max-w-[1120px] px-5 pt-[64px] pb-[72px] md:px-8 md:pt-24 md:pb-24">
        <div className="grid gap-5 md:grid-cols-3">
          <Link
            href="/zakazi"
            className="bg-surface border-coffee/8 hover:border-sage rounded-[20px] border p-6 no-underline transition-colors"
          >
            <h2 className="text-forest font-serif text-[23px] font-normal">
              {t("appointmentTitle")}
            </h2>
            <p className="text-coffee/68 mt-3 text-sm leading-[1.55]">
              {t("appointmentBody")}
            </p>
          </Link>
          <Link
            href="/pronadji-podrsku"
            className="bg-surface border-coffee/8 hover:border-sage rounded-[20px] border p-6 no-underline transition-colors"
          >
            <h2 className="text-forest font-serif text-[23px] font-normal">
              {t("guidanceTitle")}
            </h2>
            <p className="text-coffee/68 mt-3 text-sm leading-[1.55]">
              {t("guidanceBody")}
            </p>
          </Link>
          <Link
            href="/rad-sa-kompanijama"
            className="bg-surface border-coffee/8 hover:border-sage rounded-[20px] border p-6 no-underline transition-colors"
          >
            <h2 className="text-forest font-serif text-[23px] font-normal">
              {t("companyTitle")}
            </h2>
            <p className="text-coffee/68 mt-3 text-sm leading-[1.55]">
              {t("companyBody")}
            </p>
          </Link>
        </div>
        <section className="bg-meadow/22 mt-10 max-w-[620px] rounded-[22px] p-7">
          <h2 className="text-forest font-serif text-[26px] font-normal">
            {t("detailsHeading")}
          </h2>
          <a
            href={`mailto:${siteSettings.contactEmail}`}
            className="text-forest hover:text-sage mt-4 inline-flex font-semibold underline underline-offset-4"
          >
            {siteSettings.contactEmail}
          </a>
          <p className="text-coffee/72 mt-5 text-[15px] leading-[1.65]">
            {t("detailsBody")}
          </p>
          <p className="text-coffee/72 mt-5 text-[15px] leading-[1.65]">
            {locationsShortLabel}
            <br />
            {t("formats")}
          </p>
        </section>
      </div>
    </>
  );
}
