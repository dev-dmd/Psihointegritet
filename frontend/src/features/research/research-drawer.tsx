"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import {
  ONLINE_EXPERIENCE_SURVEY_ID,
  surveyIntro,
  surveySteps,
  type SurveyAnswers,
} from "@/content/survey";
import { cn } from "@/helpers/cn";

const progressWidths = ["w-1/4", "w-2/4", "w-3/4", "w-full"] as const;

type Screen = "intro" | "questions" | "review" | "done";

interface ResearchDrawerProps {
  onClose: () => void;
}

/**
 * Research survey drawer — mirrors the guided-selection drawer's look but is a
 * separate module (spec §17). Answers live only in memory until the user taps
 * „Pošalji", which sends them by email via /api/survey. „Možda kasnije" closes
 * and discards. Anonymous, no health data.
 */
export function ResearchDrawer({ onClose }: ResearchDrawerProps) {
  const [screen, setScreen] = useState<Screen>("intro");
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<SurveyAnswers>(
    Array.from({ length: surveySteps.length }, () => null),
  );
  const [note, setNote] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
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

  const currentStep = surveySteps[step];

  const selectOption = (label: string) => {
    const next = [...answers];
    next[step] = label;
    setAnswers(next);
    if (step === surveySteps.length - 1) {
      advanceTimer.current = window.setTimeout(() => setScreen("review"), 180);
    } else {
      advanceTimer.current = window.setTimeout(() => setStep(step + 1), 180);
    }
  };

  const goBack = () => {
    if (screen === "review") {
      setScreen("questions");
      return;
    }
    if (step > 0) {
      setStep(step - 1);
    } else {
      setScreen("intro");
    }
  };

  const submit = async () => {
    setSending(true);
    setError(null);
    try {
      const response = await fetch("/api/survey", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          surveyId: ONLINE_EXPERIENCE_SURVEY_ID,
          answers: surveySteps.map((survey, index) => ({
            question: survey.question,
            answer: answers[index] ?? "—",
          })),
          note: note.trim() || undefined,
        }),
      });
      if (!response.ok) {
        throw new Error("send-failed");
      }
      setScreen("done");
    } catch {
      setError(
        "Slanje trenutno nije uspelo. Pokušajte ponovo za koji trenutak.",
      );
    } finally {
      setSending(false);
    }
  };

  const stepLabel =
    screen === "done"
      ? "Hvala"
      : screen === "review"
        ? "Poslednji korak"
        : screen === "questions"
          ? `Pitanje ${step + 1} od ${surveySteps.length}`
          : "Istraživanje";

  const canGoBack = screen === "review" || screen === "questions";

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
        aria-label="Anketa o iskustvu podrške"
        className="bg-canvas shadow-drawer animate-drawer-in fixed top-0 right-0 bottom-0 z-[81] flex w-[min(520px,100vw)] flex-col"
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

        {screen === "questions" ? (
          <div className="bg-coffee/8 h-[3px]">
            <div
              className={cn(
                "bg-sage ease-soft h-full rounded-full transition-all duration-[400ms]",
                progressWidths[step],
              )}
            />
          </div>
        ) : null}

        {screen === "intro" ? (
          <div className="flex-1 overflow-y-auto px-6 py-9 md:px-10 md:py-11">
            <h3 className="text-forest mb-3 font-serif text-[28px] leading-[1.12] font-normal text-pretty md:text-[32px]">
              {surveyIntro.title}
            </h3>
            <p className="text-coffee/70 mb-8 text-[15px] leading-[1.65]">
              {surveyIntro.description}
            </p>
            <button
              type="button"
              onClick={() => setScreen("questions")}
              className="bg-forest text-canvas hover:bg-forest-hover cursor-pointer rounded-full border-0 px-7 py-[15px] text-[15px] font-semibold transition-colors"
            >
              {surveyIntro.cta}
            </button>
          </div>
        ) : null}

        {screen === "questions" && currentStep ? (
          <div className="flex-1 overflow-y-auto px-6 py-9 md:px-10 md:py-11">
            <h3 className="text-forest mb-[30px] font-serif text-[26px] leading-[1.12] font-normal tracking-[-0.01em] text-pretty md:text-[32px]">
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

        {screen === "review" ? (
          <div className="flex-1 overflow-y-auto px-6 py-9 md:px-10 md:py-11">
            <h3 className="text-forest mb-3 font-serif text-[26px] leading-[1.12] font-normal text-pretty md:text-[30px]">
              Hvala na odgovorima
            </h3>
            <p className="text-coffee/70 mb-6 text-[15px] leading-[1.6]">
              Ako želite, dodajte nešto svojim rečima — potpuno opciono.
            </p>
            <label
              htmlFor="survey-note"
              className="text-coffee/70 mb-2 block text-[14px] font-medium"
            >
              Vaš komentar <span className="text-coffee/45">(opciono)</span>
            </label>
            <textarea
              id="survey-note"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              rows={4}
              className="border-coffee/15 bg-surface text-coffee focus:border-sage w-full resize-none rounded-2xl border px-4 py-3 text-[15px] leading-[1.5] outline-none"
              placeholder="Npr. šta bi vam olakšalo prvi razgovor."
            />
            {error ? (
              <p className="text-danger mt-3 text-[13.5px]" role="alert">
                {error}
              </p>
            ) : null}
            <div className="mt-6 flex flex-wrap items-center gap-3.5">
              <button
                type="button"
                onClick={submit}
                disabled={sending}
                className="bg-forest text-canvas hover:bg-forest-hover cursor-pointer rounded-full border-0 px-7 py-[15px] text-[15px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60"
              >
                {sending ? "Šaljemo…" : "Pošalji"}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="text-coffee/60 hover:text-forest cursor-pointer border-0 bg-transparent text-sm font-medium underline underline-offset-[3px]"
              >
                Možda kasnije
              </button>
            </div>
          </div>
        ) : null}

        {screen === "done" ? (
          <div className="flex-1 overflow-y-auto px-6 py-9 md:px-10 md:py-11">
            <h3 className="text-forest mb-3 font-serif text-[28px] leading-[1.12] font-normal text-pretty">
              Hvala vam!
            </h3>
            <p className="text-coffee/70 text-[15px] leading-[1.65]">
              Vaše mišljenje nam pomaže da bolje organizujemo online i susrete
              uživo. Odgovori su anonimni.
            </p>
            <div className="mt-8">
              <button
                type="button"
                onClick={onClose}
                className="bg-meadow text-forest hover:bg-meadow-hover cursor-pointer rounded-full border-0 px-7 py-[15px] text-[15px] font-semibold transition-colors"
              >
                Zatvori
              </button>
            </div>
          </div>
        ) : null}

        {canGoBack ? (
          <div className="border-coffee/10 flex items-center border-t px-6 pt-[22px] pb-7 md:px-10">
            <button
              type="button"
              onClick={goBack}
              className="text-coffee hover:text-sage inline-flex cursor-pointer items-center gap-2 border-0 bg-transparent py-2 font-sans text-[15px] font-semibold transition-colors duration-200"
            >
              ← Nazad
            </button>
          </div>
        ) : null}
      </div>
    </>,
    document.body,
  );
}
