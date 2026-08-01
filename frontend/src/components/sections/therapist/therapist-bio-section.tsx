import Link from "next/link";
import type { Route } from "next";

import { Reveal } from "@/components/motion/reveal";
import { Chip } from "@/components/ui/chip";
import { Eyebrow } from "@/components/ui/eyebrow";
import { buildBookingHref } from "@/features/booking/booking-context";
import type { Therapist } from "@/types/therapist";

/** Full bio, paragraph by paragraph — never truncated (the therapist's own text). */
export function TherapistBioSection({ therapist }: { therapist: Therapist }) {
  return (
    <section className="pt-[72px] md:pt-32">
      <div className="mx-auto max-w-[1536px] px-5 md:px-8">
        <Reveal>
          <div className="grid grid-cols-1 items-start gap-10 md:grid-cols-[5fr_7fr] md:gap-20">
            <div className="md:sticky md:top-[108px]">
              <Eyebrow className="mb-[18px]">Pristup i oblasti rada</Eyebrow>
              <div className="mb-8 flex flex-wrap gap-2">
                {therapist.areas.map((area) => (
                  <Chip key={area} variant="tagOutlined">
                    {area}
                  </Chip>
                ))}
              </div>
              <Link
                href={
                  buildBookingHref({
                    therapist: therapist.slug,
                    source: "therapist",
                  }) as Route
                }
                className="text-forest border-coffee/30 hover:text-sage hover:border-sage inline-flex items-center gap-2.5 border-b-[1.5px] pb-1 text-[15px] font-semibold transition-colors"
              >
                Zakažite termin <span aria-hidden="true">→</span>
              </Link>
            </div>
            <div>
              {therapist.bio.map((paragraph) => (
                <p
                  key={paragraph.slice(0, 48)}
                  className="text-coffee/78 mb-6 text-[17px] leading-[1.78]"
                >
                  {paragraph}
                </p>
              ))}
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
