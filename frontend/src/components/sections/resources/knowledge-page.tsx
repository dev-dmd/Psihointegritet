import { Reveal } from "@/components/motion/reveal";
import { PageHero } from "@/components/shared/page-hero";
import { Chip } from "@/components/ui/chip";
import { Eyebrow } from "@/components/ui/eyebrow";
import { getFallbackContent } from "@/content/server";
import { getTranslations } from "next-intl/server";

/**
 * /znanje — resource listing. The three planned articles are shown as „u
 * pripremi" only: no read links, no fake published content (master plan
 * R1.1). Real articles ship with the R3 Content Engine.
 */
export async function KnowledgePage() {
  const t = await getTranslations("public.pages.knowledge");
  const { resources } = (await getFallbackContent()).homepage;
  return (
    <>
      <PageHero id="resursi">
        <div className="max-w-[680px]">
          <Eyebrow className="mb-4">{t("eyebrow")}</Eyebrow>
          <h1 className="text-forest mb-[18px] font-serif text-[clamp(30px,8.5vw,40px)] leading-[1.06] font-normal tracking-[-0.015em] text-pretty md:text-[52px]">
            {t("title")}
          </h1>
          <p className="text-coffee/72 text-[16.5px] leading-[1.65]">
            {t("intro")}
          </p>
        </div>
      </PageHero>

      <section className="pt-[72px] md:pt-24">
        <div className="mx-auto max-w-[1536px] px-5 md:px-8">
          <Reveal>
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
              {resources.map((article) => (
                <article
                  key={article.title}
                  className="bg-surface border-coffee/6 flex flex-col gap-5 rounded-3xl border px-8 pt-[34px] pb-[30px]"
                >
                  <div className="flex items-center justify-between gap-3">
                    <Chip variant="labelWarm">{article.category}</Chip>
                    <span className="text-coffee/45 text-[11.5px] font-semibold tracking-[0.12em] uppercase">
                      {t("preparing")}
                    </span>
                  </div>
                  <h2 className="text-forest font-serif text-[26px] leading-[1.2] font-normal text-pretty">
                    {article.title}
                  </h2>
                  <p className="text-coffee/68 grow text-[14.5px] leading-[1.62]">
                    {article.description}
                  </p>
                </article>
              ))}
            </div>
            <p className="text-coffee/45 my-8 max-w-[560px] text-[12.5px] leading-[1.6]">
              {t("disclaimer")}
            </p>
          </Reveal>
        </div>
      </section>
    </>
  );
}
