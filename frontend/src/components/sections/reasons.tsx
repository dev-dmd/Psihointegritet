import { Reveal } from "@/components/motion/reveal";
import { ReasonCard } from "@/components/shared/reason-card";
import { SectionHeading } from "@/components/ui/section-heading";
import { reasons } from "@/content/homepage";

export function Reasons() {
  return (
    <section id="razlozi" className="scroll-mt-24 pt-[72px] md:pt-32">
      <div className="mx-auto max-w-[1536px] px-5 md:px-8">
        <Reveal>
          <SectionHeading
            eyebrow="Razlozi dolaska"
            title="Od čega želite da počnete?"
            description="Ne postoji „dovoljno velik“ razlog za dolazak. Izaberite temu koja vam je najbliža — to je dovoljno za početak razgovora."
            className="mb-14"
          />
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {reasons.map((reason) => (
              <ReasonCard key={reason.number} reason={reason} />
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
