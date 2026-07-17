import { Reveal } from "@/components/motion/reveal";
import { TherapistRow } from "@/components/shared/therapist-row";
import { therapists } from "@/content/therapists";

export function TherapistRowsSection() {
  return (
    <section className="pt-12">
      <div className="mx-auto max-w-[1536px] px-5 md:px-8">
        {therapists.map((therapist, index) => (
          <Reveal key={therapist.slug}>
            <TherapistRow
              therapist={therapist}
              flipped={index % 2 === 1}
              priority={index === 0}
            />
          </Reveal>
        ))}
        <div className="border-coffee/10 border-t" />
      </div>
    </section>
  );
}
