import Image from "next/image";
import Link from "next/link";

import { Chip } from "@/components/ui/chip";
import type { Therapist } from "@/types/therapist";

export function TherapistHeroSection({ therapist }: { therapist: Therapist }) {
  return (
    <section id="profil" className="scroll-mt-24 pt-[120px] md:pt-44">
      <div className="mx-auto max-w-[1536px] px-5 md:px-8">
        <Link
          href="/tim"
          className="text-coffee/60 hover:text-forest mb-11 inline-flex items-center gap-2 text-sm font-semibold transition-colors"
        >
          <span aria-hidden="true">←</span> Svi terapeuti
        </Link>
        <div className="grid grid-cols-1 items-center gap-9 md:grid-cols-[5fr_7fr] md:gap-[72px]">
          <div className="bg-meadow/30 relative aspect-4/5 overflow-hidden rounded-[28px]">
            <Image
              src={therapist.image}
              alt={therapist.name}
              fill
              priority
              sizes="(min-width: 768px) 42vw, 100vw"
              className="object-cover"
            />
          </div>
          <div>
            <Chip variant="label" className="mb-[22px]">
              {therapist.badge}
            </Chip>
            <h1 className="text-forest mb-3 font-serif text-[clamp(30px,8.5vw,40px)] leading-[1.06] font-normal tracking-[-0.015em] text-pretty md:text-[52px]">
              {therapist.name}
            </h1>
            <div className="text-coffee/62 mb-6 text-[15px] font-semibold">
              {therapist.title}
            </div>
            <p className="text-coffee/82 mb-7 max-w-[560px] font-serif text-[21px] leading-[1.5] italic">
              „{therapist.quote}“
            </p>
            <div className="mb-8">
              <div className="text-sage mb-2 text-[11.5px] font-semibold tracking-[0.14em] uppercase">
                Formati rada
              </div>
              <div className="text-coffee/75 text-[15px] leading-[1.6]">
                {therapist.formats}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3.5">
              <Link
                href="#zakazivanje"
                className="bg-forest text-canvas hover:bg-forest-hover rounded-full px-7 py-[15px] text-[15px] font-semibold transition-colors"
              >
                Zakaži termin
              </Link>
              <Link
                href="#usluge-terapeuta"
                className="border-coffee/25 text-coffee hover:border-sage hover:bg-meadow/15 rounded-full border-[1.5px] px-[26px] py-[13.5px] text-[15px] font-semibold transition-colors"
              >
                Pogledaj usluge
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
