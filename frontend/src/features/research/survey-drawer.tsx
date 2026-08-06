"use client";

import { useState } from "react";

import { cn } from "@/helpers/cn";
import { QueryProvider } from "@/providers/query-provider";

import { CompassSheet } from "@/features/compass/quiz/compass-sheet";

import {
  useSubmitSurveyMutation,
  useSurveyQuery,
} from "./hooks/use-survey-queries";
import type { ResearchSurface, ResearchTrigger } from "./research-api";

type Screen = "questions" | "done";

/**
 * One drawer, any survey.
 *
 * The question set comes from the published `research_surveys` row, so adding
 * a survey is a seed operation rather than a component. That is what replaces
 * the old module-singleton import and the progress bar that was hard-coded to
 * exactly four steps.
 *
 * Answers are collected as `optionId` sets keyed by `questionId` — never the
 * rendered label — because the stored submission references stable ids and a
 * later wording change must not rewrite what people answered.
 */
export function SurveyDrawer({
  surveyStableId,
  surface,
  trigger,
  open,
  onClose,
}: {
  surveyStableId: string;
  surface: ResearchSurface;
  trigger: ResearchTrigger;
  open: boolean;
  onClose: () => void;
}) {
  return (
    <QueryProvider>
      <SurveyDrawerContent
        surveyStableId={surveyStableId}
        surface={surface}
        trigger={trigger}
        open={open}
        onClose={onClose}
      />
    </QueryProvider>
  );
}

function SurveyDrawerContent({
  surveyStableId,
  surface,
  trigger,
  open,
  onClose,
}: {
  surveyStableId: string;
  surface: ResearchSurface;
  trigger: ResearchTrigger;
  open: boolean;
  onClose: () => void;
}) {
  const surveyQuery = useSurveyQuery(surveyStableId, open);
  const submitMutation = useSubmitSurveyMutation();

  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string[]>>({});
  const [screen, setScreen] = useState<Screen>("questions");

  const survey = surveyQuery.data;
  const questions = survey?.schema.questions ?? [];
  const question = questions[index];
  const titleId = `survey-${surveyStableId}`;

  const toggle = (questionId: string, optionId: string, multi: boolean) => {
    const selected = answers[questionId] ?? [];
    const nextAnswers = {
      ...answers,
      [questionId]: multi
        ? selected.includes(optionId)
          ? selected.filter((id) => id !== optionId)
          : [...selected, optionId]
        : [optionId],
    };
    setAnswers(nextAnswers);
    if (!multi) advance(nextAnswers);
  };

  const advance = (currentAnswers = answers) => {
    if (index + 1 >= questions.length) {
      finish(currentAnswers);
      return;
    }
    setIndex((current) => current + 1);
  };

  const finish = (currentAnswers = answers) => {
    const payload = Object.entries(currentAnswers)
      .filter(([, optionIds]) => optionIds.length > 0)
      .map(([questionId, optionIds]) => ({ questionId, optionIds }));

    submitMutation.mutate(
      { surveyStableId, answers: payload, surface, trigger },
      { onSuccess: () => setScreen("done") },
    );
  };

  const hasCurrentAnswer = question
    ? (answers[question.questionId]?.length ?? 0) > 0
    : false;

  const close = () => {
    onClose();
    // Reset so a second opening in the same session starts clean.
    setIndex(0);
    setAnswers({});
    setScreen("questions");
    submitMutation.reset();
  };

  return (
    <CompassSheet open={open} labelledBy={titleId} onClose={close}>
      <div className="flex min-h-0 flex-col">
        <header className="border-line shrink-0 border-b px-5 pb-4 md:px-8">
          <div className="mx-auto flex max-w-[760px] items-start justify-between gap-4">
            <div>
              <p className="text-sage text-[11.5px] font-semibold tracking-[0.16em] uppercase">
                {survey?.title ?? "Anketa"}
              </p>
              <h2
                id={titleId}
                className="text-forest mt-1.5 font-serif text-[20px] leading-[1.25] md:text-[24px]"
              >
                {screen === "done"
                  ? "Hvala vam"
                  : (question?.prompt ?? survey?.schema.introTitle ?? "Anketa")}
              </h2>
            </div>
            <button
              type="button"
              onClick={close}
              aria-label="Zatvori anketu"
              className="border-line-strong text-coffee/70 hover:border-coffee/40 grid h-11 w-11 shrink-0 cursor-pointer place-items-center rounded-full border"
            >
              ✕
            </button>
          </div>

          {screen === "questions" && questions.length > 0 ? (
            <div
              className="mx-auto mt-4 flex max-w-[760px] gap-1.5"
              aria-hidden
            >
              {questions.map((item, position) => (
                <span
                  key={item.questionId}
                  className={cn(
                    "h-1 flex-1 rounded-full transition-colors",
                    position <= index ? "bg-forest" : "bg-coffee/12",
                  )}
                />
              ))}
            </div>
          ) : null}
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 md:px-8">
          <div className="mx-auto max-w-[760px]">
            {surveyQuery.isLoading ? (
              <p className="text-coffee/65 text-[13.5px]">Učitavanje ankete…</p>
            ) : null}

            {surveyQuery.isError ? (
              <p className="text-coffee/70 rounded-tile border-line-strong border border-dashed px-4 py-6 text-center text-[13.5px]">
                Anketa trenutno nije dostupna. Pokušajte kasnije.
              </p>
            ) : null}

            {screen === "done" ? (
              <p className="text-coffee/75 text-[14px] leading-[1.65]">
                Vaši odgovori su zabeleženi anonimno i pomažu nam da ovaj alat
                učinimo korisnijim.
              </p>
            ) : null}

            {screen === "questions" && question ? (
              <div className="grid gap-2.5">
                {question.options.map((option) => {
                  const selected = (
                    answers[question.questionId] ?? []
                  ).includes(option.optionId);
                  return (
                    <button
                      key={option.optionId}
                      type="button"
                      aria-pressed={selected}
                      onClick={() =>
                        toggle(
                          question.questionId,
                          option.optionId,
                          question.multi,
                        )
                      }
                      className={cn(
                        "rounded-tile min-h-11 w-full cursor-pointer border px-4 py-3 text-left text-[14px] font-semibold transition-colors",
                        selected
                          ? "border-forest bg-meadow/30 text-forest"
                          : "border-line-strong bg-surface text-coffee/80 hover:border-coffee/35",
                      )}
                    >
                      {option.label}
                    </button>
                  );
                })}
                {question.multi ? (
                  <p className="text-coffee/55 text-[12px]">
                    Možete izabrati više odgovora.
                  </p>
                ) : null}
              </div>
            ) : null}

            {submitMutation.isError ? (
              <p className="text-danger mt-4 text-[13px]">
                Slanje nije uspelo. Pokušajte ponovo.
              </p>
            ) : null}
          </div>
        </div>

        <footer className="border-line bg-surface shrink-0 border-t px-5 py-4 md:px-8">
          <div className="mx-auto flex max-w-[760px] flex-wrap items-center gap-2.5">
            {screen === "done" ? (
              <button
                type="button"
                onClick={close}
                className="bg-forest text-canvas hover:bg-forest-hover min-h-11 cursor-pointer rounded-full px-5 text-[13.5px] font-semibold"
              >
                Zatvori
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setIndex((c) => Math.max(0, c - 1))}
                  disabled={index === 0}
                  aria-label="Nazad na prethodno pitanje"
                  className="border-forest/35 text-forest hover:bg-meadow/25 disabled:border-line-strong disabled:text-ink-45 grid h-11 w-11 shrink-0 cursor-pointer place-items-center rounded-full border transition-colors disabled:cursor-not-allowed"
                >
                  <span aria-hidden>←</span>
                </button>
                <button
                  type="button"
                  onClick={() => advance()}
                  disabled={
                    submitMutation.isPending ||
                    (!question?.optional && !hasCurrentAnswer)
                  }
                  className="border-forest text-forest hover:bg-meadow/30 min-h-11 cursor-pointer rounded-full border px-4 text-[13.5px] font-semibold transition-colors disabled:cursor-not-allowed"
                >
                  {index + 1 >= questions.length
                    ? submitMutation.isPending
                      ? "Slanje…"
                      : "Pošalji"
                    : question?.optional && !hasCurrentAnswer
                      ? "Preskoči pitanje"
                      : "Nastavi"}
                </button>
                <button
                  type="button"
                  onClick={close}
                  className="text-coffee/60 hover:text-coffee ml-auto min-h-11 cursor-pointer text-[13px] underline underline-offset-4"
                >
                  Ne sada
                </button>
              </>
            )}
          </div>
        </footer>
      </div>
    </CompassSheet>
  );
}
