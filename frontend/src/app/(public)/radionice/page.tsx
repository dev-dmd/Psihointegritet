import type { Metadata } from "next";
import Link from "next/link";

import { PageHero } from "@/components/shared/page-hero";
import { Chip } from "@/components/ui/chip";
import { groupPrograms } from "@/content/programs";

export const metadata: Metadata = {
  title: "Radionice",
  description:
    "Grupni programi i radionice Psihointegriteta - teme, trajanje, format i status najave.",
  alternates: { canonical: "/radionice" },
};

export default function WorkshopsPage() {
  return (
    <>
      <PageHero id="radionice" tone="warm">
        <div className="max-w-[720px]">
          <p className="text-coffee/60 mb-4 text-[12px] font-semibold tracking-[0.14em] uppercase">
            Grupni programi
          </p>
          <h1 className="text-coffee mb-4 font-serif text-[clamp(32px,8.5vw,52px)] leading-[1.06] font-normal text-pretty">
            Radionice i programi
          </h1>
          <p className="text-coffee/75 text-[16.5px] leading-[1.65]">
            Programi su najavljeni na osnovu postojećeg sadržaja. Datum,
            voditelj, kapacitet i pravila prijave objavljuju se tek nakon
            potvrde tima.
          </p>
        </div>
      </PageHero>
      <section className="pt-[64px] pb-[72px] md:pt-24 md:pb-24">
        <div className="mx-auto max-w-[1536px] px-5 md:px-8">
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {groupPrograms.map((program) => (
              <article
                key={program.slug}
                className="bg-surface border-coffee/8 flex min-h-full flex-col rounded-[22px] border p-7"
              >
                <div>
                  <p className="text-sage text-[11px] font-semibold tracking-[0.13em] uppercase">
                    {program.status === "price-confirmed"
                      ? "Cena potvrđena"
                      : "U pripremi"}
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
                  Pogledajte detalje
                </Link>
              </article>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
