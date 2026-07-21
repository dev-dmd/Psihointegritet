"use client";

import Link from "next/link";
import type { Route } from "next";
import { useEffect, useMemo, useRef, useState } from "react";

import { MonogramAvatar } from "@/components/ui/monogram-avatar";
import { therapists } from "@/content/therapists";
import {
  buildBookingHref,
  type BookingFormat,
} from "@/features/booking/booking-context";
import { storeBookingSummary } from "@/features/booking/booking-summary-storage";
import type { BookingSummary } from "@/features/booking/booking-types";
import { cn } from "@/helpers/cn";

import {
  ADULT_CHILD_AGE_GROUP,
  INTAKE_INTRO,
  MINOR_NOTE,
  OTHER_TEXT_PROMPT,
  PARTICIPANTS,
  REASONS,
  SAFETY_NOTICE,
  WORK_FORMATS,
  activeIntakeSteps,
  evaluateIntake,
  type IntakeAnswers,
  type IntakeMatchResult,
  type IntakeStepKey,
  type TherapistMatch,
  emptyIntakeAnswers,
} from "./matching";
import { serviceSlugForName } from "@/content/services";

export type GuidanceFlowEntry = "chooser" | "quiz" | "page";
type Screen = "intro" | "chooser" | "questions" | "result";

interface GuidanceFlowProps {
  entry: GuidanceFlowEntry;
  surface: "drawer" | "page";
  onClose?: () => void;
}

/**
 * One shared, non-diagnostic matching flow for the transitional drawer and
 * the canonical `/pronadji-podrsku` page. Matching state is local to the
 * component; only a structured plain-language summary may cross to `/zakazi`
 * in same-tab session storage after the visitor explicitly chooses it.
 */
export function GuidanceFlow({ entry, surface, onClose }: GuidanceFlowProps) {
  const [screen, setScreen] = useState<Screen>(
    entry === "page" ? "intro" : entry === "chooser" ? "chooser" : "questions",
  );
  const [stepIndex, setStepIndex] = useState(0);
  const [answers, setAnswers] = useState<IntakeAnswers>(emptyIntakeAnswers);
  const [extraText, setExtraText] = useState("");
  const advanceTimer = useRef<number | null>(null);
  const headingRef = useRef<HTMLHeadingElement | null>(null);

  useEffect(() => {
    return () => {
      if (advanceTimer.current !== null) {
        window.clearTimeout(advanceTimer.current);
      }
    };
  }, []);

  const steps = useMemo(() => activeIntakeSteps(answers), [answers]);
  const safeIndex = Math.min(stepIndex, steps.length - 1);
  const currentStep = steps[safeIndex];
  const result = useMemo(
    () => (screen === "result" ? evaluateIntake(answers) : null),
    [screen, answers],
  );

  useEffect(() => {
    headingRef.current?.focus();
  }, [screen, safeIndex]);

  const advanceFrom = (next: IntakeAnswers) => {
    const nextSteps = activeIntakeSteps(next);
    const currentKey = currentStep?.key;
    const index = nextSteps.findIndex((item) => item.key === currentKey);
    if (index === -1 || index >= nextSteps.length - 1) {
      setScreen("result");
      return;
    }
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    advanceTimer.current = window.setTimeout(
      () => setStepIndex(index + 1),
      reduceMotion ? 0 : 180,
    );
  };

  const selectOption = (key: IntakeStepKey, option: string) => {
    const next: IntakeAnswers = { ...answers, [key]: option };
    if (key === "participants" && option !== PARTICIPANTS.parentChild) {
      next.childAgeGroup = null;
    }
    if (key === "format" && option !== WORK_FORMATS.inPerson) {
      next.location = null;
    }
    if (key === "reason" && option !== REASONS.other) {
      next.reasonOtherText = "";
    }
    setAnswers(next);
    if (key === "reason" && option === REASONS.other) return;
    advanceFrom(next);
  };

  const goBack = () => {
    if (screen === "result") {
      setScreen("questions");
      setStepIndex(steps.length - 1);
      return;
    }
    if (screen === "questions") {
      if (safeIndex > 0) {
        setStepIndex(safeIndex - 1);
      } else if (entry === "chooser") {
        setScreen("chooser");
      } else if (entry === "page") {
        setScreen("intro");
      }
      return;
    }
    if (screen === "chooser" && entry === "page") {
      setScreen("intro");
    }
  };

  const canGoBack =
    screen === "result" ||
    (screen === "questions" &&
      (safeIndex > 0 || entry === "chooser" || entry === "page")) ||
    (screen === "chooser" && entry === "page");
  const progress =
    screen === "questions" ? ((safeIndex + 1) / steps.length) * 100 : 0;
  const label =
    screen === "result"
      ? "Vaš predlog"
      : screen === "questions"
        ? `Pitanje ${safeIndex + 1} od ${steps.length}`
        : "Vođeni izbor";

  return (
    <div className={surface === "drawer" ? "flex h-full flex-col" : ""}>
      {surface === "drawer" ? (
        <div className="border-coffee/10 flex items-center justify-between gap-6 border-b px-6 pt-7 pb-[22px] md:px-10">
          <div className="text-sage text-[13px] font-semibold tracking-[0.12em] uppercase">
            {label}
          </div>
          <button
            type="button"
            aria-label="Zatvori"
            onClick={onClose}
            className="border-coffee/15 text-coffee hover:bg-meadow/25 flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border bg-transparent text-[17px]"
          >
            x
          </button>
        </div>
      ) : null}

      {screen === "questions" ? (
        <div className="bg-coffee/8 h-[3px]">
          <div
            className="bg-sage ease-soft h-full rounded-full transition-all duration-[400ms]"
            style={{ width: `${progress}%` }}
          />
        </div>
      ) : null}

      <div
        className={
          surface === "drawer"
            ? "flex-1 overflow-y-auto px-6 py-9 md:px-10 md:py-11"
            : "mx-auto max-w-[1536px] px-5 pt-[130px] pb-[72px] md:px-8 md:pt-[168px] md:pb-24"
        }
      >
        <div
          className={
            surface === "page" && screen !== "intro"
              ? "mx-auto max-w-[880px]"
              : undefined
          }
        >
          {screen === "intro" ? (
            <GuidanceIntro
              headingRef={headingRef}
              onStart={() => {
                setStepIndex(0);
                setScreen("questions");
              }}
            />
          ) : null}

          {screen === "chooser" ? (
            <ChooserScreen
              headingRef={headingRef}
              onQuiz={() => {
                setStepIndex(0);
                setScreen("questions");
              }}
              onClose={onClose}
            />
          ) : null}

          {screen === "questions" && currentStep ? (
            <QuestionsScreen
              headingRef={headingRef}
              currentStep={currentStep}
              answers={answers}
              isFirstStep={safeIndex === 0}
              onSelect={selectOption}
              onAnswersChange={setAnswers}
              onAdvance={() => advanceFrom(answers)}
            />
          ) : null}

          {screen === "result" && result ? (
            <ResultScreen
              headingRef={headingRef}
              result={result}
              answers={answers}
              extraText={extraText}
              onExtraTextChange={setExtraText}
              onClose={onClose}
            />
          ) : null}
        </div>
      </div>

      {surface === "drawer" ? (
        <div className="border-coffee/10 flex items-center justify-between gap-5 border-t px-6 pt-[22px] pb-7 md:px-10">
          {canGoBack ? (
            <button
              type="button"
              onClick={goBack}
              className="text-coffee hover:text-sage inline-flex min-h-11 cursor-pointer items-center gap-2 border-0 bg-transparent py-2 font-sans text-[15px] font-semibold transition-colors"
            >
              Nazad
            </button>
          ) : (
            <span />
          )}
          <Link
            href="/tim"
            onClick={() => onClose?.()}
            className="text-coffee/60 hover:text-forest text-sm font-medium underline underline-offset-[3px] transition-colors"
          >
            Pregledaj sve terapeute
          </Link>
        </div>
      ) : null}
    </div>
  );
}

function GuidanceIntro({
  headingRef,
  onStart,
}: {
  headingRef: React.RefObject<HTMLHeadingElement | null>;
  onStart: () => void;
}) {
  return (
    <div className="bg-surface border-coffee/8 rounded-3xl border p-7 md:rounded-[32px] md:p-12">
      <p className="text-sage mb-4 text-[12px] font-semibold tracking-[0.15em] uppercase">
        Vođeni izbor
      </p>
      <h1
        ref={headingRef}
        tabIndex={-1}
        className="text-forest mb-4 font-serif text-[clamp(32px,7vw,48px)] leading-[1.08] font-normal outline-none"
      >
        {INTAKE_INTRO.title}
      </h1>
      <p className="text-coffee/75 max-w-[650px] text-[16px] leading-[1.65]">
        {INTAKE_INTRO.description}
      </p>
      <p className="bg-warm/20 text-coffee/80 mt-6 max-w-[680px] rounded-[18px] px-5 py-4 text-[14px] leading-[1.6]">
        {INTAKE_INTRO.note}
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={onStart}
          className="bg-forest text-canvas hover:bg-forest-hover min-h-11 cursor-pointer rounded-full border-0 px-7 text-[15px] font-semibold transition-colors"
        >
          {INTAKE_INTRO.cta}
        </button>
        <Link
          href="/tim"
          className="border-coffee/25 text-coffee hover:border-sage inline-flex min-h-11 items-center rounded-full border px-6 text-[15px] font-semibold no-underline transition-colors"
        >
          Samostalno upoznajte terapeute
        </Link>
      </div>
    </div>
  );
}

function QuestionsScreen({
  headingRef,
  currentStep,
  answers,
  isFirstStep,
  onSelect,
  onAnswersChange,
  onAdvance,
}: {
  headingRef: React.RefObject<HTMLHeadingElement | null>;
  currentStep: ReturnType<typeof activeIntakeSteps>[number];
  answers: IntakeAnswers;
  isFirstStep: boolean;
  onSelect: (key: IntakeStepKey, option: string) => void;
  onAnswersChange: (answers: IntakeAnswers) => void;
  onAdvance: () => void;
}) {
  return (
    <>
      <SafetyNotice />
      {isFirstStep ? (
        <p className="text-coffee/60 mb-6 text-[13px] leading-[1.55]">
          {INTAKE_INTRO.note}
        </p>
      ) : null}
      <h2
        ref={headingRef}
        tabIndex={-1}
        className="text-forest mb-[30px] font-serif text-[26px] leading-[1.12] font-normal tracking-[-0.01em] text-pretty outline-none md:text-[32px]"
      >
        {currentStep.question}
      </h2>
      <div className="flex flex-col gap-2.5">
        {currentStep.options.map((option) => {
          const selected = answers[currentStep.key] === option;
          return (
            <button
              key={option}
              type="button"
              onClick={() => onSelect(currentStep.key, option)}
              className={cn(
                "text-coffee hover:border-sage flex min-h-11 cursor-pointer items-center justify-between gap-4 rounded-2xl border-[1.5px] px-[22px] py-[15px] text-left font-sans text-[15.5px] font-medium transition-all duration-200",
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
      {currentStep.hasOtherText && answers.reason === REASONS.other ? (
        <>
          <label
            htmlFor="guidance-other-text"
            className="text-coffee/70 mt-5 mb-2 block text-[14px] font-medium"
          >
            {OTHER_TEXT_PROMPT} <span className="text-coffee/45">Opciono</span>
          </label>
          <textarea
            id="guidance-other-text"
            value={answers.reasonOtherText}
            onChange={(event) =>
              onAnswersChange({
                ...answers,
                reasonOtherText: event.target.value,
              })
            }
            rows={3}
            className="border-coffee/15 bg-surface text-coffee focus:border-sage w-full resize-none rounded-2xl border px-4 py-3 text-[15px] leading-[1.5] outline-none"
          />
          <button
            type="button"
            onClick={onAdvance}
            className="bg-forest text-canvas hover:bg-forest-hover mt-4 min-h-11 cursor-pointer rounded-full border-0 px-7 text-[15px] font-semibold transition-colors"
          >
            Dalje
          </button>
        </>
      ) : null}
    </>
  );
}

function ResultScreen({
  headingRef,
  result,
  answers,
  extraText,
  onExtraTextChange,
  onClose,
}: {
  headingRef: React.RefObject<HTMLHeadingElement | null>;
  result: IntakeMatchResult;
  answers: IntakeAnswers;
  extraText: string;
  onExtraTextChange: (value: string) => void;
  onClose?: (() => void) | undefined;
}) {
  const [showAlternative, setShowAlternative] = useState(false);
  const primary = result.primaryRecommendation;
  const alternative = result.alternativeRecommendation;
  const shown: TherapistMatch[] = result.showBoth
    ? [primary, alternative].filter(
        (match): match is TherapistMatch => match !== null,
      )
    : primary
      ? [primary]
      : [];
  const minorNote =
    answers.participants === PARTICIPANTS.parentChild &&
    answers.childAgeGroup !== null &&
    answers.childAgeGroup !== ADULT_CHILD_AGE_GROUP;
  const serviceSlug = serviceSlugForName(result.recommendedService);
  const format = bookingFormatForAnswer(answers.format);

  const summaryFor = (match: TherapistMatch | null): BookingSummary =>
    buildSummary(answers, result, extraText, match);
  const teamHref = buildBookingHref({
    service: serviceSlug,
    format,
    source: "matching",
  });

  return (
    <>
      <div className="text-sage mb-3.5 text-[12.5px] font-semibold tracking-[0.16em] uppercase">
        Predlog na osnovu vaših odgovora
      </div>
      <h2
        ref={headingRef}
        tabIndex={-1}
        className="text-forest mb-2 font-serif text-[24px] leading-[1.15] font-normal text-pretty outline-none"
      >
        Preporučena usluga: {result.recommendedService}
      </h2>
      {result.onlineFallback ? (
        <p className="bg-warm/20 text-coffee/80 mb-4 rounded-2xl px-4 py-3 text-[13.5px] leading-[1.55]">
          Na izabranoj lokaciji trenutno nema rada uživo - svi terapeuti su
          dostupni online.
        </p>
      ) : null}
      {result.needsManualReview ? (
        <p className="bg-warm/20 text-coffee/80 mb-4 rounded-2xl px-4 py-3 text-[13.5px] leading-[1.55]">
          Pošto ste izabrali &quot;Drugo&quot;, tim će dodatno pregledati vaš
          zahtev i predložiti najbolji sledeći korak.
        </p>
      ) : null}
      {result.showBoth && shown.length > 1 ? (
        <p className="text-coffee/70 mb-4 text-[14.5px] leading-[1.6]">
          Oba terapeuta rade sa izabranim oblastima - izaberite osobu koja vam
          više odgovara.
        </p>
      ) : null}

      <div className="flex flex-col gap-4">
        {shown.map((match) => (
          <TherapistResultCard
            key={match.therapist.slug}
            match={match}
            href={buildBookingHref({
              service: serviceSlug,
              therapist: match.therapist.slug,
              format,
              source: "matching",
            })}
            summary={summaryFor(match)}
            onClose={onClose}
          />
        ))}
      </div>

      {!result.showBoth && alternative ? (
        showAlternative ? (
          <div className="mt-4">
            <div className="text-sage mb-3 text-[12px] font-semibold tracking-[0.14em] uppercase">
              Druga preporuka
            </div>
            <TherapistResultCard
              match={alternative}
              href={buildBookingHref({
                service: serviceSlug,
                therapist: alternative.therapist.slug,
                format,
                source: "matching",
              })}
              summary={summaryFor(alternative)}
              onClose={onClose}
            />
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setShowAlternative(true)}
            className="text-coffee/70 hover:text-forest mt-4 inline-flex min-h-11 cursor-pointer items-center gap-2 border-0 bg-transparent text-[14px] font-semibold underline underline-offset-[3px] transition-colors"
          >
            Pogledajte i drugu preporuku
          </button>
        )
      ) : null}

      {minorNote ? (
        <p className="text-coffee/70 bg-warm/20 mt-4 rounded-2xl px-4 py-3 text-[13.5px] leading-[1.55]">
          {MINOR_NOTE}
        </p>
      ) : null}

      <p className="text-coffee/60 mt-5 text-[13.5px] leading-[1.55]">
        Rezultat je objašnjiv predlog; konačan izbor je vaš.
      </p>
      <div className="mt-7">
        <label
          htmlFor="guidance-note"
          className="text-coffee/70 mb-2 block text-[14px] font-medium"
        >
          Želite li nešto da dodate svojim rečima?{" "}
          <span className="text-coffee/45">Opciono</span>
        </label>
        <textarea
          id="guidance-note"
          value={extraText}
          onChange={(event) => onExtraTextChange(event.target.value)}
          rows={3}
          className="border-coffee/15 bg-surface text-coffee focus:border-sage w-full resize-none rounded-2xl border px-4 py-3 text-[15px] leading-[1.5] outline-none"
          placeholder="Npr. šta vam je trenutno najvažnije."
        />
        <p className="text-coffee/50 mt-2 text-[12.5px] leading-[1.5]">
          Tekst ostaje na vašem uređaju i šalje se timu samo uz zahtev za
          termin.
        </p>
      </div>
      <Link
        href={teamHref as Route}
        onClick={() => {
          storeBookingSummary(summaryFor(null));
          onClose?.();
        }}
        className="text-coffee/70 hover:text-forest mt-5 inline-flex min-h-11 items-center gap-2 text-[14px] font-semibold underline underline-offset-[3px] transition-colors"
      >
        Želim da tim pregleda moj zahtev
      </Link>
      <div className="bg-meadow/25 text-coffee/70 mt-6 rounded-2xl px-5 py-[18px] text-[13.5px] leading-[1.6]">
        Vaši odgovori se ne čuvaju i ne prate - šalju se timu isključivo uz vaš
        zahtev za termin.
      </div>
    </>
  );
}

function TherapistResultCard({
  match,
  href,
  summary,
  onClose,
}: {
  match: TherapistMatch;
  href: string;
  summary: BookingSummary;
  onClose?: (() => void) | undefined;
}) {
  const { therapist, reasons } = match;
  return (
    <div className="bg-surface border-coffee/8 rounded-[20px] border p-5">
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
      </div>
      <ul className="mt-4 flex flex-col gap-1.5">
        {reasons.map((reason) => (
          <li
            key={reason}
            className="text-coffee/80 flex gap-2 text-[13.5px] leading-[1.5]"
          >
            <span aria-hidden className="text-sage">
              •
            </span>
            {reason}
          </li>
        ))}
      </ul>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Link
          href={href as Route}
          onClick={() => {
            storeBookingSummary(summary);
            onClose?.();
          }}
          className="bg-forest text-canvas hover:bg-forest-hover inline-flex min-h-11 items-center rounded-full px-6 text-[14px] font-semibold no-underline transition-colors"
        >
          Zatražite termin
        </Link>
        <Link
          href={`/tim/${therapist.slug}`}
          onClick={() => onClose?.()}
          className="text-coffee/70 hover:text-forest inline-flex min-h-11 items-center text-[14px] font-medium underline underline-offset-[3px] transition-colors"
        >
          Pogledajte profil
        </Link>
      </div>
    </div>
  );
}

function ChooserScreen({
  headingRef,
  onQuiz,
  onClose,
}: {
  headingRef: React.RefObject<HTMLHeadingElement | null>;
  onQuiz: () => void;
  onClose?: (() => void) | undefined;
}) {
  return (
    <>
      <h2
        ref={headingRef}
        tabIndex={-1}
        className="text-forest mb-2 font-serif text-[28px] leading-[1.12] font-normal text-pretty outline-none md:text-[32px]"
      >
        Kako želite da pronađete termin?
      </h2>
      <p className="text-coffee/70 mb-7 text-[15px] leading-[1.6]">
        Izaberite način koji vam više odgovara - oba vode do zakazivanja.
      </p>
      <button
        type="button"
        onClick={onQuiz}
        className="border-coffee/12 bg-surface hover:border-sage mb-3 flex min-h-11 w-full cursor-pointer flex-col gap-1.5 rounded-2xl border-[1.5px] px-[22px] py-[18px] text-left transition-colors duration-200"
      >
        <span className="text-forest font-serif text-xl">
          Pomozite mi da pronađem terapeuta
        </span>
        <span className="text-coffee/65 text-[14px] leading-[1.5]">
          Odgovorite na nekoliko kratkih pitanja i odmah dobijte predlog.
        </span>
      </button>
      <div className="text-sage mt-6 mb-3 text-[12.5px] font-semibold tracking-[0.14em] uppercase">
        Znam kog terapeuta želim
      </div>
      <div className="flex flex-col gap-2.5">
        {therapists.map((therapist) => (
          <Link
            key={therapist.slug}
            href={
              buildBookingHref({
                therapist: therapist.slug,
                source: "therapist",
              }) as Route
            }
            onClick={() => onClose?.()}
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
    </>
  );
}

function SafetyNotice() {
  return (
    <div className="bg-warm/20 text-coffee/80 mb-7 rounded-2xl px-5 py-[14px] text-[13.5px] leading-[1.55]">
      {SAFETY_NOTICE}
    </div>
  );
}

function bookingFormatForAnswer(value: string | null): BookingFormat | null {
  if (value === WORK_FORMATS.online) return "online";
  if (value === WORK_FORMATS.inPerson) return "uzivo";
  return null;
}

function buildSummary(
  answers: IntakeAnswers,
  result: IntakeMatchResult,
  extraText: string,
  chosen: TherapistMatch | null,
): BookingSummary {
  const rows = activeIntakeSteps(answers).map((step) => {
    let answer = answers[step.key] ?? "—";
    if (
      step.key === "reason" &&
      answers.reason === REASONS.other &&
      answers.reasonOtherText.trim()
    ) {
      answer = `${answer} - ${answers.reasonOtherText.trim()}`;
    }
    return { question: step.question, answer };
  });
  const primaryName = result.primaryRecommendation?.therapist.name;
  const alternativeName = result.alternativeRecommendation?.therapist.name;
  const reasons = (chosen ?? result.primaryRecommendation)?.reasons;
  const trimmedExtra = extraText.trim();
  return {
    answers: rows,
    recommendedService: result.recommendedService,
    ...(trimmedExtra ? { extraText: trimmedExtra } : {}),
    ...(primaryName ? { recommendedTherapist: primaryName } : {}),
    ...(alternativeName ? { alternativeTherapist: alternativeName } : {}),
    ...(reasons ? { reasons } : {}),
    ...(answers.format ? { format: answers.format } : {}),
    ...(answers.location ? { location: answers.location } : {}),
    ...(answers.priorTherapy ? { priorTherapy: answers.priorTherapy } : {}),
    ...(result.needsManualReview ? { needsManualReview: true } : {}),
  };
}
