"use client";

import type { PublicationStatus } from "@/lib/content-governance/types";

import type { ArticleCompletionState } from "./article-completion";
import { ArticleChecklist } from "./article-checklist";

/**
 * Step 5 — Pregled i slanje.
 *
 * Shows a summary of what's ready and the primary action: send for review
 * (draft), pull back to draft (in_review), publish (approved), or a
 * read-only summary for published/archived content (RW-2).
 */
export function ArticleReviewStep({
  completion,
  canSubmit,
  entryStatus,
  isBusy,
  onSubmit,
  onWithdraw,
  onNewDraft,
}: {
  completion: ArticleCompletionState;
  canSubmit: boolean;
  entryStatus: PublicationStatus;
  isBusy: boolean;
  onSubmit: () => void;
  onWithdraw?: () => void;
  onNewDraft?: () => void;
}) {
  const isInReview = entryStatus === "in_review";
  const isApproved = entryStatus === "approved";
  const isPublished = entryStatus === "published";
  const isEditable = entryStatus === "draft" || entryStatus === "approved";

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

      {/* Draft — show submit button */}
      {entryStatus === "draft" && canSubmit ? (
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
      ) : null}

      {/* In review — show withdraw button */}
      {isInReview ? (
        <div className="border-badge-amber/40 bg-badge-amber-bg rounded-panel mt-5 border px-5 py-4">
          <p className="text-coffee text-[13px] font-semibold">
            Tekst je poslat na stručni pregled
          </p>
          <p className="text-ink-70 mt-1 text-[12.5px] leading-[1.55]">
            Tim pregleda tekst. Ako želite da ga menjate, prvo ga povucite na
            doradu.
          </p>
          {onWithdraw ? (
            <button
              type="button"
              disabled={isBusy}
              onClick={onWithdraw}
              className="border-coffee text-coffee hover:bg-coffee/8 mt-3 min-h-11 cursor-pointer rounded-full border px-4 text-[12.5px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isBusy ? "Povlačenje…" : "Povuci na doradu"}
            </button>
          ) : null}
        </div>
      ) : null}

      {/* Approved — ready to publish */}
      {isApproved ? (
        <div className="border-badge-ok/40 bg-badge-ok-bg rounded-panel mt-5 border px-5 py-4">
          <p className="text-forest text-[13px] font-semibold">
            Tekst je odobren za objavu
          </p>
          <p className="text-ink-70 mt-1 text-[12.5px] leading-[1.55]">
            Sva potrebna odobrenja su data. Možete ga objaviti ili napraviti
            novu radnu verziju za izmene.
          </p>
          {onNewDraft ? (
            <button
              type="button"
              disabled={isBusy}
              onClick={onNewDraft}
              className="border-forest text-forest hover:bg-forest/8 mt-3 min-h-11 cursor-pointer rounded-full border px-4 text-[12.5px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isBusy ? "Kreiranje…" : "Napravi novu radnu verziju"}
            </button>
          ) : null}
        </div>
      ) : null}

      {/* Published — read-only */}
      {isPublished ? (
        <div className="border-badge-ok/40 bg-badge-ok-bg rounded-panel mt-5 border px-5 py-4">
          <p className="text-forest text-[13px] font-semibold">
            Tekst je objavljen i vidljiv posetiocima
          </p>
          <p className="text-ink-70 mt-1 text-[12.5px] leading-[1.55]">
            Uredite novu verziju da biste ga ažurirali. Stara verzija ostaje
            javna dok nova ne bude objavljena.
          </p>
          {onNewDraft ? (
            <button
              type="button"
              disabled={isBusy}
              onClick={onNewDraft}
              className="border-forest text-forest hover:bg-forest/8 mt-3 min-h-11 cursor-pointer rounded-full border px-4 text-[12.5px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isBusy ? "Kreiranje…" : "Uredi novu verziju"}
            </button>
          ) : null}
        </div>
      ) : null}

      {/* Draft but incomplete */}
      {entryStatus === "draft" && !canSubmit ? (
        <div className="border-badge-amber/40 bg-badge-amber-bg rounded-panel mt-5 border px-5 py-4">
          <p className="text-coffee text-[13px] font-semibold">
            Tekst još nije spreman za slanje
          </p>
          <p className="text-ink-70 mt-1 text-[12.5px] leading-[1.55]">
            Rešite označene stavke, a zatim ćete moći da pošaljete tekst na
            pregled.
          </p>
        </div>
      ) : null}
    </section>
  );
}
