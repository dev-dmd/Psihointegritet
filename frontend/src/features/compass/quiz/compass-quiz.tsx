"use client";

import Image from "next/image";
import { useMemo, useReducer, useState } from "react";

import { cn } from "@/helpers/cn";

import {
  compassFallbackRegistry,
  type CompassOption,
} from "../fallback-registry";
import { previewCompassResults } from "../model/fallback-recommendation";
import {
  COMPASS_MAX_TOPIC_SELECTIONS,
  compassSelectionReducer,
  EMPTY_COMPASS_SELECTION,
  hasCompassSelection,
  type CompassJourneyIntent,
  type CompassSelection,
} from "../model/selection";
import { CompassResults } from "./compass-results";

type Stage = "questions" | "results";

interface Question {
  id: string;
  title: string;
  hint: string;
  /** Topic is the only multi-select control in v1, capped at two. */
  multi: boolean;
}

const QUESTIONS: readonly Question[] = [
  {
    id: "area",
    title: "Od čega želite da počnete?",
    hint: "Izaberite oblast koja vam je najbliža.",
    multi: false,
  },
  {
    id: "topics",
    title: "Šta vam je od ovoga trenutno najbliže?",
    hint: `Možete izabrati najviše ${COMPASS_MAX_TOPIC_SELECTIONS} teme.`,
    multi: true,
  },
  {
    id: "audience",
    title: "Za koga tražite sadržaj?",
    hint: "Pomaže nam da predložimo prikladan materijal.",
    multi: false,
  },
  {
    id: "goal",
    title: "Šta bi vam sada bilo najkorisnije?",
    hint: "Jedan izbor je dovoljan.",
    multi: false,
  },
  {
    id: "journey",
    title: "Kako želite da nastavite?",
    hint: "Uvek možete da se predomislite.",
    multi: false,
  },
];

function OptionButton({
  label,
  note,
  selected,
  dashed = false,
  onClick,
}: {
  label: string;
  note?: string | undefined;
  selected: boolean;
  dashed?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={cn(
        "rounded-tile flex min-h-11 w-full cursor-pointer flex-col items-start gap-1 border px-4 py-3 text-left transition-colors",
        dashed ? "border-dashed" : "",
        selected
          ? "border-forest bg-meadow/30 text-forest"
          : "border-line-strong bg-surface text-coffee/80 hover:border-coffee/35",
      )}
    >
      <span className="text-[14px] font-semibold">{label}</span>
      {note ? (
        <span className="text-coffee/60 text-[12.5px] leading-[1.5]">
          {note}
        </span>
      ) : null}
    </button>
  );
}

/**
 * The optional five-question Kompas flow.
 *
 * Not a wizard: there is no „korak X od Y" text, every question can be skipped,
 * and „Prikaži preporuke sada" is available from the first screen. Progress is
 * a discreet five-segment bar only.
 *
 * Selection state goes through the shared `compassSelectionReducer`, so the
 * caps (two topics, one audience) are enforced in one place rather than in this
 * component. Answers are never persisted and never enter a URL.
 */
export function CompassQuiz({
  titleId,
  onRequestSupport,
  onClose,
}: {
  titleId: string;
  onRequestSupport: () => void;
  onClose: () => void;
}) {
  const registry = compassFallbackRegistry;
  const [selection, dispatch] = useReducer(
    compassSelectionReducer,
    EMPTY_COMPASS_SELECTION,
  );
  const [index, setIndex] = useState(0);
  const [stage, setStage] = useState<Stage>("questions");
  /** Visited question indexes, so „nazad" retraces the path actually taken —
   * `index - 1` would land on a question that was auto-skipped for having no
   * published options. */
  const [history, setHistory] = useState<number[]>([]);

  const question = QUESTIONS[index];
  const activeArea = registry.areas.find(
    (area) => area.stableId === selection.topicGroupId,
  );

  const options: readonly CompassOption[] = useMemo(() => {
    switch (question?.id) {
      case "area":
        return registry.areas.map((area) => ({
          id: area.stableId,
          label: area.label,
          note: area.description,
        }));
      case "topics":
        return (activeArea?.topics ?? []).map((topic) => ({
          id: topic.stableId,
          label: topic.label,
          note: topic.description,
        }));
      case "audience":
        return registry.audiences;
      case "goal":
        return registry.goals;
      case "journey":
        return registry.journeys;
      default:
        return [];
    }
  }, [question?.id, registry, activeArea]);

  const isSelected = (id: string) => {
    switch (question?.id) {
      case "area":
        return selection.topicGroupId === id;
      case "topics":
        return selection.topicIds.includes(id);
      case "audience":
        return selection.audienceIds.includes(id);
      case "goal":
        return selection.goalIds.includes(id);
      case "journey":
        return selection.journeyIntent === id;
      default:
        return false;
    }
  };

  const choose = (id: string) => {
    switch (question?.id) {
      case "area":
        dispatch({ type: "select-topic-group", topicGroupId: id });
        break;
      case "topics":
        dispatch({ type: "toggle-topic", topicId: id });
        return; // multi-select stays on the question
      case "audience":
        dispatch({ type: "select-audience", audienceId: id });
        break;
      case "goal":
        dispatch({ type: "select-goal", goalId: id });
        break;
      case "journey":
        dispatch({
          type: "select-journey",
          journeyIntent: id as CompassJourneyIntent,
        });
        break;
      default:
        return;
    }
    advance();
  };

  /** Topic has no options when the chosen area has none — skip it silently. */
  const advance = () => {
    const next = index + 1;
    setHistory((current) => [...current, index]);
    if (next >= QUESTIONS.length) {
      setStage("results");
      return;
    }
    if (
      QUESTIONS[next]?.id === "topics" &&
      (activeArea?.topics.length ?? 0) === 0
    ) {
      setIndex(next + 1);
      return;
    }
    setIndex(next);
  };

  const goBack = () => {
    const previous = history.at(-1);
    if (previous === undefined) return;
    setHistory((current) => current.slice(0, -1));
    setIndex(previous);
  };

  const results = useMemo(
    () => (stage === "results" ? previewCompassResults(selection) : []),
    [stage, selection],
  );

  if (stage === "results") {
    return (
      <CompassResults
        titleId={titleId}
        results={results}
        selection={selection}
        onEdit={() => {
          setStage("questions");
          setIndex(0);
        }}
        onReset={() => {
          dispatch({ type: "reset" });
          setStage("questions");
          setIndex(0);
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
                  width={512}
                  height={512}
                  sizes="20px"
                  className="h-5 w-5 shrink-0"
                />
                Kompas
              </p>
              <h2
                id={titleId}
                className="text-forest mt-1.5 font-serif text-[22px] leading-[1.2] md:text-[26px]"
              >
                {question?.title}
              </h2>
              <p className="text-coffee/65 mt-1.5 text-[13px]">
                {question?.hint}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Zatvori Kompas"
              className="border-line-strong text-coffee/70 hover:border-coffee/40 grid h-11 w-11 shrink-0 cursor-pointer place-items-center rounded-full border"
            >
              ✕
            </button>
          </div>

          <div className="mt-4 flex items-center gap-3">
            <div className="flex flex-1 gap-1.5" aria-hidden>
              {QUESTIONS.map((item, position) => (
                <span
                  key={item.id}
                  className={cn(
                    "h-1 flex-1 rounded-full transition-colors",
                    position <= index ? "bg-forest" : "bg-coffee/12",
                  )}
                />
              ))}
            </div>
            <span className="text-coffee/55 shrink-0 text-[12px]">
              Pitanja su opciona
            </span>
          </div>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 md:px-8">
        <div className="mx-auto grid max-w-[760px] gap-2.5">
          {options.map((option) => (
            <OptionButton
              key={option.id}
              label={option.label}
              note={option.note}
              selected={isSelected(option.id)}
              onClick={() => choose(option.id)}
            />
          ))}

          {question?.id === "area" ? (
            <OptionButton
              label="Nisam siguran/na šta mi se događa"
              note="Prikazaćemo vam polazni izbor oblasti i sadržaja."
              selected={false}
              dashed
              onClick={() => setStage("results")}
            />
          ) : null}

          {options.length === 0 ? (
            <p className="text-coffee/65 rounded-tile border-line-strong border border-dashed px-4 py-6 text-center text-[13.5px]">
              Za ovaj korak još nema objavljenih vrednosti u registru.
            </p>
          ) : null}
        </div>
      </div>

      <footer className="border-line bg-surface shrink-0 border-t px-5 py-4 md:px-8">
        <div className="mx-auto flex max-w-[760px] flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={advance}
            className="border-forest text-forest hover:bg-meadow/30 min-h-11 cursor-pointer rounded-full border px-4 text-[13.5px] font-semibold transition-colors"
          >
            {index === QUESTIONS.length - 1 ? "Završi" : "Preskoči pitanje"}
          </button>

          {question?.multi ? (
            <button
              type="button"
              onClick={advance}
              className="bg-forest text-canvas hover:bg-forest-hover min-h-11 cursor-pointer rounded-full px-5 text-[13.5px] font-semibold"
            >
              Dalje
            </button>
          ) : null}

          <button
            type="button"
            onClick={goBack}
            disabled={history.length === 0}
            aria-label="Nazad na prethodno pitanje"
            className="border-forest/35 text-forest hover:bg-meadow/25 disabled:border-line-strong disabled:text-ink-45 ml-auto grid h-11 w-11 shrink-0 cursor-pointer place-items-center rounded-full border transition-colors disabled:cursor-not-allowed disabled:hover:bg-transparent"
          >
            <span aria-hidden>←</span>
          </button>
          <button
            type="button"
            onClick={() => setStage("results")}
            className="text-forest hover:text-forest-soft min-h-11 cursor-pointer text-[13.5px] font-semibold underline underline-offset-4"
          >
            {hasCompassSelection(selection)
              ? "Prikaži preporuke sada"
              : "Preskoči pitanja"}
          </button>
        </div>
      </footer>
    </div>
  );
}

export type { CompassSelection };
