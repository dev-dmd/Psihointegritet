import { Reveal } from "@/components/motion/reveal";
import { Accordion } from "@/components/ui/accordion";
import { ArrowLink } from "@/components/ui/arrow-link";
import { SectionHeading } from "@/components/ui/section-heading";
import { getFallbackContent } from "@/content/server";
import { getTranslations } from "next-intl/server";

export async function Faq() {
  const t = await getTranslations("public.home.faq");
  const { faqItems } = (await getFallbackContent()).homepage;
  return (
    <section id="faq" className="scroll-mt-24 pt-[72px] md:pt-32">
      <div className="mx-auto max-w-[1536px] px-5 md:px-8">
        <Reveal>
          <div className="grid grid-cols-1 items-start gap-10 lg:grid-cols-[5fr_7fr] lg:gap-20">
            <div className="lg:sticky lg:top-[108px]">
              <SectionHeading
                eyebrow={t("eyebrow")}
                title={t("title")}
                description={
                  <span className="block max-w-[400px]">
                    {t("description")}
                  </span>
                }
                className="mb-7"
              />
              <ArrowLink href="#kontakt" tone="underline">
                {t("contact")}
              </ArrowLink>
            </div>
            <Accordion
              items={faqItems}
              defaultOpenId={faqItems[0]?.id ?? null}
            />
          </div>
        </Reveal>
      </div>
    </section>
  );
}
