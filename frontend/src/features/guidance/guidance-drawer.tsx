"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { MonogramAvatar } from "@/components/ui/monogram-avatar";
import { therapists } from "@/content/therapists";
import { useCompany } from "@/features/company/company-context";
import { cn } from "@/helpers/cn";

import type { GuidanceEntry } from "./guidance-context";
import {
  MINOR_NOTE,
  SAFETY_NOTICE,
  matchingSteps,
  recommendMatch,
  type MatchResult,
  type MatchingAnswers,
  type TherapistMatch,
} from "./matching";

const progressWidths = ["w-1/5", "w-2/5", "w-3/5", "w-4/5", "w-full"] as const;

type Screen = "chooser" | "quiz" | "result";

interface GuidanceDrawerProps {
  entry: GuidanceEntry;
  onClose: () => void;
}

/**
 * Guided-selection drawer: an optional two-way chooser, then the 5-step
 * matching quiz, then an explainable result. Answers live only in memory —
 * closing the drawer discards everything (T13). No scores, no email gate.
 */
export function GuidanceDrawer({ entry, onClose }: GuidanceDrawerProps) {
  const [screen, setScreen] = useState<Screen>(entry);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<MatchingAnswers>(
    Array.from({ length: matchingSteps.length }, () => null),
  );
  const [result, setResult] = useState<MatchResult | null>(null);
  const [note, setNote] = useState("");
  const advanceTimer = useRef<number | null>(null);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
      if (advanceTimer.current !== null) {
        window.clearTimeout(advanceTimer.current);
      }
    };
  }, [onClose]);

  const currentStep = matchingSteps[step];

  const selectOption = (label: string) => {
    const next = [...answers];
    next[step] = label;
    setAnswers(next);

    // "Rad sa kompanijama" ends the quiz immediately — no point asking a minor's
    // age for a company inquiry (spec: B2B opens its own flow).
    if (step === 0 && label === matchingSteps[0]?.options.at(-1)) {
      setResult(recommendMatch(next));
      setScreen("result");
      return;
    }

    if (step === matchingSteps.length - 1) {
      setResult(recommendMatch(next));
      setScreen("result");
    } else {
      advanceTimer.current = window.setTimeout(() => {
        setStep(step + 1);
      }, 180);
    }
  };

  const goBack = () => {
    if (screen === "result") {
      setResult(null);
      setScreen("quiz");
      return;
    }
    if (step > 0) {
      setStep(step - 1);
    } else if (entry === "chooser") {
      setScreen("chooser");
    }
  };

  const stepLabel =
    screen === "result"
      ? "Vaš predlog"
      : screen === "chooser"
        ? "Zakazivanje termina"
        : `Pitanje ${step + 1} od ${matchingSteps.length}`;

  const canGoBack =
    screen === "result" ||
    (screen === "quiz" && (step > 0 || entry === "chooser"));

  return createPortal(
    <>
      <div
        aria-hidden
        onClick={onClose}
        className="bg-coffee/50 animate-fade-in fixed inset-0 z-[80]"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Vođeni izbor podrške"
        className="bg-canvas shadow-drawer animate-drawer-in fixed top-0 right-0 bottom-0 z-[81] flex w-[min(560px,100vw)] flex-col"
      >
        <div className="border-coffee/10 flex items-center justify-between gap-6 border-b px-6 pt-7 pb-[22px] md:px-10">
          <div className="text-sage text-[13px] font-semibold tracking-[0.12em] uppercase">
            {stepLabel}
          </div>
          <button
            type="button"
            aria-label="Zatvori"
            onClick={onClose}
            className="border-coffee/15 text-coffee hover:bg-meadow/25 flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border bg-transparent text-[17px]"
          >
            ✕
          </button>
        </div>

        {screen === "quiz" ? (
          <div className="bg-coffee/8 h-[3px]">
            <div
              className={cn(
                "bg-sage ease-soft h-full rounded-full transition-all duration-[400ms]",
                progressWidths[step],
              )}
            />
          </div>
        ) : null}

        {screen === "chooser" ? (
          <ChooserScreen onQuiz={() => setScreen("quiz")} onClose={onClose} />
        ) : null}

        {screen === "quiz" && currentStep ? (
          <div className="flex-1 overflow-y-auto px-6 py-9 md:px-10 md:py-11">
            <SafetyNotice />
            <h3 className="text-forest mb-[30px] font-serif text-[28px] leading-[1.12] font-normal tracking-[-0.01em] text-pretty md:text-[34px]">
              {currentStep.question}
            </h3>
            <div className="flex flex-col gap-2.5">
              {currentStep.options.map((option) => {
                const selected = answers[step] === option;
                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() => selectOption(option)}
                    className={cn(
                      "text-coffee hover:border-sage flex cursor-pointer items-center justify-between gap-4 rounded-2xl border-[1.5px] px-[22px] py-[18px] text-left font-sans text-base font-medium transition-all duration-200",
                      selected
                        ? "border-sage bg-meadow/30"
                        : "border-coffee/12 bg-surface",
                    )}
                  >
                    <span>{option}</span>
                    <span aria-hidden className="text-sage text-[15px]">
                      {selected ? "●" : ""}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}

        {screen === "result" && result ? (
          <ResultScreen
            result={result}
            note={note}
            onNoteChange={setNote}
            onClose={onClose}
          />
        ) : null}

        <div className="border-coffee/10 flex items-center justify-between gap-5 border-t px-6 pt-[22px] pb-7 md:px-10">
          {canGoBack ? (
            <button
              type="button"
              onClick={goBack}
              className="text-coffee hover:text-sage inline-flex cursor-pointer items-center gap-2 border-0 bg-transparent py-2 font-sans text-[15px] font-semibold transition-colors duration-200"
            >
              ← Nazad
            </button>
          ) : (
            <span />
          )}
          <Link
            href="/tim"
            onClick={onClose}
            className="text-coffee/60 hover:text-forest text-sm font-medium underline underline-offset-[3px] transition-colors duration-200"
          >
            Pregledaj sve terapeute
          </Link>
        </div>
      </div>
    </>,
    document.body,
  );
}

/** Always-visible, non-diagnostic / not-an-emergency notice above the questions. */
function SafetyNotice() {
  return (
    <div className="bg-warm/20 text-coffee/80 mb-7 rounded-2xl px-5 py-[14px] text-[13.5px] leading-[1.55]">
      {SAFETY_NOTICE}
    </div>
  );
}

/** Two entry paths: guided quiz vs. „I already know who I want". */
function ChooserScreen({
  onQuiz,
  onClose,
}: {
  onQuiz: () => void;
  onClose: () => void;
}) {
  return (
    <div className="flex-1 overflow-y-auto px-6 py-9 md:px-10 md:py-11">
      <h3 className="text-forest mb-2 font-serif text-[28px] leading-[1.12] font-normal text-pretty md:text-[32px]">
        Kako želite da pronađete termin?
      </h3>
      <p className="text-coffee/70 mb-7 text-[15px] leading-[1.6]">
        Izaberite način koji vam više odgovara — oba vode do zakazivanja.
      </p>

      <button
        type="button"
        onClick={onQuiz}
        className="border-coffee/12 bg-surface hover:border-sage mb-3 flex w-full cursor-pointer flex-col gap-1.5 rounded-2xl border-[1.5px] px-[22px] py-[18px] text-left transition-colors duration-200"
      >
        <span className="text-forest font-serif text-xl">
          Pomozite mi da pronađem terapeuta
        </span>
        <span className="text-coffee/65 text-[14px] leading-[1.5]">
          Odgovorite na pet kratkih pitanja i odmah dobijte predlog.
        </span>
      </button>

      <div className="text-sage mt-6 mb-3 text-[12.5px] font-semibold tracking-[0.14em] uppercase">
        Znam kog terapeuta želim
      </div>
      <div className="flex flex-col gap-2.5">
        {therapists.map((therapist) => (
          <Link
            key={therapist.slug}
            href={`/tim/${therapist.slug}`}
            onClick={onClose}
            className="bg-surface border-coffee/8 hover:shadow-row-hover flex items-center gap-4 rounded-[18px] border px-5 py-3.5 no-underline transition-shadow duration-200"
          >
            <MonogramAvatar
              initials={therapist.initials}
              name={therapist.name}
              imageSrc={therapist.image}
              size="sm"
            />
            <span className="min-w-0 flex-1">
              <span className="text-forest block font-serif text-lg">
                {therapist.name}
              </span>
              <span className="text-coffee/60 block truncate text-[13px]">
                {therapist.title}
              </span>
            </span>
            <span aria-hidden className="text-forest text-[15px]">
              →
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}

function ResultScreen({
  result,
  note,
  onNoteChange,
  onClose,
}: {
  result: MatchResult;
  note: string;
  onNoteChange: (value: string) => void;
  onClose: () => void;
}) {
  return (
    <div className="flex-1 overflow-y-auto px-6 py-9 md:px-10 md:py-11">
      {result.kind === "b2b" ? <B2bResult onClose={onClose} /> : null}
      {result.kind === "team" ? <TeamResult onClose={onClose} /> : null}
      {result.kind === "match" ? (
        <MatchResultView result={result} onClose={onClose} />
      ) : null}

      {result.kind !== "b2b" ? (
        <div className="mt-8">
          <label
            htmlFor="guidance-note"
            className="text-coffee/70 mb-2 block text-[14px] font-medium"
          >
            Želite li nešto da dodate svojim rečima?{" "}
            <span className="text-coffee/45">Opciono</span>
          </label>
          <textarea
            id="guidance-note"
            value={note}
            onChange={(event) => onNoteChange(event.target.value)}
            rows={3}
            className="border-coffee/15 bg-surface text-coffee focus:border-sage w-full resize-none rounded-2xl border px-4 py-3 text-[15px] leading-[1.5] outline-none"
            placeholder="Npr. šta vam je trenutno najvažnije."
          />
          <p className="text-coffee/50 mt-2 text-[12.5px] leading-[1.5]">
            Tekst ostaje na vašem uređaju i biće poslat tek uz budući zahtev za
            termin — ne šaljemo ga sada i ne čuvamo ga.
          </p>
        </div>
      ) : null}

      <div className="bg-meadow/25 text-coffee/70 mt-6 rounded-2xl px-5 py-[18px] text-[13.5px] leading-[1.6]">
        Vaši odgovori se ne čuvaju i ne šalju nikome — služe samo da vam
        predložimo odakle da počnete.
      </div>
    </div>
  );
}

function MatchResultView({
  result,
  onClose,
}: {
  result: Extract<MatchResult, { kind: "match" }>;
  onClose: () => void;
}) {
  return (
    <>
      <div className="text-sage mb-3.5 text-[12.5px] font-semibold tracking-[0.16em] uppercase">
        Predlog na osnovu vaših odgovora
      </div>

      <PrimaryMatchCard match={result.primary} onClose={onClose} />

      {result.minorNote ? (
        <p className="text-coffee/70 bg-warm/20 mt-4 rounded-2xl px-4 py-3 text-[13.5px] leading-[1.55]">
          {MINOR_NOTE}
        </p>
      ) : null}

      {result.earliestNote ? (
        <p className="text-coffee/60 mt-3 text-[13px] leading-[1.5]">
          Konkretne termine birate u koraku zakazivanja.
        </p>
      ) : null}

      {result.alternatives.length > 0 ? (
        <>
          <div className="text-sage mt-7 mb-3 text-[12px] font-semibold tracking-[0.14em] uppercase">
            {result.alternatives.length === 1
              ? "Odgovarajuća alternativa"
              : "Odgovarajuće alternative"}
          </div>
          <div className="flex flex-col gap-2.5">
            {result.alternatives.map((match) => (
              <AlternativeCard
                key={match.therapist.slug}
                match={match}
                onClose={onClose}
              />
            ))}
          </div>
        </>
      ) : null}

      <p className="text-coffee/60 mt-6 text-[13.5px] leading-[1.55]">
        Rezultat je objašnjiv predlog; konačan izbor je vaš.
      </p>
    </>
  );
}

function PrimaryMatchCard({
  match,
  onClose,
}: {
  match: TherapistMatch;
  onClose: () => void;
}) {
  const { therapist, reasons } = match;
  return (
    <Link
      href={`/tim/${therapist.slug}`}
      onClick={onClose}
      className="bg-surface border-coffee/8 hover:shadow-row-hover block rounded-[20px] border p-5 no-underline transition-shadow duration-200"
    >
      <div className="flex items-center gap-4">
        <MonogramAvatar
          initials={therapist.initials}
          name={therapist.name}
          imageSrc={therapist.image}
        />
        <div className="min-w-0 flex-1">
          <div className="text-forest font-serif text-xl">{therapist.name}</div>
          <div className="text-coffee/60 text-[13px]">{therapist.formats}</div>
        </div>
        <span aria-hidden className="text-forest text-[15px]">
          →
        </span>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {reasons.map((reason) => (
          <span
            key={reason}
            className="text-coffee bg-meadow/22 border-sage/25 rounded-full border px-3 py-1 text-[12.5px] font-medium"
          >
            {reason}
          </span>
        ))}
      </div>
    </Link>
  );
}

function AlternativeCard({
  match,
  onClose,
}: {
  match: TherapistMatch;
  onClose: () => void;
}) {
  const { therapist } = match;
  return (
    <Link
      href={`/tim/${therapist.slug}`}
      onClick={onClose}
      className="bg-surface border-coffee/8 hover:shadow-row-hover flex items-center gap-4 rounded-[18px] border px-5 py-3.5 no-underline transition-shadow duration-200"
    >
      <MonogramAvatar
        initials={therapist.initials}
        name={therapist.name}
        imageSrc={therapist.image}
        size="sm"
      />
      <span className="min-w-0 flex-1">
        <span className="text-forest block font-serif text-lg">
          {therapist.name}
        </span>
        <span className="text-coffee/60 block truncate text-[13px]">
          {therapist.title}
        </span>
      </span>
      <span aria-hidden className="text-forest text-[15px]">
        →
      </span>
    </Link>
  );
}

/**
 * Unassigned request — the team confirms the best fit. Showcase only for now:
 * the booking form (slot, contact, consent) arrives with the R1.3 backend.
 */
function TeamResult({ onClose }: { onClose: () => void }) {
  return (
    <>
      <div className="text-sage mb-3.5 text-[12.5px] font-semibold tracking-[0.16em] uppercase">
        Predlog na osnovu vaših odgovora
      </div>
      <h3 className="text-forest mb-3 font-serif text-[26px] leading-[1.15] font-normal text-pretty">
        Tim potvrđuje najbolje uklapanje
      </h3>
      <div className="bg-surface border-coffee/8 flex items-center gap-4 rounded-[20px] border p-5">
        <span
          aria-hidden
          className="bg-forest text-canvas flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-full font-serif text-lg"
        >
          PI
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-forest font-serif text-xl">
            Psihointegritet tim
          </div>
          <div className="text-coffee/60 text-[13px]">Nedodeljen zahtev</div>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <span className="text-coffee bg-meadow/22 border-sage/25 rounded-full border px-3 py-1 text-[12.5px] font-medium">
          bez čekanja na email procenu
        </span>
        <span className="text-coffee bg-meadow/22 border-sage/25 rounded-full border px-3 py-1 text-[12.5px] font-medium">
          zahtev ulazi u zajednički red
        </span>
      </div>
      <p className="text-coffee/70 mt-4 text-[14px] leading-[1.6]">
        Tim vidi samo minimalan operativni sažetak dok ovlašćeni terapeut ne
        preuzme zahtev.
      </p>
      <Link
        href="/tim"
        onClick={onClose}
        className="text-forest hover:text-sage mt-5 inline-flex items-center gap-2 text-[15px] font-semibold underline underline-offset-[3px] transition-colors"
      >
        Upoznajte tim <span aria-hidden>→</span>
      </Link>
    </>
  );
}

function B2bResult({ onClose }: { onClose: () => void }) {
  const { openCompany } = useCompany();
  return (
    <>
      <div className="text-sage mb-3.5 text-[12.5px] font-semibold tracking-[0.16em] uppercase">
        Rad sa kompanijama
      </div>
      <h3 className="text-forest mb-3 font-serif text-[26px] leading-[1.15] font-normal text-pretty">
        Program podrške zaposlenima
      </h3>
      <p className="text-coffee/70 mb-6 text-[15px] leading-[1.65]">
        Kreirajte okvirni model podrške prema veličini tima i potrebama
        zaposlenih. Popunjavanje traje oko dva minuta i ne traži zdravstvene
        podatke.
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => {
            onClose();
            openCompany();
          }}
          className="bg-forest text-canvas hover:bg-forest-hover inline-flex cursor-pointer items-center gap-2.5 rounded-full border-0 px-[26px] py-3.5 text-[15px] font-semibold transition-colors"
        >
          Konfigurišite program <span aria-hidden>→</span>
        </button>
        <Link
          href="/rad-sa-kompanijama"
          onClick={onClose}
          className="text-coffee/60 hover:text-forest text-sm font-medium underline underline-offset-[3px] transition-colors"
        >
          Saznajte više
        </Link>
      </div>
    </>
  );
}
