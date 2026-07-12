import Image from "next/image";

import { ButtonLink } from "@/components/ui/button-link";

export function Hero() {
  return (
    <section id="vrh" className="scroll-mt-24 pt-6">
      <div className="mx-auto max-w-[1536px] px-5 md:px-8">
        <div className="relative h-[380px] overflow-hidden rounded-3xl md:h-[560px] md:rounded-[32px]">
          <Image
            src="/images/hero-section-image-2.png"
            alt=""
            fill
            priority
            sizes="(max-width: 1536px) 100vw, 1472px"
            className="object-cover object-[center_38%]"
          />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(58,46,40,0)_42%,rgba(58,46,40,0.38)_100%)]" />
        </div>
        <div className="bg-surface shadow-hero-card animate-fade-up relative z-[2] mx-2 -mt-[72px] grid grid-cols-1 items-center gap-6 rounded-[28px] px-6 py-7 md:mx-12 md:-mt-40 md:grid-cols-[7fr_5fr] md:gap-16 md:px-16 md:pt-14 md:pb-12">
          <div>
            <div className="text-sage mb-[18px] text-[12.5px] font-semibold tracking-[0.16em] uppercase">
              Digitalni centar za mentalno zdravlje
            </div>
            <h1 className="text-forest mb-[18px] font-serif text-[clamp(28px,8vw,36px)] leading-[1.08] font-normal tracking-[-0.015em] text-pretty md:text-[46px]">
              Stručna podrška za bolje razumijevanje sebe i svojih odnosa.
            </h1>
            <p className="text-coffee/75 max-w-[560px] text-[16.5px] leading-[1.65]">
              Psihointegritet povezuje psihoterapiju, savjetovanje, edukativne
              sadržaje, radionice i programe ličnog razvoja — online i uživo.
            </p>
          </div>
          <div className="flex flex-col items-stretch gap-3">
            <ButtonLink href="#podrska" className="py-4">
              Pomozi mi da pronađem podršku
            </ButtonLink>
            <ButtonLink href="#terapeuti" variant="outline">
              Upoznaj terapeute
            </ButtonLink>
            <div className="border-coffee/8 text-coffee/60 mt-2.5 border-t pt-5 text-center text-sm">
              Već ste klijent?{" "}
              <a
                href="#usluge"
                className="text-forest font-semibold underline underline-offset-[3px]"
              >
                Zakažite naredni termin
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
