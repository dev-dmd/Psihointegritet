import { Reveal } from "@/components/motion/reveal";
import { ButtonLink } from "@/components/ui/button-link";
import { Eyebrow } from "@/components/ui/eyebrow";
import { workshopFacts } from "@/content/homepage";

export function Workshop() {
  return (
    <section id="radionice" className="scroll-mt-24 pt-[72px] md:pt-32">
      <div className="mx-auto max-w-[1536px] px-5 md:px-8">
        <Reveal>
          <div className="bg-warm grid grid-cols-1 gap-9 rounded-[32px] px-[26px] py-11 lg:grid-cols-[7fr_4fr] lg:gap-[72px] lg:p-20">
            <div>
              <Eyebrow tone="coffee" className="mb-[18px]">
                Radionice · Primer radionice
              </Eyebrow>
              <h2 className="text-coffee mb-[22px] font-serif text-[clamp(30px,8.5vw,38px)] leading-[1.07] font-normal tracking-[-0.015em] text-pretty md:text-5xl">
                Upoznaj sebe kroz geštalt iskustvo
              </h2>
              <p className="text-coffee/82 mb-4 max-w-[560px] text-[16.5px] leading-[1.68]">
                Iskustvena radionica namenjena svima koji žele razvijati
                svesnost o sebi, svojim emocijama i obrascima ponašanja.
              </p>
              <p className="text-coffee/82 mb-9 max-w-[560px] text-[16.5px] leading-[1.68]">
                Kroz grupni rad, iskustvene vežbe i geštalt eksperimente
                učesnici imaju priliku bolje razumeti sebe, unaprediti kontakt
                sa drugima i istražiti nove načine reagovanja u svakodnevnim
                situacijama.
              </p>
              <div className="flex flex-wrap items-center gap-3.5">
                <ButtonLink href="#kontakt" variant="coffee">
                  Prijavite interesovanje
                </ButtonLink>
                <span className="text-coffee/60 text-sm font-medium">
                  Detalji uskoro
                </span>
              </div>
            </div>
            <div className="border-coffee/18 flex flex-col justify-center border-t pt-4 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-14">
              {workshopFacts.map((fact, index) => (
                <div
                  key={fact.label}
                  className={`py-[22px] ${
                    index < workshopFacts.length - 1
                      ? "border-coffee/14 border-b"
                      : ""
                  }`}
                >
                  <div className="text-coffee/55 mb-1.5 text-[11.5px] font-semibold tracking-[0.14em] uppercase">
                    {fact.label}
                  </div>
                  <div className="text-coffee font-serif text-[26px]">
                    {fact.value}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
