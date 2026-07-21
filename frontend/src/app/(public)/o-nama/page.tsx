import Link from "next/link";

import { PageHero } from "@/components/shared/page-hero";
import { siteSettings } from "@/content/site-settings";
import { metadataForRoute } from "@/lib/content-governance/discoverability";

export const metadata = metadataForRoute("/o-nama");

export default function AboutPage() {
  return (
    <>
      <PageHero id="o-nama">
        <div className="max-w-[760px]">
          <p className="text-sage mb-4 text-[12px] font-semibold tracking-[0.14em] uppercase">
            {siteSettings.name}
          </p>
          <h1 className="text-forest mb-4 font-serif text-[clamp(32px,8.5vw,52px)] leading-[1.06] font-normal">
            Digitalni centar za mentalno zdravlje
          </h1>
          <p className="text-coffee/75 text-[16.5px] leading-[1.65]">
            Psihointegritet povezuje psihoterapiju, savetovanje, edukativne
            sadržaje, radionice i programe ličnog razvoja - online i uživo.
          </p>
        </div>
      </PageHero>
      <div className="mx-auto max-w-[1536px] px-5 pt-[64px] pb-[72px] md:px-8 md:pt-24 md:pb-24">
        <div className="grid items-stretch gap-5 lg:grid-cols-[7fr_5fr]">
          <section className="bg-surface border-coffee/8 flex h-full flex-col rounded-3xl border p-7 md:rounded-[32px] md:p-10">
            <h2 className="text-forest font-serif text-[29px] font-normal">
              Pristup
            </h2>
            <p className="text-coffee/75 mt-4 max-w-[720px] text-[15.5px] leading-[1.65]">
              Rad polazi od poverljivog razgovora, tempa osobe koja se javlja i
              jasnih informacija o uslugama, formatu i sledećem koraku.
            </p>
          </section>
          <aside className="bg-surface border-coffee/8 flex h-full flex-col rounded-3xl border p-7 md:rounded-[32px] md:p-10">
            <h2 className="text-forest font-serif text-[29px] font-normal">
              Gde radimo
            </h2>
            <p className="text-coffee/75 mt-4 mb-4 text-[15px] leading-[1.65]">
              Online rad je dostupan, a susreti uživo se dogovaraju u Nišu i
              Leskovcu.
            </p>
            <Link
              href="/zakazi"
              className="bg-forest text-canvas hover:bg-forest-hover inline-flex min-h-11 items-center self-start rounded-full px-6 text-[14px] font-semibold no-underline transition-colors md:mt-auto"
            >
              Zakaži termin
            </Link>
          </aside>
        </div>
        <section className="bg-surface border-coffee/8 mt-5 rounded-3xl border p-7 md:rounded-[32px] md:p-10">
          <h2 className="text-forest font-serif text-[29px] font-normal">
            Tim
          </h2>
          <p className="text-coffee/75 mt-4 max-w-[720px] text-[15.5px] leading-[1.65]">
            Detaljne biografije, oblasti rada i dostupni formati nalaze se na
            profilima svakog terapeuta.
          </p>
          <Link
            href="/tim"
            className="text-forest hover:text-sage mt-4 inline-flex min-h-11 items-center font-semibold underline underline-offset-4"
          >
            Upoznajte tim
          </Link>
        </section>
      </div>
    </>
  );
}
