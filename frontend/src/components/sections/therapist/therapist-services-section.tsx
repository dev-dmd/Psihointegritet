import { Reveal } from "@/components/motion/reveal";
import { Chip } from "@/components/ui/chip";
import { Eyebrow } from "@/components/ui/eyebrow";
import type { Therapist } from "@/types/therapist";

/**
 * Duration and price render only when the data has them — a service without a
 * confirmed figure shows neither (master plan T7; student/adolescent pricing is
 * still open as STOP S3). Prices are always labelled „okvirne" per T7.
 */
export function TherapistServicesSection({
  therapist,
}: {
  therapist: Therapist;
}) {
  const hasAnyPrice = therapist.services.some(
    (service) => service.price !== null,
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
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {therapist.services.map((service) => (
              <div
                key={service.title}
                className="bg-surface border-coffee/6 flex flex-col justify-between gap-[18px] rounded-[20px] border px-[26px] py-7"
              >
                <h3 className="text-forest font-serif text-[22px] leading-[1.2] font-normal">
                  {service.title}
                </h3>
                <div className="flex flex-wrap gap-2">
                  {service.duration !== null && service.price !== null ? (
                    <>
                      <Chip variant="tag">{service.duration}</Chip>
                      <Chip variant="tag">{service.price}</Chip>
                    </>
                  ) : null}
                  <Chip variant="tag">online ili uživo</Chip>
                </div>
              </div>
            ))}
          </div>
          {hasAnyPrice ? (
            <p className="text-coffee/60 mt-6 text-[13.5px] leading-[1.6]">
              Cene su okvirne. Za usluge bez navedene cene dogovor je
              individualan — javite se i reći ćemo vam tačno.
            </p>
          ) : null}
        </Reveal>
      </div>
    </section>
  );
}
