import { PageHero } from "@/components/shared/page-hero";
import { Eyebrow } from "@/components/ui/eyebrow";
import { getTranslations } from "next-intl/server";

export async function TeamIntroSection() {
  const t = await getTranslations("public.pages.team");
  return (
    <PageHero id="tim">
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
  );
}
