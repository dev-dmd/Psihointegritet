import { Reveal } from "@/components/motion/reveal";
import { TherapistRow } from "@/components/shared/therapist-row";
import { getFallbackContent } from "@/content/server";
import type { Therapist } from "@/types/therapist";

export async function TherapistRowsSection({
  items,
}: {
  items?: readonly Therapist[];
}) {
  const resolvedItems = items ?? (await getFallbackContent()).therapists;
  return (
    <section className="pt-12">
      <div className="mx-auto max-w-[1536px] px-5 md:px-8">
        {resolvedItems.map((therapist, index) => (
          <Reveal key={therapist.slug}>
            <TherapistRow
              therapist={therapist}
              flipped={index % 2 === 1}
              preload={index === 0}
            />
          </Reveal>
        ))}
        <div className="border-coffee/10 border-t" />
      </div>
    </section>
  );
}
