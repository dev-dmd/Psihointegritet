import Link from "next/link";
import type { Route } from "next";

import { Reveal } from "@/components/motion/reveal";
import { Eyebrow } from "@/components/ui/eyebrow";
import { buildBookingHref } from "@/features/booking/booking-context";
import type { Therapist } from "@/types/therapist";

/** Route-level booking CTA for a therapist; the form itself lives at `/zakazi`. */
export function TherapistContactSection({
  therapist,
}: {
  therapist: Therapist;
}) {
  return (
    <section
      id="zakazivanje"
      className="scroll-mt-24 pt-[72px] pb-[72px] md:pt-32 md:pb-24"
    >
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
              <p className="text-coffee/80 mb-7 max-w-[520px] text-[16.5px] leading-[1.68]">
                Prvi razgovor nije obaveza da nastavite terapiju. Pošaljite
                zahtev, a dostupnost se potvrđuje nakon provere.
              </p>
              <div className="flex flex-wrap gap-3">
                <Link
                  href={
                    buildBookingHref({
                      therapist: therapist.slug,
                      source: "therapist",
                    }) as Route
                  }
                  className="bg-coffee text-canvas hover:bg-coffee-hover inline-flex min-h-11 items-center rounded-full px-7 text-[15px] font-semibold no-underline transition-colors"
                >
                  Zakaži termin
                </Link>
                <Link
                  href="/pronadji-podrsku"
                  className="border-coffee/25 text-coffee hover:border-sage inline-flex min-h-11 items-center rounded-full border px-6 text-[15px] font-semibold no-underline transition-colors"
                >
                  Nisam siguran/na
                </Link>
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
                  Kontakt
                </div>
                <Link
                  href="/kontakt"
                  className="text-coffee hover:text-canvas font-serif text-[22px] transition-colors"
                >
                  Opšti kontakt
                </Link>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
