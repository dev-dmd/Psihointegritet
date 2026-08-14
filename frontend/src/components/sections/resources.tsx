import { Reveal } from "@/components/motion/reveal";
import { ResourceCard } from "@/components/shared/resource-card";
import { ButtonLink } from "@/components/ui/button-link";
import { SectionHeading } from "@/components/ui/section-heading";
import { getFallbackContent } from "@/content/server";
import { getTranslations } from "next-intl/server";

export async function Resources() {
  const t = await getTranslations("public.home.resources");
  const { resources } = (await getFallbackContent()).homepage;
  return (
    <section id="resursi" className="scroll-mt-24 pt-[72px] md:pt-32">
      <div className="mx-auto max-w-[1536px] px-5 md:px-8">
        <Reveal>
          <SectionHeading
            eyebrow={t("eyebrow")}
            title={t("title")}
            description={t("description")}
            className="mb-14 max-w-[680px]"
          />
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {resources.map((article) => (
              <ResourceCard
                key={article.title}
                article={article}
                readLabel={t("read")}
              />
            ))}
          </div>
          <div className="mt-[52px] flex flex-col items-center gap-3.5 text-center">
            <ButtonLink href="#resursi" className="px-[30px]">
              {t("all")}
            </ButtonLink>
            <div className="text-coffee/60 text-sm">{t("upcoming")}</div>
            <div className="text-coffee/45 mt-2.5 max-w-[560px] text-[12.5px]">
              {t("disclaimer")}
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
