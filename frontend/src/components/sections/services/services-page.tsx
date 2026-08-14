import type { Route } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { Reveal } from "@/components/motion/reveal";
import { PageHero } from "@/components/shared/page-hero";
import { Chip } from "@/components/ui/chip";
import { Eyebrow } from "@/components/ui/eyebrow";
import { groupPrograms, type GroupProgram } from "@/content/programs";
import { getFallbackContent } from "@/content/server";
import {
  formatRsd,
  type ServiceCatalogItem,
  type SessionPackage,
} from "@/content/services";
import { buildBookingHref } from "@/features/booking/booking-context";

export async function ServicesPage({
  services,
  programs = groupPrograms,
  packages,
}: {
  services?: readonly ServiceCatalogItem[];
  programs?: readonly GroupProgram[];
  packages?: readonly SessionPackage[];
}) {
  const t = await getTranslations("public.pages.servicesListing");
  const fallback = (await getFallbackContent()).services;
  const resolvedServices = services ?? fallback.serviceCatalog;
  const resolvedPackages = packages ?? fallback.sessionPackages;
  const { PRICE_NOTE, supportAreas } = fallback;
  return (
    <>
      <PageHero id="usluge">
        <div className="max-w-[680px]">
          <Eyebrow className="mb-4">{t("eyebrow")}</Eyebrow>
          <h1 className="text-forest mb-[18px] font-serif text-[clamp(30px,8.5vw,40px)] leading-[1.06] font-normal tracking-[-0.015em] text-pretty md:text-[52px]">
            {t("title")}
          </h1>
          <p className="text-coffee/72 text-[16.5px] leading-[1.65]">
            {t("intro")}
          </p>
        </div>
      </PageHero>

      <section className="pt-[72px] md:pt-24">
        <div className="mx-auto max-w-[1536px] px-5 md:px-8">
          <Reveal>
            <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
              {resolvedServices.map((service) => (
                <article
                  key={service.slug}
                  className="bg-surface border-coffee/6 flex flex-col justify-between gap-8 rounded-3xl border px-8 pt-9 pb-[30px]"
                >
                  <div>
                    <h2 className="text-forest mb-3 font-serif text-[26px] leading-[1.12] font-normal">
                      {service.name}
                    </h2>
                    {service.description ? (
                      <p className="text-coffee/68 text-[15px] leading-[1.6]">
                        {service.description}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap gap-2.5">
                    <Chip>{service.duration}</Chip>
                    <Chip>{formatRsd(service.priceAmount)}</Chip>
                    <Chip>{service.format}</Chip>
                  </div>
                  <div className="mt-5 flex flex-wrap gap-4">
                    <Link
                      href={`/usluge/${service.slug}`}
                      className="text-forest hover:text-sage text-[14px] font-semibold underline underline-offset-4"
                    >
                      {t("details")}
                    </Link>
                    <Link
                      href={
                        buildBookingHref({
                          service: service.slug,
                          source: "service",
                        }) as Route
                      }
                      className="text-forest hover:text-sage text-[14px] font-semibold underline underline-offset-4"
                    >
                      {t("book")}
                    </Link>
                  </div>
                </article>
              ))}
            </div>
            <p className="text-coffee/60 mt-6 max-w-[680px] text-[13.5px] leading-[1.6]">
              {PRICE_NOTE}
            </p>
          </Reveal>
        </div>
      </section>

      <section className="pt-[72px] md:pt-24">
        <div className="mx-auto max-w-[1536px] px-5 md:px-8">
          <Reveal>
            <Eyebrow className="mb-4">{t("packagesHeading")}</Eyebrow>
            <p className="text-coffee/68 mb-8 max-w-[620px] text-[15px] leading-[1.6]">
              {t("packagesBody")}
            </p>
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              {resolvedPackages.map((pack) => (
                <article
                  key={pack.sessions}
                  className="bg-meadow/24 flex flex-col justify-between gap-6 rounded-[22px] px-7 py-8"
                >
                  <div>
                    <h3 className="text-forest mb-1.5 font-serif text-2xl leading-[1.15] font-normal">
                      {t("sessionPackage", { sessions: pack.sessions })}
                    </h3>
                    <p className="text-coffee/68 text-sm leading-[1.55]">
                      {pack.deadline}
                    </p>
                  </div>
                  <div className="flex items-baseline gap-3">
                    {pack.fullPriceAmount ? (
                      <s className="text-coffee/50 text-[16px]">
                        {formatRsd(pack.fullPriceAmount)}
                      </s>
                    ) : null}
                    <span className="text-forest font-serif text-[26px] font-bold">
                      {formatRsd(pack.priceAmount)}
                    </span>
                  </div>
                </article>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      <section className="pt-[72px] md:pt-24">
        <div className="mx-auto max-w-[1536px] px-5 md:px-8">
          <Reveal>
            <Eyebrow className="mb-4">{t("programsHeading")}</Eyebrow>
            <p className="text-coffee/68 mb-8 max-w-[680px] text-[15px] leading-[1.6]">
              {t("programsBody")}
            </p>
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
              {programs.map((program) => (
                <article
                  key={program.slug}
                  className="bg-surface border-coffee/6 flex flex-col gap-4 rounded-3xl border px-7 pt-8 pb-7"
                >
                  <h3 className="text-forest font-serif text-[22px] leading-[1.2] font-normal text-pretty">
                    {program.title}
                  </h3>
                  <p className="text-coffee/68 grow text-[14px] leading-[1.6]">
                    {program.audience}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Chip>{program.sessions}</Chip>
                    {program.details ? <Chip>{program.details}</Chip> : null}
                  </div>
                  <p className="text-coffee/70 text-[13.5px] font-medium">
                    {program.priceLine}
                  </p>
                  {program.note ? (
                    <p className="text-coffee/60 text-[12.5px] leading-[1.5]">
                      {program.note}
                    </p>
                  ) : null}
                  <Link
                    href={`/radionice/${program.slug}`}
                    className="text-forest hover:text-sage mt-2 inline-flex min-h-11 items-center text-[14px] font-semibold underline underline-offset-4"
                  >
                    {t("programDetails")}
                  </Link>
                </article>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      <section className="pt-[72px] md:pt-24">
        <div className="mx-auto max-w-[1536px] px-5 md:px-8">
          <Reveal>
            <Eyebrow className="mb-4">{t("otherAreas")}</Eyebrow>
            <div className="mt-8 grid grid-cols-1 gap-5 md:grid-cols-3">
              {supportAreas.map((area) => (
                <Link
                  key={area.title}
                  href={area.href as Route}
                  className="bg-meadow/24 hover:bg-meadow/42 flex flex-col gap-3 rounded-[22px] px-7 py-8 no-underline transition-colors duration-[250ms]"
                >
                  <h3 className="text-forest font-serif text-2xl leading-[1.15] font-normal">
                    {area.title}
                  </h3>
                  <p className="text-coffee/68 text-sm leading-[1.55]">
                    {area.description}
                  </p>
                </Link>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      <section className="pt-[72px] pb-[72px] md:pt-24 md:pb-24">
        <div className="mx-auto max-w-[1536px] px-5 md:px-8">
          <Reveal>
            <div className="bg-forest flex flex-col items-start gap-6 rounded-[28px] px-7 py-10 md:px-16 md:py-14">
              <div>
                <h2 className="text-canvas mb-3 font-serif text-[28px] leading-[1.12] font-normal text-pretty md:text-[32px]">
                  {t("guidanceTitle")}
                </h2>
                <p className="text-canvas/72 max-w-[480px] text-[15.5px] leading-[1.65]">
                  {t("guidanceBody")}
                </p>
              </div>
              <Link
                href="/pronadji-podrsku"
                className="bg-meadow text-forest hover:bg-meadow-hover inline-flex min-h-11 items-center rounded-full px-7 text-[15px] font-semibold no-underline transition-colors"
              >
                {t("guidanceAction")}
              </Link>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
