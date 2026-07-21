import type { Metadata } from "next";
import Link from "next/link";

import { PageHero } from "@/components/shared/page-hero";
import { siteSettings } from "@/content/site-settings";

export const metadata: Metadata = {
  title: "Kontakt",
  description:
    "Opšti kontakt Psihointegriteta, informacije o lokacijama i jasni putevi za zakazivanje ili rad sa kompanijama.",
  alternates: { canonical: "/kontakt" },
};

export default function ContactPage() {
  return (
    <>
      <PageHero id="kontakt" tone="warm">
        <div className="max-w-[720px]">
          <p className="text-coffee/60 mb-4 text-[12px] font-semibold tracking-[0.14em] uppercase">
            Kontakt
          </p>
          <h1 className="text-coffee mb-4 font-serif text-[clamp(32px,8.5vw,52px)] leading-[1.06] font-normal">
            Kako možemo pomoći?
          </h1>
          <p className="text-coffee/75 text-[16.5px] leading-[1.65]">
            Za opšta i poslovna pitanja pišite nam na{" "}
            {siteSettings.contactEmail}. Za termin, vođeni izbor i programe za
            kompanije koristite odgovarajući put ispod.
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
              Želite termin?
            </h2>
            <p className="text-coffee/68 mt-3 text-sm leading-[1.55]">
              Pošaljite zahtev za termin.
            </p>
          </Link>
          <Link
            href="/pronadji-podrsku"
            className="bg-surface border-coffee/8 hover:border-sage rounded-[20px] border p-6 no-underline transition-colors"
          >
            <h2 className="text-forest font-serif text-[23px] font-normal">
              Niste sigurni?
            </h2>
            <p className="text-coffee/68 mt-3 text-sm leading-[1.55]">
              Pronađite podršku kroz vođeni izbor.
            </p>
          </Link>
          <Link
            href="/rad-sa-kompanijama"
            className="bg-surface border-coffee/8 hover:border-sage rounded-[20px] border p-6 no-underline transition-colors"
          >
            <h2 className="text-forest font-serif text-[23px] font-normal">
              Predstavljate kompaniju?
            </h2>
            <p className="text-coffee/68 mt-3 text-sm leading-[1.55]">
              Pogledajte programe za organizacije.
            </p>
          </Link>
        </div>
        <section className="bg-meadow/22 mt-10 max-w-[620px] rounded-[22px] p-7">
          <h2 className="text-forest font-serif text-[26px] font-normal">
            Kontakt podaci
          </h2>
          <a
            href={`mailto:${siteSettings.contactEmail}`}
            className="text-forest hover:text-sage mt-4 inline-flex font-semibold underline underline-offset-4"
          >
            {siteSettings.contactEmail}
          </a>
          <p className="text-coffee/72 mt-5 text-[15px] leading-[1.65]">
            Za opšte pitanje možete nam pisati na ovu adresu. Za zahtev za
            termin koristite posebnu formu za zakazivanje.
          </p>
          <p className="text-coffee/72 mt-5 text-[15px] leading-[1.65]">
            Niš i Leskovac
            <br />
            online i uživo
          </p>
        </section>
      </div>
    </>
  );
}
