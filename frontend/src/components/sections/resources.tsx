import { Reveal } from "@/components/motion/reveal";
import { ResourceCard } from "@/components/shared/resource-card";
import { ButtonLink } from "@/components/ui/button-link";
import { SectionHeading } from "@/components/ui/section-heading";
import { resources } from "@/content/homepage";

export function Resources() {
  return (
    <section id="resursi" className="scroll-mt-24 pt-[72px] md:pt-32">
      <div className="mx-auto max-w-[1536px] px-5 md:px-8">
        <Reveal>
          <SectionHeading
            eyebrow="Znanje i resursi"
            title="Razumijevanje može biti prvi korak."
            description="Ne morate odmah imati sve odgovore niti biti spremni za psihoterapiju. Stručni tekstovi i vodiči mogu vam pomoći da bolje razumijete ono kroz šta prolazite, prepoznate svoje potrebe i odlučite koji naredni korak vam najviše odgovara."
            className="mb-14 max-w-[680px]"
          />
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {resources.map((article) => (
              <ResourceCard key={article.title} article={article} />
            ))}
          </div>
          <div className="mt-[52px] flex flex-col items-center gap-3.5 text-center">
            <ButtonLink href="#resursi" className="px-[30px]">
              Pogledaj sve sadržaje
            </ButtonLink>
            <div className="text-coffee/60 text-sm">
              Novi tekstovi, vodiči, audio sadržaji i edukativni materijali biće
              dodavani postepeno.
            </div>
            <div className="text-coffee/45 mt-2.5 max-w-[560px] text-[12.5px]">
              Sadržaji imaju edukativnu svrhu i ne predstavljaju dijagnozu niti
              zamjenu za individualni razgovor sa stručnom osobom.
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
