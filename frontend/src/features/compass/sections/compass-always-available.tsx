"use client";

import { PublicLink as Link } from "@/components/ui/public-link";

import { CompassQuizLauncher } from "../quiz/compass-quiz-launcher";

/**
 * „Uvek dostupno" — the escape hatches that stay visible on `/kompas`.
 *
 * The design puts „Preskoči pitanja" and „Prikaži preporuke sada" here because
 * its questions render inline on the page. Ours run in the sheet (D-054 flow
 * kept as a drawer), so those two live in the sheet footer where the questions
 * actually are; the bar carries the page-level equivalents instead. What the
 * design asks for — a way out that is never more than one click away, and a
 * route to professional help that Kompas itself never ranks — is unchanged.
 */
export function CompassAlwaysAvailable({
  startingViewId,
}: {
  startingViewId: string;
}) {
  return (
    <section className="pt-3">
      <div className="mx-auto max-w-[1536px] px-5 md:px-8">
        <div className="border-line bg-surface/60 flex flex-wrap items-center gap-x-3.5 gap-y-2 rounded-[18px] border px-[18px] py-3.5">
          <span className="text-coffee/68 text-[11px] tracking-[0.14em] uppercase">
            Uvek dostupno
          </span>

          <CompassQuizLauncher>
            {(open) => (
              <button
                type="button"
                onClick={open}
                className="text-forest hover:text-forest-soft min-h-11 cursor-pointer px-3 py-2.5 text-[13.5px] underline underline-offset-[3px]"
              >
                Pokreni pitanja
              </button>
            )}
          </CompassQuizLauncher>

          <a
            href={`#${startingViewId}`}
            className="text-forest hover:text-forest-soft min-h-11 content-center px-3 py-2.5 text-[13.5px] underline underline-offset-[3px]"
          >
            Vrati se na oblasti
          </a>

          <Link
            href="/kompas/teme"
            className="text-forest hover:text-forest-soft min-h-11 content-center px-3 py-2.5 text-[13.5px] underline underline-offset-[3px]"
          >
            Pogledaj sve teme
          </Link>

          <Link
            href="/pronadji-podrsku"
            className="border-forest text-forest hover:bg-meadow/30 ml-auto inline-flex min-h-11 items-center rounded-full border px-[18px] text-[13.5px] transition-colors"
          >
            Želim stručnu pomoć
          </Link>
        </div>
      </div>
    </section>
  );
}
