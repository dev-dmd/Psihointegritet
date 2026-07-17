import Image from "next/image";
import Link from "next/link";

import { ButtonLink } from "@/components/ui/button-link";
import {
  GuidanceCtaButton,
  GuidanceCtaText,
} from "@/features/guidance/guidance-cta";
import { clientLink, companies } from "@/content/homepage";

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
              {/* Hero visitors usually aren't sure who fits — start the quiz directly. */}
              <GuidanceCtaButton entry="quiz" className="w-full py-4 md:w-auto">
                Pomozi mi da pronađem podršku
              </GuidanceCtaButton>
              <ButtonLink
                href="/tim"
                variant="outline"
                className="w-full py-4 md:w-auto"
              >
                Upoznaj terapeute
              </ButtonLink>
            </div>
          </div>

          <div className="mt-9 flex flex-col gap-7 self-stretch">
            <Link
              href="/rad-sa-kompanijama"
              className="border-warm/45 bg-warm/15 hover:border-warm hover:bg-warm/25 block rounded-[20px] border px-7 pt-[26px] pb-6 no-underline transition-colors duration-200"
            >
              <p className="text-coffee/55 mb-2.5 text-[11.5px] font-semibold tracking-[0.14em] uppercase">
                {companies.eyebrow}
              </p>
              <p className="text-coffee mb-2 font-serif text-2xl leading-tight">
                {companies.title}
              </p>
              <p className="text-coffee/70 mb-3.5 text-sm leading-relaxed">
                {companies.description}
              </p>
              <span className="text-coffee inline-flex items-center gap-2 text-sm font-semibold">
                {companies.action.label} <span aria-hidden>→</span>
              </span>
            </Link>

            <p className="text-coffee/60 mt-auto mb-3.5 text-center text-sm">
              {clientLink.prefix}{" "}
              {/* Returning clients already know who they see — open the chooser
                  in „I know who I want" mode, no quiz. */}
              <GuidanceCtaText>{clientLink.label}</GuidanceCtaText>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
