import { Reveal } from "@/components/motion/reveal";
import { ButtonLink } from "@/components/ui/button-link";
import { Eyebrow } from "@/components/ui/eyebrow";

export function FinalCta() {
  return (
    <section
      id="onama"
      className="scroll-mt-24 px-0 pt-[88px] pb-20 md:pt-[148px] md:pb-32"
    >
      <div className="mx-auto max-w-[1536px] px-5 text-center md:px-8">
        <Reveal>
          <div className="mx-auto max-w-[760px]">
            <Eyebrow className="mb-5">Psihointegritet</Eyebrow>
            <h2 className="text-forest mb-[22px] font-serif text-[clamp(30px,8.5vw,38px)] leading-[1.05] font-normal tracking-[-0.018em] text-pretty md:text-6xl">
              Ne morate unaprijed znati odakle da počnete.
            </h2>
            <p className="text-coffee/72 mb-10 text-[17px] leading-[1.65]">
              Dovoljan je jedan korak — a mi ćemo vam pomoći da pronađete pravi.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3.5">
              <ButtonLink href="#podrska" size="lg">
                Pronađi podršku
              </ButtonLink>
              <ButtonLink href="#terapeuti" variant="outline" size="lg">
                Pregledaj terapeute
              </ButtonLink>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
