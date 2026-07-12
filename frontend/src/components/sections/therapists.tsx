import { Reveal } from "@/components/motion/reveal";
import { TherapistCard } from "@/components/shared/therapist-card";
import { ArrowLink } from "@/components/ui/arrow-link";
import { SectionHeading } from "@/components/ui/section-heading";
import { therapists } from "@/content/homepage";

export function Therapists() {
  return (
    <section id="terapeuti" className="scroll-mt-24 pt-[72px] md:pt-32">
      <div className="mx-auto max-w-[1536px] px-5 md:px-8">
        <Reveal>
          <div className="mb-14 flex flex-wrap items-end justify-between gap-10">
            <SectionHeading
              eyebrow="Naš tim"
              title="Upoznajte terapeute Psihointegriteta"
              description="Pronađite osobu i način rada koji vam ulivaju povjerenje."
            />
            <ArrowLink
              href="#podrska"
              tone="underline"
              className="whitespace-nowrap"
            >
              Pomozite mi da izaberem
            </ArrowLink>
          </div>
          <div className="grid grid-cols-1 items-stretch gap-5 md:grid-cols-2 lg:grid-cols-3">
            {therapists.map((therapist) => (
              <TherapistCard key={therapist.id} therapist={therapist} />
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
