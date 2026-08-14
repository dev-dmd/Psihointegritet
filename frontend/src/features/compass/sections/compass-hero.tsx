"use client";

import { Eyebrow } from "@/components/ui/eyebrow";
import { useTranslations } from "next-intl";

import { CompassQuizLauncher } from "../quiz/compass-quiz-launcher";

/** Three reassurances under the hero rule, as three separate claims. */
const HERO_NOTES = ["short", "account", "stop"] as const;

/**
 * `/kompas` hero.
 *
 * The image slot stays deliberately empty — the Kompas hero illustration is
 * entered later through the panel (design handoff §0), so nothing is invented
 * here in the meantime.
 */
export function CompassHero({ areasHref }: { areasHref: string }) {
  const t = useTranslations("public.compass.hero");
  return (
    <section className="scroll-mt-24 pt-[104px] pb-8 md:pt-32">
      <div className="mx-auto max-w-[1536px] px-5 md:px-8">
        <div className="rounded-modal bg-surface shadow-hero-card relative overflow-hidden px-6 py-10 md:px-12 md:py-14">
          <div className="relative max-w-[46ch]">
            <Eyebrow tone="sage">{t("eyebrow")}</Eyebrow>

            <h1 className="text-forest mt-4 font-serif text-[clamp(32px,6vw,58px)] leading-[1.06] font-normal text-pretty">
              {t("title")}
            </h1>

            <p className="text-coffee/75 mt-5 text-[15.5px] leading-[1.72] text-pretty">
              {t("body")}
            </p>

            <p className="text-coffee/70 mt-3.5 text-[13px] leading-[1.6]">
              {t("disclaimer")}
            </p>

            <div className="mt-6 flex flex-wrap gap-2.5">
              <CompassQuizLauncher>
                {(open) => (
                  <button
                    type="button"
                    onClick={open}
                    className="bg-forest text-canvas hover:bg-forest-hover inline-flex min-h-12 cursor-pointer items-center gap-2.5 rounded-full px-6 text-[15px] font-semibold transition-colors"
                  >
                    {t("start")}
                    <span aria-hidden>→</span>
                  </button>
                )}
              </CompassQuizLauncher>
              <a
                href={areasHref}
                className="border-line-strong text-forest hover:border-coffee/35 inline-flex min-h-12 items-center gap-2.5 rounded-full border px-6 text-[15px] font-semibold transition-colors"
              >
                {t("skip")}
                <span aria-hidden>↓</span>
              </a>
            </div>
          </div>

          <ul className="border-line relative mt-[30px] grid [grid-template-columns:repeat(auto-fit,minmax(210px,1fr))] gap-2.5 border-t pt-[22px]">
            {HERO_NOTES.map((note) => (
              <li
                key={note}
                className="text-coffee/70 text-[13px] leading-[1.55]"
              >
                <strong className="text-forest font-medium">
                  {t(`notes.${note}Lead`)}
                </strong>{" "}
                {t(`notes.${note}Rest`)}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
