import type { Metadata } from "next";
import Link from "next/link";

import { PageHero } from "@/components/shared/page-hero";
import { groupPrograms } from "@/content/programs";
import {
  formatRsd,
  PRICE_NOTE,
  serviceCatalog,
  sessionPackages,
} from "@/content/services";

export const metadata: Metadata = {
  title: "Cene",
  description:
    "Okvirne cene individualne psihoterapije, bračnog i roditeljskog savetovanja, paketa i najavljenih programa.",
  alternates: { canonical: "/cene" },
};

export default function PricesPage() {
  return (
    <>
      <PageHero id="cene">
        <div className="max-w-[720px]">
          <p className="text-sage mb-4 text-[12px] font-semibold tracking-[0.14em] uppercase">
            Transparentne informacije
          </p>
          <h1 className="text-forest mb-4 font-serif text-[clamp(32px,8.5vw,52px)] leading-[1.06] font-normal">
            Cene usluga i programa
          </h1>
          <p className="text-coffee/75 text-[16.5px] leading-[1.65]">
            {PRICE_NOTE}
          </p>
        </div>
      </PageHero>
      <div className="mx-auto max-w-[1120px] px-5 pt-[64px] pb-[72px] md:px-8 md:pt-24 md:pb-24">
        <section>
          <h2 className="text-forest font-serif text-[30px] font-normal">
            Individualne usluge
          </h2>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {serviceCatalog.map((service) => (
              <Link
                key={service.slug}
                href={`/usluge/${service.slug}`}
                className="bg-surface border-coffee/8 hover:border-sage rounded-[20px] border p-6 no-underline transition-colors"
              >
                <h3 className="text-forest font-serif text-[23px] font-normal">
                  {service.name}
                </h3>
                <p className="text-coffee/65 mt-3 text-sm">
                  {service.duration}
                </p>
                <p className="text-forest mt-4 text-[20px] font-semibold">
                  {formatRsd(service.priceAmount)}
                </p>
                <p className="text-coffee/60 mt-2 text-sm">{service.format}</p>
              </Link>
            ))}
          </div>
        </section>
        <section className="mt-14">
          <h2 className="text-forest font-serif text-[30px] font-normal">
            Paketi
          </h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {sessionPackages.map((pack) => (
              <article
                key={pack.sessions}
                className="bg-meadow/22 rounded-[20px] p-6"
              >
                <h3 className="text-forest font-serif text-[23px] font-normal">
                  {pack.sessions} individualnih seansi
                </h3>
                <p className="text-coffee/65 mt-2 text-sm">{pack.deadline}</p>
                <p className="text-forest mt-4 text-[20px] font-semibold">
                  {formatRsd(pack.priceAmount)}
                </p>
              </article>
            ))}
          </div>
          {/* TODO(Anja): potvrditi da paket od 5 seansi ostaje 15.000 RSD. */}
        </section>
        <section className="mt-14">
          <h2 className="text-forest font-serif text-[30px] font-normal">
            Grupni programi
          </h2>
          <div className="mt-6 grid gap-3">
            {groupPrograms.map((program) => (
              <Link
                key={program.slug}
                href={`/radionice/${program.slug}`}
                className="border-coffee/10 hover:border-sage flex flex-col justify-between gap-2 rounded-[16px] border px-5 py-4 no-underline transition-colors sm:flex-row sm:items-center"
              >
                <span className="text-forest font-medium">{program.title}</span>
                <span className="text-coffee/70 text-sm">
                  {program.priceLine}
                </span>
              </Link>
            ))}
          </div>
        </section>
        <section className="bg-warm/18 mt-14 rounded-[22px] p-6">
          <h2 className="text-coffee font-serif text-[27px] font-normal">
            Plaćanje i pomeranje termina
          </h2>
          <p className="text-coffee/75 mt-3 max-w-[720px] text-[14.5px] leading-[1.65]">
            Način plaćanja i pravila otkazivanja nisu javno potvrđeni. Tačan
            dogovor o terminu i uslovima pravite direktno sa terapeutom.
          </p>
        </section>
      </div>
    </>
  );
}
