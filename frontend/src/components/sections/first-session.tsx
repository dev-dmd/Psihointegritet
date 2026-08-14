import { Reveal } from "@/components/motion/reveal";
import { ButtonLink } from "@/components/ui/button-link";
import { Eyebrow } from "@/components/ui/eyebrow";
import { getFallbackContent } from "@/content/server";
import { getTranslations } from "next-intl/server";

export async function FirstSession() {
  const t = await getTranslations("public.home.firstSession");
  const { firstSessionSteps } = (await getFallbackContent()).homepage;
  return (
    <section id="prvi-razgovor" className="scroll-mt-24 pt-[72px] md:pt-32">
      <div className="mx-auto max-w-[1536px] px-5 md:px-8">
        <Reveal>
          <div className="bg-forest grid grid-cols-1 items-center gap-9 rounded-[32px] px-[26px] py-11 lg:grid-cols-[6fr_5fr] lg:gap-20 lg:px-20 lg:py-[88px]">
            <div>
              <Eyebrow tone="meadow" className="mb-5">
                {t("eyebrow")}
              </Eyebrow>
              <h2 className="text-canvas mb-[26px] font-serif text-[clamp(30px,8.5vw,38px)] leading-[1.08] font-normal tracking-[-0.015em] text-pretty md:text-[50px]">
                {t("title")}
              </h2>
              <p className="text-canvas/75 mb-[34px] max-w-[480px] text-[16.5px] leading-[1.7]">
                {t("description")}
              </p>
              <ButtonLink href="/zakazi?source=homepage" variant="warm">
                {t("action")}
              </ButtonLink>
            </div>
            <div className="flex flex-col">
              {firstSessionSteps.map((step, index) => (
                <div
                  key={step.number}
                  className={`border-canvas/14 flex gap-[22px] border-t pt-[26px] ${
                    index === firstSessionSteps.length - 1
                      ? "pb-0"
                      : "pb-[26px]"
                  }`}
                >
                  <span className="text-meadow shrink-0 font-serif text-[17px] italic">
                    {step.number}
                  </span>
                  <div>
                    <div className="text-canvas mb-1.5 font-serif text-[21px]">
                      {step.title}
                    </div>
                    <div className="text-canvas/65 text-[14.5px] leading-[1.6]">
                      {step.description}
                    </div>
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
