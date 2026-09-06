"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { useMemo, useReducer, useState } from "react";

import { cn } from "@/helpers/cn";

import {
  useCompassRegistry,
  useCompassExperienceMutation,
} from "../hooks/use-compass-experience";
import {
  nextFlowStep,
  optionsForQuestion,
  selectFlowValues,
} from "../model/flow";
import { buildCompassRecommendationRequest } from "../model/recommendation";
import {
  compassSelectionReducer,
  EMPTY_COMPASS_SELECTION,
  hasCompassSelection,
  type CompassSelection,
} from "../model/selection";
import { storeCompassContinuation } from "../model/session-storage";
import { CompassResults } from "./compass-results";

type Stage = "questions" | "results";

export function CompassQuiz({
  titleId,
  onRequestSupport,
  onClose,
}: {
  titleId: string;
  onRequestSupport: () => void;
  onClose: () => void;
}) {
  const t = useTranslations("public.compass.quiz");
  const registryQuery = useCompassRegistry(true);
  const resultMutation = useCompassExperienceMutation();
  const [selection, dispatch] = useReducer(
    compassSelectionReducer,
    EMPTY_COMPASS_SELECTION,
  );
  const [answers, setAnswers] = useState<Record<string, string[]>>({});
  const [currentQuestionId, setCurrentQuestionId] = useState<string | null>(
    null,
  );
  const [history, setHistory] = useState<string[]>([]);
  const [stage, setStage] = useState<Stage>("questions");

  const flow = registryQuery.data?.flow.definition;
  const taxonomy = registryQuery.data?.taxonomy;
  const activeQuestionId = currentQuestionId ?? flow?.entryQuestionId ?? null;
  const question = flow?.questions.find(
    (item) => item.questionId === activeQuestionId,
  );
  const options = useMemo(
    () =>
      question && taxonomy
        ? optionsForQuestion(question, taxonomy, selection)
        : [],
    [question, taxonomy, selection],
  );
  const selectedIds = question ? (answers[question.questionId] ?? []) : [];

  const finish = (nextSelection: CompassSelection) => {
    if (!taxonomy) return;
    storeCompassContinuation(nextSelection, taxonomy.taxonomyVersion);
    setStage("results");
    resultMutation.mutate(
      buildCompassRecommendationRequest(
        nextSelection,
        taxonomy.taxonomyVersion,
      ),
    );
  };

  const move = (nextSelection: CompassSelection, selectedOptionId?: string) => {
    if (!question) return;
    const transition = nextFlowStep(question, selectedOptionId);
    if (transition.terminal || !transition.nextQuestionId) {
      finish(
        transition.terminal === "starting_package"
          ? EMPTY_COMPASS_SELECTION
          : nextSelection,
      );
      return;
    }
    setHistory((current) => [...current, question.questionId]);
    setCurrentQuestionId(transition.nextQuestionId);
  };

  const choose = (optionId: string) => {
    if (!question) return;
    const current = answers[question.questionId] ?? [];
    const nextIds =
      question.inputMode === "multi_select"
        ? current.includes(optionId)
          ? current.filter((id) => id !== optionId)
          : current.length < question.maxSelections
            ? [...current, optionId]
            : current
        : [optionId];
    setAnswers((value) => ({ ...value, [question.questionId]: nextIds }));
    const nextSelection = selectFlowValues(selection, question, nextIds);
    if (nextSelection.topicGroupId !== selection.topicGroupId) {
      dispatch({
        type: "select-topic-group",
        topicGroupId: nextSelection.topicGroupId,
      });
    }
    if (question.selectionTarget === "topics") {
      for (const topicId of selection.topicIds) {
        if (!nextSelection.topicIds.includes(topicId)) {
          dispatch({ type: "toggle-topic", topicId });
        }
      }
      for (const topicId of nextSelection.topicIds) {
        if (!selection.topicIds.includes(topicId)) {
          dispatch({ type: "toggle-topic", topicId });
        }
      }
    } else if (question.selectionTarget === "audience") {
      dispatch({
        type: "select-audience",
        audienceId: nextSelection.audienceIds[0] ?? null,
      });
    } else if (question.selectionTarget === "content_goals") {
      dispatch({
        type: "select-goal",
        goalId: nextSelection.goalIds[0] ?? null,
      });
    } else if (question.selectionTarget === "journey_intent") {
      dispatch({
        type: "select-journey",
        journeyIntent: nextSelection.journeyIntent,
      });
    }
    if (question.inputMode === "single_select") move(nextSelection, optionId);
  };

  if (stage === "results") {
    return (
      <CompassResults
        titleId={titleId}
        experience={resultMutation.data}
        isLoading={resultMutation.isPending}
        isError={resultMutation.isError}
        onRetry={() => finish(selection)}
        onEdit={() => {
          setStage("questions");
          resultMutation.reset();
        }}
        onReset={() => {
          dispatch({ type: "reset" });
          setAnswers({});
          setHistory([]);
          setCurrentQuestionId(flow?.entryQuestionId ?? null);
          setStage("questions");
          resultMutation.reset();
        }}
        onRequestSupport={onRequestSupport}
        onClose={onClose}
      />
    );
  }

  return (
    <div className="flex min-h-0 flex-col">
      <header className="border-line shrink-0 border-b px-5 pt-2 pb-4 md:px-8">
        <div className="mx-auto max-w-[760px]">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sage flex items-center gap-2 text-[11.5px] font-semibold tracking-[0.16em] uppercase">
                <Image
                  src="/images/kompas-logo.png"
                  alt=""
                  width={20}
                  height={20}
                />
                {t("label")}
              </p>
              <h2
                id={titleId}
                className="text-forest mt-1.5 font-serif text-[22px] leading-[1.2] md:text-[26px]"
              >
                {question?.prompt ?? t("fallbackTitle")}
              </h2>
              <p className="text-coffee/65 mt-1.5 text-[13px]">
                {question?.helpText ?? t("fallbackHelp")}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label={t("close")}
              className="border-line-strong text-coffee/70 grid h-11 w-11 place-items-center rounded-full border"
            >
              ✕
            </button>
          </div>
          {flow ? (
            <div className="mt-4 flex gap-1.5" aria-hidden>
              {flow.questions.map((item) => (
                <span
                  key={item.questionId}
                  className={cn(
                    "h-1 flex-1 rounded-full",
                    item.questionId === activeQuestionId
                      ? "bg-forest"
                      : "bg-coffee/12",
                  )}
                />
              ))}
            </div>
          ) : null}
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 md:px-8">
        <div className="mx-auto grid max-w-[760px] gap-2.5">
          {registryQuery.isLoading ? <p>{t("loading")}</p> : null}
          {registryQuery.isError ? (
            <div className="rounded-tile border-line-strong border border-dashed px-5 py-6 text-center">
              <p className="text-coffee font-semibold">{t("unavailable")}</p>
              <button
                type="button"
                onClick={() => registryQuery.refetch()}
                className="text-forest mt-3 min-h-11 underline"
              >
                {t("retry")}
              </button>
            </div>
          ) : null}
          {options.map((option) => (
            <button
              key={option.id}
              type="button"
              aria-pressed={selectedIds.includes(option.id)}
              onClick={() => choose(option.id)}
              className={cn(
                "rounded-tile border-line-strong min-h-11 border px-4 py-3 text-left",
                selectedIds.includes(option.id)
                  ? "border-forest bg-meadow/30"
                  : "bg-surface",
              )}
            >
              <span className="text-[14px] font-semibold">{option.label}</span>
              {option.note ? (
                <span className="text-coffee/60 mt-1 block text-[12.5px]">
                  {option.note}
                </span>
              ) : null}
            </button>
          ))}
        </div>
      </div>

      <footer className="border-line bg-surface shrink-0 border-t px-5 py-4 md:px-8">
        <div className="mx-auto flex max-w-[760px] flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => move(selection)}
            className="border-forest text-forest min-h-11 rounded-full border px-4 text-[13.5px] font-semibold"
          >
            {t("skip")}
          </button>
          {question?.inputMode === "multi_select" && selectedIds.length > 0 ? (
            <button
              type="button"
              onClick={() => move(selection, selectedIds[0])}
              className="bg-forest text-canvas min-h-11 rounded-full px-5 text-[13.5px] font-semibold"
            >
              {t("next")}
            </button>
          ) : null}
          <button
            type="button"
            disabled={history.length === 0}
            onClick={() => {
              const previous = history.at(-1);
              if (!previous) return;
              setHistory((current) => current.slice(0, -1));
              setCurrentQuestionId(previous);
            }}
            className="border-line-strong ml-auto h-11 w-11 rounded-full border disabled:opacity-40"
            aria-label={t("back")}
          >
            ←
          </button>
          <button
            type="button"
            onClick={() => finish(selection)}
            className="text-forest min-h-11 font-semibold underline underline-offset-4"
          >
            {hasCompassSelection(selection)
              ? t("recommendations")
              : t("startingPackage")}
          </button>
        </div>
      </footer>
    </div>
  );
}

export type { CompassSelection };
