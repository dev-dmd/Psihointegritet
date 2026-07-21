"use client";

import { Reveal } from "@/components/motion/reveal";
import { useGuidance } from "@/features/guidance/guidance-context";

/** „Niste sigurni koga da izaberete?" — opens the shared guided-selection drawer. */
export function TeamCtaSection() {
  const { openQuiz } = useGuidance();

  return (
    <section className="pt-[72px] pb-[72px] md:pt-24 md:pb-24">
      <div className="mx-auto max-w-[1536px] px-5 md:px-8">
        <Reveal>
          <div className="bg-meadow/32 flex flex-col items-start justify-between gap-10 rounded-[28px] px-7 py-10 md:flex-row md:flex-wrap md:items-center md:px-16 md:py-14">
            <div>
              <h2 className="text-forest mb-2 font-serif text-[30px] leading-tight font-normal">
                Niste sigurni koga da izaberete?
              </h2>
              <p className="text-coffee/70 max-w-[440px] text-[15.5px] leading-[1.6]">
                Kroz pet kratkih pitanja predložićemo terapeuta koji najbliže
                odgovara onome što tražite.
              </p>
            </div>
            <button
              type="button"
              onClick={openQuiz}
              className="bg-forest text-canvas hover:bg-forest-hover cursor-pointer rounded-full border-0 px-7 py-[15px] font-sans text-[15px] font-semibold whitespace-nowrap transition-colors"
            >
              Pomozi mi da izaberem
            </button>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
