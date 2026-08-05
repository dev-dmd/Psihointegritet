"use client";

import type { ArticleCompletionState } from "./article-completion";
import { ArticleChecklist } from "./article-checklist";

/**
 * Step 5 — Pregled i slanje.
 *
 * Shows a summary of what's ready and the primary action: send for review.
 * The §5H-4 PR will add a proper preview (rich text as published, Compass
 * card); this step provides the scroll target and the submit button now so
 * the stepper works end-to-end.
 */
export function ArticleReviewStep({
  completion,
  canSubmit,
  isBusy,
  onSubmit,
}: {
  completion: ArticleCompletionState;
  canSubmit: boolean;
  isBusy: boolean;
  onSubmit: () => void;
}) {
  return (
    <section
      id="compass-step-review"
      className="rounded-panel border-line scroll-mt-24 border px-6 py-5"
    >
      <h2 className="text-forest font-serif text-[17px]">Pregled i slanje</h2>
      <p className="text-ink-55 mt-1 text-[12.5px] leading-[1.55]">
        Pregledajte kako će tekst izgledati posetiocima, a zatim ga pošaljite
        timu na stručni pregled. Pregled teksta u punom obliku biće dostupan u
        sledećoj verziji.
      </p>

      <div className="mt-5">
        <ArticleChecklist state={completion} />
      </div>

      {canSubmit ? (
        <div className="mt-5 flex flex-col gap-3">
          <p className="text-ink-70 text-[13px] leading-[1.55]">
            Tekst je spreman za slanje. Kada pošaljete na stručni pregled, tim
            će moći da pregleda tekst i odobri ga za objavu.
          </p>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              disabled={isBusy}
              onClick={onSubmit}
              className="border-forest bg-forest text-panel-canvas focus-visible:ring-coffee min-h-11 cursor-pointer rounded-full border px-6 text-[13px] font-semibold transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isBusy ? "Slanje…" : "Pošalji na stručni pregled"}
            </button>
          </div>
        </div>
      ) : (
        <div className="border-badge-amber/40 bg-badge-amber-bg rounded-panel mt-5 border px-5 py-4">
          <p className="text-coffee text-[13px] font-semibold">
            Tekst još nije spreman za slanje
          </p>
          <p className="text-ink-70 mt-1 text-[12.5px] leading-[1.55]">
            Rešite označene stavke, a zatim ćete moći da pošaljete tekst na
            pregled.
          </p>
        </div>
      )}
    </section>
  );
}
