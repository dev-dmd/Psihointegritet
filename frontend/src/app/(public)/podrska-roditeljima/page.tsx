import type { Route } from "next";
import { PublicLink as Link } from "@/components/ui/public-link";
import { getTranslations } from "next-intl/server";

import { PageHero } from "@/components/shared/page-hero";
import { parentPrograms } from "@/content/programs";
import { getFallbackContent } from "@/content/server";
import { formatRsd } from "@/content/services";
import { buildBookingHref } from "@/features/booking/booking-context";
import { metadataForRoute } from "@/lib/content-governance/discoverability";
import { getContentProvider } from "@/lib/content-governance/provider-resolver";

export async function generateMetadata() {
  return metadataForRoute("/podrska-roditeljima", await getContentProvider());
}

export default async function ParentSupportPage() {
  const t = await getTranslations("public.pages.parentSupport");
  const fallback = await getFallbackContent();
  const parentService = fallback.services.serviceCatalog.find(
    (service) => service.slug === "roditeljsko-savetovanje",
  );
  if (!parentService) return null;
  const providers = fallback.therapists.filter((therapist) =>
    therapist.bookingServiceSlugs.includes(parentService.slug),
  );

  return (
    <>
      <PageHero id="podrska-roditeljima" tone="meadow">
        <div className="max-w-[760px]">
          <p className="text-sage mb-4 text-[12px] font-semibold tracking-[0.14em] uppercase">
            {t("eyebrow")}
          </p>
          <h1 className="text-forest mb-4 font-serif text-[clamp(32px,8.5vw,52px)] leading-[1.06] font-normal">
            {t("title")}
          </h1>
          {parentService.description ? (
            <p className="text-coffee/75 text-[16.5px] leading-[1.65]">
              {parentService.description}
            </p>
          ) : null}
          <Link
            href={
              buildBookingHref({
                service: parentService.slug,
                source: "service",
              }) as Route
            }
            className="bg-forest text-canvas hover:bg-forest-hover mt-7 inline-flex min-h-11 items-center rounded-full px-7 text-[15px] font-semibold no-underline transition-colors"
          >
            {t("book")}
          </Link>
        </div>
      </PageHero>
      <div className="mx-auto max-w-[1120px] px-5 pt-[64px] pb-[72px] md:px-8 md:pt-24 md:pb-24">
        <section className="grid gap-6 md:grid-cols-3">
          <div className="bg-surface border-coffee/8 rounded-[20px] border p-6">
            <h2 className="text-forest font-serif text-[23px] font-normal">
              {t("duration")}
            </h2>
            <p className="text-coffee/72 mt-3">{parentService.duration}</p>
          </div>
          <div className="bg-surface border-coffee/8 rounded-[20px] border p-6">
            <h2 className="text-forest font-serif text-[23px] font-normal">
              {t("price")}
            </h2>
            <p className="text-coffee/72 mt-3">
              {formatRsd(parentService.priceAmount)}
            </p>
          </div>
          <div className="bg-surface border-coffee/8 rounded-[20px] border p-6">
            <h2 className="text-forest font-serif text-[23px] font-normal">
              {t("format")}
            </h2>
            <p className="text-coffee/72 mt-3">{parentService.format}</p>
          </div>
        </section>
        <section className="mt-14">
          <h2 className="text-forest font-serif text-[30px] font-normal">
            {t("programsHeading")}
          </h2>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {parentPrograms().map((program) => (
              <Link
                key={program.slug}
                href={`/radionice/${program.slug}`}
                className="bg-meadow/22 hover:bg-meadow/32 rounded-[18px] p-5 no-underline transition-colors"
              >
                <h3 className="text-forest font-serif text-[22px] font-normal">
                  {program.title}
                </h3>
                <p className="text-coffee/70 mt-2 text-sm leading-[1.55]">
                  {program.audience}
                </p>
              </Link>
            ))}
          </div>
        </section>
        <section className="mt-14">
          <h2 className="text-forest font-serif text-[30px] font-normal">
            {t("therapistsHeading")}
          </h2>
          <div className="mt-5 flex flex-wrap gap-3">
            {providers.map((therapist) => (
              <Link
                key={therapist.slug}
                href={`/tim/${therapist.slug}`}
                className="border-coffee/15 text-forest hover:border-sage inline-flex min-h-11 items-center rounded-full border px-5 text-[14px] font-semibold no-underline"
              >
                {therapist.name}
              </Link>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}
