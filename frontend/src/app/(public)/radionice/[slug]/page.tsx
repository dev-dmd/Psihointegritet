import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { PageHero } from "@/components/shared/page-hero";
import { JsonLd } from "@/components/shared/json-ld";
import { Chip } from "@/components/ui/chip";
import { findGroupProgram, groupPrograms } from "@/content/programs";
import {
  jsonLdForEntity,
  metadataForEntity,
} from "@/lib/content-governance/discoverability";
import { getContentProvider } from "@/lib/content-governance/provider-resolver";

interface WorkshopDetailProps {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams(): { slug: string }[] {
  return groupPrograms.map((program) => ({ slug: program.slug }));
}

export async function generateMetadata({
  params,
}: WorkshopDetailProps): Promise<Metadata> {
  const program = findGroupProgram((await params).slug);
  if (!program) return {};
  const entity = (await getContentProvider()).getEntity(
    "program",
    `program:${program.slug}`,
  );
  return entity ? metadataForEntity(entity) : {};
}

export default async function WorkshopDetailPage({
  params,
}: WorkshopDetailProps) {
  const t = await getTranslations("public.pages.workshopDetail");
  const slug = (await params).slug;
  const provider = await getContentProvider();
  const contentEntity = provider.getEntity("program", `program:${slug}`);
  const program = contentEntity?.source ?? findGroupProgram(slug);
  if (!program) notFound();

  return (
    <>
      {contentEntity ? <JsonLd data={jsonLdForEntity(contentEntity)} /> : null}
      <PageHero id="radionica" tone="warm">
        <nav aria-label={t("breadcrumbLabel")} className="mb-9 text-sm">
          <Link href="/" className="text-coffee/60 hover:text-forest">
            {t("home")}
          </Link>
          <span aria-hidden className="text-coffee/35 px-2">
            /
          </span>
          <Link href="/radionice" className="text-coffee/60 hover:text-forest">
            {t("workshops")}
          </Link>
          <span aria-hidden className="text-coffee/35 px-2">
            /
          </span>
          <span className="text-coffee">{program.title}</span>
        </nav>
        <div className="max-w-[760px]">
          <p className="text-coffee/60 mb-4 text-[12px] font-semibold tracking-[0.14em] uppercase">
            {program.status === "price-confirmed"
              ? t("priceConfirmed")
              : t("preparing")}
          </p>
          <h1 className="text-coffee mb-4 font-serif text-[clamp(32px,8.5vw,52px)] leading-[1.06] font-normal text-pretty">
            {program.title}
          </h1>
          <p className="text-coffee/75 text-[16.5px] leading-[1.65]">
            {program.audience}
          </p>
          <div className="mt-7 flex flex-wrap gap-2.5">
            <Chip>{program.sessions}</Chip>
            {program.details ? <Chip>{program.details}</Chip> : null}
            <Chip>{program.priceLine}</Chip>
          </div>
        </div>
      </PageHero>
      <section className="pt-[64px] pb-[72px] md:pt-24 md:pb-24">
        <div className="mx-auto grid max-w-[1120px] gap-8 px-5 md:grid-cols-[7fr_5fr] md:px-8">
          <div>
            <h2 className="text-forest font-serif text-[28px] font-normal">
              {t("aboutHeading")}
            </h2>
            <p className="text-coffee/75 mt-4 text-[15.5px] leading-[1.65]">
              {t("aboutBody")}
            </p>
            {program.note ? (
              <p className="bg-warm/20 text-coffee/78 mt-6 rounded-[18px] px-5 py-4 text-[14px] leading-[1.6]">
                {program.note}
              </p>
            ) : null}
          </div>
          <aside className="bg-meadow/22 rounded-[22px] p-6">
            <h2 className="text-forest font-serif text-[25px] font-normal">
              {t("registrationHeading")}
            </h2>
            <p className="text-coffee/72 mt-3 text-[14.5px] leading-[1.6]">
              {t("registrationBody")}
            </p>
            <Link
              href="/kontakt"
              className="text-forest hover:text-sage mt-5 inline-flex min-h-11 items-center text-[14px] font-semibold underline underline-offset-4"
            >
              {t("askQuestion")}
            </Link>
          </aside>
        </div>
      </section>
    </>
  );
}
