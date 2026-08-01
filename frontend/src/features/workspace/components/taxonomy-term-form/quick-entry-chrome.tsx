"use client";

import type { TaxonomyTerm } from "../../taxonomy-api";

export const QUICK_ENTRY_STEPS = [
  "Nova vrednost registra",
  "Identitet",
  "Organizacija",
  "Početni sadržaj i povezivanje",
  "Javna ruta",
  "Pregled",
] as const;

export type QuickEntryStep = 0 | 1 | 2 | 3 | 4 | 5;

export function QuickEntryLauncher({
  inProgressLabel,
  resumableTerms,
  resumeTermId,
  onResumeTermIdChange,
  onContinue,
  onResumeSelected,
  onStartNew,
}: {
  inProgressLabel: string | null;
  resumableTerms: TaxonomyTerm[];
  resumeTermId: string;
  onResumeTermIdChange: (termId: string) => void;
  onContinue: () => void;
  onResumeSelected: () => void;
  onStartNew: () => void;
}) {
  return (
    <section className="bg-forest border-meadow/65 rounded-panel mb-6 border px-5 py-5 md:px-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="text-meadow text-[10.5px] font-semibold tracking-[0.12em] uppercase">
            Vođeni unos
          </div>
          <h2 className="text-meadow mt-1 font-serif text-[23px]">Brzi unos</h2>
          <p className="text-meadow/80 mt-1 max-w-[720px] text-[13px] leading-[1.5]">
            Napravite radnu verziju, uredite mapiranje, potvrdite javnu putanju
            i nastavite isti lifecycle bez paralelnog registra.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {inProgressLabel ? (
            <button
              type="button"
              onClick={onContinue}
              className="bg-meadow text-forest hover:bg-meadow-hover cursor-pointer rounded-full border-0 px-4 py-2.5 text-[13px] font-semibold"
            >
              Nastavi: {inProgressLabel}
            </button>
          ) : null}
          <button
            type="button"
            onClick={onStartNew}
            className="bg-meadow text-forest hover:bg-meadow-hover cursor-pointer rounded-full border-0 px-4 py-2.5 text-[13px] font-semibold"
          >
            Novi brzi unos
          </button>
        </div>
      </div>

      {resumableTerms.length > 0 ? (
        <div className="border-meadow/25 mt-4 flex flex-wrap items-end gap-2 border-t pt-4">
          <div className="min-w-[240px] flex-1">
            <label
              htmlFor="quick-entry-resume"
              className="text-meadow mb-1.5 block text-[12px] font-semibold"
            >
              Nastavi postojeću radnu verziju
            </label>
            <select
              id="quick-entry-resume"
              value={resumeTermId}
              onChange={(event) => onResumeTermIdChange(event.target.value)}
              className="border-meadow/50 rounded-tile bg-meadow text-forest focus:border-sage w-full border px-3 py-2 text-[12.5px] outline-none"
            >
              <option value="">Izaberite sačuvani draft</option>
              {resumableTerms.map((term) => (
                <option key={term.termId} value={term.termId}>
                  {term.publicLabel} · {term.stableId}
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            disabled={!resumeTermId}
            onClick={onResumeSelected}
            className="bg-meadow text-forest hover:bg-meadow-hover cursor-pointer rounded-full border-0 px-4 py-2 text-[12.5px] font-semibold disabled:cursor-not-allowed disabled:opacity-50"
          >
            Otvori draft
          </button>
        </div>
      ) : null}
    </section>
  );
}

export function QuickEntryHeader({
  step,
  onExit,
}: {
  step: QuickEntryStep;
  onExit: () => void;
}) {
  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-ink-45 text-[10.5px] font-semibold tracking-[0.12em] uppercase">
            Brzi unos · korak {step + 1} od {QUICK_ENTRY_STEPS.length}
          </div>
          <h2 className="text-forest mt-1 font-serif text-[23px]">
            {QUICK_ENTRY_STEPS[step]}
          </h2>
        </div>
        <button
          type="button"
          onClick={onExit}
          className="border-line-strong text-ink-70 hover:border-coffee/40 cursor-pointer rounded-full border bg-transparent px-3.5 py-2 text-[12px] font-semibold"
        >
          Zatvori
        </button>
      </div>
      <ol
        className="mt-4 flex flex-wrap gap-1.5"
        aria-label="Koraci brzog unosa"
      >
        {QUICK_ENTRY_STEPS.map((label, index) => (
          <li
            key={label}
            aria-current={index === step ? "step" : undefined}
            className={`rounded-full px-2.5 py-1 text-[10.5px] font-semibold ${
              index === step
                ? "bg-forest text-panel-canvas"
                : index < step
                  ? "bg-sage/20 text-forest"
                  : "bg-panel-canvas text-ink-45"
            }`}
          >
            {index + 1}
          </li>
        ))}
      </ol>
    </>
  );
}

export function QuickEntrySaveActions({
  busy,
  onBack,
  onContinue,
  onExit,
  continueLabel = "Sačuvaj i nastavi",
  continueDisabled = false,
  exitDisabled = false,
}: {
  busy: boolean;
  onBack: () => void;
  onContinue: () => void;
  onExit: () => void;
  continueLabel?: string;
  continueDisabled?: boolean;
  exitDisabled?: boolean;
}) {
  return (
    <div className="border-line mt-5 flex flex-wrap gap-2.5 border-t pt-4">
      <button
        type="button"
        disabled={busy || continueDisabled}
        onClick={onContinue}
        className="bg-forest text-panel-canvas hover:bg-forest-hover cursor-pointer rounded-full border-0 px-5 py-2.5 text-[13px] font-semibold disabled:cursor-not-allowed disabled:opacity-50"
      >
        {busy ? "Čuvanje…" : continueLabel}
      </button>
      <button
        type="button"
        disabled={busy || exitDisabled}
        onClick={onExit}
        className="border-line-strong text-ink-70 hover:border-coffee/40 cursor-pointer rounded-full border bg-transparent px-5 py-2.5 text-[13px] font-semibold disabled:cursor-not-allowed disabled:opacity-50"
      >
        Sačuvaj i izađi
      </button>
      <button
        type="button"
        disabled={busy}
        onClick={onBack}
        className="text-ink-55 hover:text-coffee cursor-pointer border-0 bg-transparent px-3 py-2.5 text-[12.5px] font-semibold disabled:opacity-50"
      >
        Nazad
      </button>
    </div>
  );
}
