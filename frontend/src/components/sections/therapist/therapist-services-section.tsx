import Link from "next/link";
import type { Route } from "next";

import { Reveal } from "@/components/motion/reveal";
import { Chip } from "@/components/ui/chip";
import { Eyebrow } from "@/components/ui/eyebrow";
import { formatRsd, PRICE_NOTE, serviceCatalog } from "@/content/services";
import { buildBookingHref } from "@/features/booking/booking-context";
import type { Therapist } from "@/types/therapist";

/** Canonical service data is read from `services.ts`, never duplicated in a profile. */
export function TherapistServicesSection({
  therapist,
}: {
  therapist: Therapist;
}) {
  const services = serviceCatalog.filter((service) =>
    therapist.bookingServiceSlugs.includes(service.slug),
  );

  return (
    <section id="usluge-terapeuta" className="scroll-mt-24 pt-[72px] md:pt-32">
      <div className="mx-auto max-w-[1536px] px-5 md:px-8">
        <Reveal>
          <div className="mb-12 max-w-[640px]">
            <Eyebrow className="mb-4">Usluge</Eyebrow>
            <h2 className="text-forest font-serif text-[clamp(28px,7vw,32px)] leading-[1.08] font-normal tracking-[-0.01em] text-pretty md:text-[42px]">
              Usluge koje pruža {therapist.firstName}
            </h2>
          </div>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {services.map((service) => (
              <article
                key={service.slug}
                className="bg-surface border-coffee/6 flex min-h-[230px] flex-col justify-between gap-[18px] rounded-[20px] border px-[26px] py-7"
              >
                <div>
                  <h3 className="text-forest font-serif text-[22px] leading-[1.2] font-normal">
                    {service.name}
                  </h3>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Chip variant="tag">{service.duration}</Chip>
                    <Chip variant="tag">{formatRsd(service.priceAmount)}</Chip>
                    <Chip variant="tag">{service.format}</Chip>
                  </div>
                </div>
                <div className="flex flex-wrap gap-4">
                  <Link
                    href={`/usluge/${service.slug}`}
                    className="text-forest hover:text-sage text-[14px] font-semibold underline underline-offset-4"
                  >
                    Detalji
                  </Link>
                  <Link
                    href={
                      buildBookingHref({
                        service: service.slug,
                        therapist: therapist.slug,
                        source: "therapist",
                      }) as Route
                    }
                    className="text-forest hover:text-sage text-[14px] font-semibold underline underline-offset-4"
                  >
                    Zakaži termin
                  </Link>
                </div>
              </article>
            ))}
            {therapist.additionalServices.map((service) => (
              <article
                key={service.title}
                className="bg-meadow/22 flex min-h-[230px] flex-col justify-between gap-[18px] rounded-[20px] px-[26px] py-7"
              >
                <div>
                  <p className="text-sage text-[11px] font-semibold tracking-[0.14em] uppercase">
                    Informacije u pripremi
                  </p>
                  <h3 className="text-forest mt-3 font-serif text-[22px] leading-[1.2] font-normal">
                    {service.title}
                  </h3>
                  <p className="text-coffee/65 mt-4 text-[14px] leading-[1.55]">
                    Cena, trajanje i pravila rada se potvrđuju pre objave.
                  </p>
                </div>
                <Link
                  href="/pronadji-podrsku"
                  className="text-forest hover:text-sage text-[14px] font-semibold underline underline-offset-4"
                >
                  Pronađi podršku
                </Link>
              </article>
            ))}
          </div>
          <p className="text-coffee/60 mt-6 max-w-[680px] text-[13.5px] leading-[1.6]">
            {PRICE_NOTE}
          </p>
        </Reveal>
      </div>
    </section>
  );
}
