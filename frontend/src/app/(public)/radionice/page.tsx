import { PublicLink as Link } from "@/components/ui/public-link";
import { getTranslations } from "next-intl/server";

import { PageHero } from "@/components/shared/page-hero";
import { Chip } from "@/components/ui/chip";
import { metadataForRoute } from "@/lib/content-governance/discoverability";
import { getContentProvider } from "@/lib/content-governance/provider-resolver";

export async function generateMetadata() {
  return metadataForRoute("/radionice", await getContentProvider());
}

export default async function WorkshopsPage() {
  const t = await getTranslations("public.pages.workshops");
  const programs = (await getContentProvider())
    .listAll()
    .filter((entity) => entity.type === "program")
    .map((entity) => entity.source);
  return (
    <>
      <PageHero id="radionice" tone="warm">
        <div className="max-w-[720px]">
          <p className="text-coffee/60 mb-4 text-[12px] font-semibold tracking-[0.14em] uppercase">
            {t("eyebrow")}
          </p>
          <h1 className="text-coffee mb-4 font-serif text-[clamp(32px,8.5vw,52px)] leading-[1.06] font-normal text-pretty">
            {t("title")}
          </h1>
          <p className="text-coffee/75 text-[16.5px] leading-[1.65]">
            {t("intro")}
          </p>
        </div>
      </PageHero>
      <section className="pt-[64px] pb-[72px] md:pt-24 md:pb-24">
        <div className="mx-auto max-w-[1536px] px-5 md:px-8">
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {programs.map((program) => (
              <article
                key={program.slug}
                className="bg-surface border-coffee/8 flex min-h-full flex-col rounded-[22px] border p-7"
              >
                <div>
                  <p className="text-sage text-[11px] font-semibold tracking-[0.13em] uppercase">
                    {program.status === "price-confirmed"
                      ? t("priceConfirmed")
                      : t("preparing")}
                  </p>
                  <h2 className="text-forest mt-3 font-serif text-[25px] leading-[1.16] font-normal">
                    {program.title}
                  </h2>
                  <p className="text-coffee/70 mt-3 text-[14.5px] leading-[1.6]">
                    {program.audience}
                  </p>
                </div>
                <div className="mt-6 flex flex-wrap gap-2">
                  <Chip>{program.sessions}</Chip>
                  {program.details ? <Chip>{program.details}</Chip> : null}
                </div>
                <p className="text-coffee/75 mt-4 text-[14px] font-medium">
                  {program.priceLine}
                </p>
                <Link
                  href={`/radionice/${program.slug}`}
                  className="text-forest hover:text-sage mt-auto inline-flex min-h-11 items-end pt-6 text-[14px] font-semibold underline underline-offset-4"
                >
                  {t("details")}
                </Link>
              </article>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
