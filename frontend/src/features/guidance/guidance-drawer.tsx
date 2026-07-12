"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { MonogramAvatar } from "@/components/ui/monogram-avatar";
import { therapists } from "@/content/homepage";
import { cn } from "@/helpers/cn";

import {
  quizSteps,
  recommendTherapists,
  wantsServices,
  type QuizAnswers,
} from "./quiz";

const progressWidths = ["w-1/5", "w-2/5", "w-3/5", "w-4/5", "w-full"] as const;

interface GuidanceDrawerProps {
  onClose: () => void;
}

/** Five-step guided-selection quiz; answers stay in memory only. */
export function GuidanceDrawer({ onClose }: GuidanceDrawerProps) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<QuizAnswers>(
    Array.from({ length: quizSteps.length }, () => null),
  );
  const [done, setDone] = useState(false);
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

  const currentStep = quizSteps[step];
  const showServices = done && wantsServices(answers);
  const matched =
    done && !showServices ? recommendTherapists(answers, therapists) : [];

  const selectOption = (label: string) => {
    const next = [...answers];
    next[step] = label;
    setAnswers(next);
    if (step === quizSteps.length - 1) {
      setDone(true);
    } else {
      advanceTimer.current = window.setTimeout(() => {
        setStep(step + 1);
      }, 180);
    }
  };

  const goBack = () => {
    if (done) {
      setDone(false);
    } else if (step > 0) {
      setStep(step - 1);
    }
  };

  const canGoBack = done || step > 0;

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
            {done ? "Vaš predlog" : `Korak ${step + 1} od ${quizSteps.length}`}
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
        <div className="bg-coffee/8 h-[3px]">
          <div
            className={cn(
              "bg-sage ease-soft h-full rounded-full transition-all duration-[400ms]",
              done ? "w-full" : progressWidths[step],
            )}
          />
        </div>

        {!done && currentStep ? (
          <div className="flex-1 overflow-y-auto px-6 py-9 md:px-10 md:py-11">
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

        {done ? (
          <div className="flex-1 overflow-y-auto px-6 py-9 md:px-10 md:py-11">
            <div className="text-sage mb-3.5 text-[12.5px] font-semibold tracking-[0.16em] uppercase">
              Naš predlog
            </div>
            <h3 className="text-forest mb-3 font-serif text-[32px] leading-[1.12] font-normal text-pretty">
              {showServices
                ? "Usluge i programi za vas"
                : "Predlažemo da upoznate"}
            </h3>
            <p className="text-coffee/70 mb-[30px] text-[15px] leading-[1.65]">
              {showServices
                ? "Na osnovu vaših odgovora, pogledajte usluge i programe — a terapeuti su vam uvijek na raspolaganju za preporuku."
                : "Na osnovu vaših odgovora, ovi terapeuti najbliže odgovaraju onome što tražite. Prvi razgovor nije obaveza da nastavite."}
            </p>

            {!showServices ? (
              <div className="mb-8 flex flex-col gap-3">
                {matched.map((therapist) => (
                  <a
                    key={therapist.id}
                    href="#terapeuti"
                    onClick={onClose}
                    className="bg-surface border-coffee/8 hover:shadow-row-hover flex items-center gap-4 rounded-[18px] border px-5 py-[18px] no-underline transition-shadow duration-200"
                  >
                    <MonogramAvatar
                      initials={therapist.initials}
                      name={therapist.name}
                      size="sm"
                    />
                    <span className="flex-1">
                      <span className="text-forest block font-serif text-xl">
                        {therapist.name}
                      </span>
                      <span className="text-coffee/60 block text-[13px]">
                        {therapist.title}
                      </span>
                    </span>
                    <span aria-hidden className="text-forest text-[15px]">
                      →
                    </span>
                  </a>
                ))}
              </div>
            ) : (
              <div className="mb-8 flex flex-col gap-3">
                <a
                  href="#usluge"
                  onClick={onClose}
                  className="bg-surface border-coffee/8 hover:shadow-row-hover flex items-center justify-between gap-4 rounded-[18px] border px-[22px] py-5 no-underline transition-shadow duration-200"
                >
                  <span className="text-forest font-serif text-xl">
                    Usluge i cjenovnik
                  </span>
                  <span aria-hidden className="text-forest">
                    →
                  </span>
                </a>
                <a
                  href="#radionice"
                  onClick={onClose}
                  className="bg-surface border-coffee/8 hover:shadow-row-hover flex items-center justify-between gap-4 rounded-[18px] border px-[22px] py-5 no-underline transition-shadow duration-200"
                >
                  <span className="text-forest font-serif text-xl">
                    Radionice i programi
                  </span>
                  <span aria-hidden className="text-forest">
                    →
                  </span>
                </a>
              </div>
            )}

            <div className="bg-meadow/25 text-coffee/70 rounded-2xl px-5 py-[18px] text-[13.5px] leading-[1.6]">
              Vaši odgovori se ne čuvaju i ne šalju nikome — služe samo da vam
              predložimo odakle da počnete.
            </div>
          </div>
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
          <a
            href="#terapeuti"
            onClick={onClose}
            className="text-coffee/60 hover:text-forest text-sm font-medium underline underline-offset-[3px] transition-colors duration-200"
          >
            Zatvori i pregledaj terapeute
          </a>
        </div>
      </div>
    </>,
    document.body,
  );
}
