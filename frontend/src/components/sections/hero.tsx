import Image from "next/image";

import { ButtonLink } from "@/components/ui/button-link";
import { BookOpen, BrainCircuit, Ear, Headset, Users } from "lucide-react";

const supportFormats = [
  { label: "Psihoterapija", Icon: BrainCircuit },
  { label: "Savjetovanje", Icon: Ear },
  { label: "Edukacija", Icon: BookOpen },
  { label: "Online", Icon: Headset },
  { label: "Uživo", Icon: Users },
];

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
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.7)_0%,rgba(255,255,255,0.25)_24%,transparent_48%)] md:bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.65)_0%,rgba(255,255,255,0.2)_22%,transparent_42%)]" />
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
            <div className="mt-6 flex flex-wrap items-center gap-3 md:mt-8">
              <ButtonLink href="#podrska" className="w-full py-4 md:w-auto">
                Pomozi mi da pronađem podršku
              </ButtonLink>
              <ButtonLink
                href="#terapeuti"
                variant="outline"
                className="w-full py-4 md:w-auto"
              >
                Upoznaj terapeute
              </ButtonLink>
            </div>
          </div>

          <div className="flex flex-col items-stretch gap-3">
            <div className="bg-surface/80 relative flex h-60 items-center justify-center gap-2 rounded-xl px-4 py-2 shadow-xl shadow-gray-400 backdrop-blur-[10px]">
              <Image
                src="/images/hero.png"
                alt="mentalno zdravlje"
                fill
                priority
                sizes="(max-width: 500px) 100vw, 310px"
                className="rounded-lg object-cover brightness-75"
              />

              <div className="absolute inset-x-2 bottom-3 flex items-start justify-between gap-1 sm:inset-x-4 sm:bottom-4 sm:gap-2">
                {supportFormats.map(({ label, Icon }) => (
                  <div
                    key={label}
                    className="flex min-w-0 flex-1 flex-col items-center gap-1.5 text-center"
                  >
                    <span className="flex h-8 w-8 items-center justify-center rounded-full border border-white/40 bg-gray-200/10 text-white backdrop-blur-[6px] sm:h-11 sm:w-11">
                      <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
                    </span>
                    <span className="text-[8px] leading-none font-medium text-white sm:text-[10px] md:text-[11px]">
                      {label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
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
