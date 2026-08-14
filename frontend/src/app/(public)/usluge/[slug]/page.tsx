import type { Metadata } from "next";
import type { Route } from "next";
import { PublicLink as Link } from "@/components/ui/public-link";
import { notFound } from "next/navigation";
import { getFormatter, getTranslations } from "next-intl/server";

import { PageHero } from "@/components/shared/page-hero";
import { JsonLd } from "@/components/shared/json-ld";
import { Chip } from "@/components/ui/chip";
import { getFallbackContent } from "@/content/server";
import { formatRsd } from "@/content/services";
import { buildBookingHref } from "@/features/booking/booking-context";
import {
  jsonLdForEntity,
  metadataForEntity,
} from "@/lib/content-governance/discoverability";
import { getContentProvider } from "@/lib/content-governance/provider-resolver";

interface ServicePageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams(): Promise<{ slug: string }[]> {
  const { serviceCatalog } = (await getFallbackContent()).services;
  return serviceCatalog.map((service) => ({ slug: service.slug }));
}

export async function generateMetadata({
  params,
}: ServicePageProps): Promise<Metadata> {
  const { slug } = await params;
  const { serviceCatalog } = (await getFallbackContent()).services;
  const service = serviceCatalog.find((candidate) => candidate.slug === slug);
  if (!service) return {};
  const entity = (await getContentProvider()).getEntity(
    "service",
    `service:${service.slug}`,
  );
  return entity ? metadataForEntity(entity) : {};
}

export default async function ServiceDetailPage({ params }: ServicePageProps) {
  const t = await getTranslations("public.pages.serviceDetail");
  const format = await getFormatter();
  const slug = (await params).slug;
  const {
    homepage: { faqItems },
    services: { PRICE_NOTE, serviceCatalog, sessionPackages },
    therapists,
  } = await getFallbackContent();
  const provider = await getContentProvider();
  const contentEntity = provider.getEntity("service", `service:${slug}`);
  const service =
    contentEntity?.source ??
    serviceCatalog.find((candidate) => candidate.slug === slug);
  if (!service) notFound();

  const providers = therapists.filter((therapist) =>
    therapist.bookingServiceSlugs.includes(service.slug),
  );
  const locations = [
    ...new Set(
      providers.map(
        (therapist) => `${therapist.city}, ${therapist.cityRegionCode}`,
      ),
    ),
  ];
  const bookingHref = buildBookingHref({
    service: service.slug,
    source: "service",
  });

  return (
    <>
      {contentEntity ? <JsonLd data={jsonLdForEntity(contentEntity)} /> : null}
      <PageHero id="usluga">
        <nav aria-label={t("breadcrumbLabel")} className="mb-9 text-sm">
          <Link href="/" className="text-coffee/60 hover:text-forest">
            {t("home")}
          </Link>
          <span aria-hidden className="text-coffee/35 px-2">
            /
          </span>
          <Link href="/usluge" className="text-coffee/60 hover:text-forest">
            {t("services")}
          </Link>
          <span aria-hidden className="text-coffee/35 px-2">
            /
          </span>
          <span className="text-coffee">{service.name}</span>
        </nav>
        <div className="max-w-[760px]">
          <p className="text-sage mb-4 text-[12px] font-semibold tracking-[0.14em] uppercase">
            {t("eyebrow")}
          </p>
          <h1 className="text-forest mb-4 font-serif text-[clamp(32px,8.5vw,52px)] leading-[1.06] font-normal text-pretty">
            {service.name}
          </h1>
          {service.description ? (
            <p className="text-coffee/75 max-w-[680px] text-[16.5px] leading-[1.65]">
              {service.description}
            </p>
          ) : null}
          <div className="mt-7 flex flex-wrap gap-2.5">
            <Chip>{service.duration}</Chip>
            <Chip>{formatRsd(service.priceAmount)}</Chip>
            <Chip>{service.format}</Chip>
          </div>
          <Link
            href={bookingHref as Route}
            className="bg-forest text-canvas hover:bg-forest-hover mt-8 inline-flex min-h-11 items-center rounded-full px-7 text-[15px] font-semibold no-underline transition-colors"
          >
            {t("book")}
          </Link>
        </div>
      </PageHero>

      <div className="mx-auto max-w-[1120px] px-5 pt-[64px] pb-[72px] md:px-8 md:pt-24 md:pb-24">
        <div className="grid gap-12 md:grid-cols-[7fr_5fr]">
          <div className="space-y-12">
            <section>
              <h2 className="text-forest mb-3 font-serif text-[28px] font-normal">
                {t("audienceHeading")}
              </h2>
              <p className="text-coffee/75 text-[15.5px] leading-[1.65]">
                {service.audience}
              </p>
            </section>
            <section>
              <h2 className="text-forest mb-3 font-serif text-[28px] font-normal">
                {t("firstStepHeading")}
              </h2>
              <p className="text-coffee/75 text-[15.5px] leading-[1.65]">
                {service.firstStep}
              </p>
              <p className="text-coffee/60 mt-4 text-[13.5px] leading-[1.6]">
                {PRICE_NOTE}
              </p>
            </section>
            {service.slug === "individualna-psihoterapija" ? (
              <section>
                <h2 className="text-forest mb-4 font-serif text-[28px] font-normal">
                  {t("packagesHeading")}
                </h2>
                <div className="grid gap-3 sm:grid-cols-2">
                  {sessionPackages.map((pack) => (
                    <div
                      key={pack.sessions}
                      className="bg-meadow/22 rounded-[18px] p-5"
                    >
                      <p className="text-forest font-serif text-xl">
                        {t("sessionPackage", { sessions: pack.sessions })}
                      </p>
                      <p className="text-coffee/65 mt-1 text-sm">
                        {pack.deadline}
                      </p>
                      <p className="text-forest mt-3 font-semibold">
                        {formatRsd(pack.priceAmount)}
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            ) : null}
            <section>
              <h2 className="text-forest mb-4 font-serif text-[28px] font-normal">
                {t("questionsHeading")}
              </h2>
              <div className="space-y-3">
                {faqItems.slice(0, 3).map((item) => (
                  <details
                    key={item.id}
                    className="border-coffee/10 rounded-[16px] border px-5 py-4"
                  >
                    <summary className="text-forest cursor-pointer font-medium">
                      {item.question}
                    </summary>
                    <p className="text-coffee/70 mt-3 text-[14px] leading-[1.6]">
                      {item.answer}
                    </p>
                  </details>
                ))}
              </div>
            </section>
          </div>
          <aside className="space-y-6">
            <section className="bg-meadow/22 rounded-[22px] p-6">
              <h2 className="text-forest font-serif text-[25px] font-normal">
                {t("therapistsHeading")}
              </h2>
              <ul className="mt-4 space-y-3">
                {providers.map((therapist) => (
                  <li key={therapist.slug}>
                    <Link
                      href={`/tim/${therapist.slug}`}
                      className="text-coffee hover:text-forest font-medium underline underline-offset-4"
                    >
                      {therapist.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
            <section className="bg-surface border-coffee/8 rounded-[22px] border p-6">
              <h2 className="text-forest font-serif text-[25px] font-normal">
                {t("availabilityHeading")}
              </h2>
              <p className="text-coffee/72 mt-3 text-[14.5px] leading-[1.6]">
                {t("availabilityBody", {
                  format: service.format,
                  locations: format.list(locations),
                })}
              </p>
            </section>
          </aside>
        </div>
      </div>
    </>
  );
}
