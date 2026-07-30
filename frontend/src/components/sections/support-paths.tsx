import { Reveal } from "@/components/motion/reveal";
import { ArrowLink } from "@/components/ui/arrow-link";
import { ButtonLink } from "@/components/ui/button-link";
import { Eyebrow } from "@/components/ui/eyebrow";

/** Two entry paths: guided selection quiz vs. self-serve browse. */
export function SupportPaths() {
  return (
    <section id="podrska" className="scroll-mt-24 pt-[72px] md:pt-32">
      <div className="mx-auto max-w-[1536px] px-5 md:px-8">
        <Reveal>
          <div className="grid grid-cols-1 items-stretch gap-5 lg:grid-cols-[7fr_5fr]">
            <div className="bg-forest flex flex-col justify-between gap-16 rounded-[28px] p-8 md:p-14">
              <div>
                <Eyebrow tone="meadow" className="mb-4">
                  Vođeni izbor
                </Eyebrow>
                <h3 className="text-canvas mb-4 font-serif text-[32px] leading-[1.1] font-normal tracking-[-0.01em] text-pretty md:text-[40px]">
                  Pomozite mi da suzim izbor
                </h3>
                <p className="text-canvas/72 max-w-[460px] text-base leading-[1.65]">
                  Kroz pet kratkih pitanja dolazite do terapeuta i formata rada
                  koji odgovaraju upravo vama. Bez obaveze, bez unošenja ličnih
                  podataka.
                </p>
              </div>
              <div>
                <ButtonLink href="/pronadji-podrsku" variant="meadow">
                  Započni kratki upitnik
                </ButtonLink>
              </div>
            </div>
            <div className="bg-meadow/32 flex flex-col justify-between gap-16 rounded-[28px] p-8 md:px-12 md:py-14">
              <div>
                <Eyebrow className="mb-4">Samostalni izbor</Eyebrow>
                <h3 className="text-forest mb-4 font-serif text-[28px] leading-[1.12] font-normal tracking-[-0.01em] text-pretty md:text-[32px]">
                  Želim samostalno da upoznam terapeute
                </h3>
                <p className="text-coffee/72 text-[15.5px] leading-[1.65]">
                  Pregledajte profile, pristupe i oblasti rada — pa izaberite
                  osobu koja vam uliva poverenje.
                </p>
              </div>
              <div>
                <ArrowLink href="/tim" tone="underlineStrong">
                  Pregledaj terapeute
                </ArrowLink>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
