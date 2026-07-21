import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { PageHero } from "@/components/shared/page-hero";
import { Chip } from "@/components/ui/chip";
import { findGroupProgram, groupPrograms } from "@/content/programs";

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
  return {
    title: program.title,
    description: `${program.audience} ${program.sessions}. ${program.priceLine}`,
    alternates: { canonical: `/radionice/${program.slug}` },
  };
}

export default async function WorkshopDetailPage({
  params,
}: WorkshopDetailProps) {
  const program = findGroupProgram((await params).slug);
  if (!program) notFound();

  return (
    <>
      <PageHero id="radionica" tone="warm">
        <nav aria-label="Putanja" className="mb-9 text-sm">
          <Link href="/" className="text-coffee/60 hover:text-forest">
            Početna
          </Link>
          <span aria-hidden className="text-coffee/35 px-2">
            /
          </span>
          <Link href="/radionice" className="text-coffee/60 hover:text-forest">
            Radionice
          </Link>
          <span aria-hidden className="text-coffee/35 px-2">
            /
          </span>
          <span className="text-coffee">{program.title}</span>
        </nav>
        <div className="max-w-[760px]">
          <p className="text-coffee/60 mb-4 text-[12px] font-semibold tracking-[0.14em] uppercase">
            {program.status === "price-confirmed"
              ? "Cena potvrđena"
              : "Program u pripremi"}
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
              O programu
            </h2>
            <p className="text-coffee/75 mt-4 text-[15.5px] leading-[1.65]">
              Trenutno su potvrđeni tema, ciljna grupa i broj susreta. Dodatni
              sadržaj programa objavljuje se nakon potvrde tima.
            </p>
            {program.note ? (
              <p className="bg-warm/20 text-coffee/78 mt-6 rounded-[18px] px-5 py-4 text-[14px] leading-[1.6]">
                {program.note}
              </p>
            ) : null}
          </div>
          <aside className="bg-meadow/22 rounded-[22px] p-6">
            <h2 className="text-forest font-serif text-[25px] font-normal">
              Status prijava
            </h2>
            <p className="text-coffee/72 mt-3 text-[14.5px] leading-[1.6]">
              Prijave još nisu otvorene. Datum, voditelj, kapacitet i pravila
              prijave biće objavljeni nakon potvrde tima.
            </p>
            <Link
              href="/kontakt"
              className="text-forest hover:text-sage mt-5 inline-flex min-h-11 items-center text-[14px] font-semibold underline underline-offset-4"
            >
              Postavite opšte pitanje
            </Link>
          </aside>
        </div>
      </section>
    </>
  );
}
