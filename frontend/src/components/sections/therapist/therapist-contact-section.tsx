"use client";

import Link from "next/link";

import { Reveal } from "@/components/motion/reveal";
import { Eyebrow } from "@/components/ui/eyebrow";
import { useGuidance } from "@/features/guidance/guidance-context";
import type { Therapist } from "@/types/therapist";

/**
 * Booking CTA strip. Two deliberate departures from the design handoff:
 *
 * - The handoff hard-coded „Online ili uživo u Nišu" on every profile; only Anja
 *   works from Niš — Marija and Marjan are in Leskovac (T8), so the city comes
 *   from the data.
 * - The handoff claimed confidentiality is „Potpuna" (total). Master plan §11
 *   requires public confidentiality statements to reflect real legal exceptions,
 *   so the copy points at the rules instead of overpromising. Final wording is
 *   blocked on legal review (STOP S5).
 */
export function TherapistContactSection({
  therapist,
}: {
  therapist: Therapist;
}) {
  const { openGuidance } = useGuidance();

  return (
    <section id="zakazivanje" className="scroll-mt-24 pt-[72px] md:pt-32">
      <div className="mx-auto max-w-[1536px] px-5 md:px-8">
        <Reveal>
          <div className="bg-warm grid grid-cols-1 gap-10 rounded-[32px] px-7 py-12 md:grid-cols-[7fr_5fr] md:gap-16 md:p-20">
            <div>
              <Eyebrow tone="coffee" className="mb-[18px]">
                Zakazivanje
              </Eyebrow>
              <h2 className="text-coffee mb-[22px] font-serif text-[clamp(28px,7vw,32px)] leading-[1.1] font-normal tracking-[-0.01em] text-pretty md:text-[42px]">
                Zakažite prvi razgovor sa {therapist.firstNameInstrumental}
              </h2>
              <p className="text-coffee/80 mb-9 max-w-[480px] text-[16.5px] leading-[1.68]">
                Prvi razgovor nije obaveza da nastavite terapiju — to je prilika
                da procenite da li vam pristup i način rada odgovaraju.
              </p>
              <div className="flex flex-wrap items-center gap-3.5">
                <Link
                  href="/#usluge"
                  className="bg-coffee text-canvas hover:bg-coffee-hover rounded-full px-7 py-[15px] text-[15px] font-semibold transition-colors"
                >
                  Zakaži termin
                </Link>
                <button
                  type="button"
                  onClick={openGuidance}
                  className="text-coffee cursor-pointer border-0 bg-transparent px-1 py-[13.5px] font-sans text-[15px] font-semibold underline underline-offset-[3px]"
                >
                  Nisam siguran/na, pomozite mi da izaberem
                </button>
              </div>
            </div>
            <div className="border-coffee/18 flex flex-col gap-[22px] md:border-l md:pl-14">
              <div>
                <div className="text-coffee/55 mb-1.5 text-[11.5px] font-semibold tracking-[0.14em] uppercase">
                  Format
                </div>
                <div className="text-coffee font-serif text-[22px]">
                  Online ili uživo u {therapist.cityLocative}
                </div>
              </div>
              <div>
                <div className="text-coffee/55 mb-1.5 text-[11.5px] font-semibold tracking-[0.14em] uppercase">
                  Poverljivost
                </div>
                <div className="text-coffee font-serif text-[22px]">
                  Po etičkom kodeksu geštalt psihoterapije
                </div>
              </div>
              <div>
                <div className="text-coffee/55 mb-1.5 text-[11.5px] font-semibold tracking-[0.14em] uppercase">
                  Kontakt
                </div>
                <Link
                  href="/#kontakt"
                  className="text-coffee hover:text-canvas font-serif text-[22px] transition-colors"
                >
                  Kontakt podaci u podnožju
                </Link>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
