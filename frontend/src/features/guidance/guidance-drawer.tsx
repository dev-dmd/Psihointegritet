"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { MonogramAvatar } from "@/components/ui/monogram-avatar";
import { therapists } from "@/content/therapists";
import {
  BookingRequestForm,
  type BookingSummary,
} from "@/features/booking/booking-request-form";
import { cn } from "@/helpers/cn";

import type { GuidanceEntry } from "./guidance-context";
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

type Screen = "chooser" | "questions" | "result" | "team";

interface GuidanceDrawerProps {
  entry: GuidanceEntry;
  onClose: () => void;
}

/**
 * Guided-selection drawer v2 (Anja's questionnaire): optional chooser → one
 * question per screen (conditional child-age and location steps) →
 * explainable result with a recommended service and inline booking request.
 * No separate intro screen — questions open immediately (CTO, 2026-07-20);
 * the non-diagnostic note renders above the first question instead.
 * Answers live only in memory — closing the drawer discards everything (T13).
 * No scores are ever shown; scoring lives in matching.ts, never here.
 */
export function GuidanceDrawer({ entry, onClose }: GuidanceDrawerProps) {
  const [screen, setScreen] = useState<Screen>(
    entry === "chooser" ? "chooser" : "questions",
  );
  const [stepIndex, setStepIndex] = useState(0);
  const [answers, setAnswers] = useState<IntakeAnswers>(emptyIntakeAnswers);
  const [extraText, setExtraText] = useState("");
  const advanceTimer = useRef<number | null>(null);
  const headingRef = useRef<HTMLHeadingElement | null>(null);

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

  const steps = useMemo(() => activeIntakeSteps(answers), [answers]);
  const safeIndex = Math.min(stepIndex, steps.length - 1);
  const currentStep = steps[safeIndex];

  const result = useMemo(
    () =>
      screen === "result" || screen === "team" ? evaluateIntake(answers) : null,
    [screen, answers],
  );

  // Screen readers and keyboard users land on the new question title.
  useEffect(() => {
    headingRef.current?.focus();
  }, [screen, safeIndex]);

  const advanceFrom = (next: IntakeAnswers) => {
    const nextSteps = activeIntakeSteps(next);
    const key = currentStep?.key;
    const index = nextSteps.findIndex((step) => step.key === key);
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
    // Changing an earlier answer resets the answers that depend on it.
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

    // „Drugo" shows an optional free-text field — no auto-advance, the user
    // continues with the explicit „Dalje" button.
    if (key === "reason" && option === REASONS.other) {
      return;
    }
    advanceFrom(next);
  };

  const goBack = () => {
    if (screen === "team") {
      setScreen("result");
      return;
    }
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
      }
    }
  };

  const stepLabel =
    screen === "team"
      ? "Zahtev za tim"
      : screen === "result"
        ? "Vaš predlog"
        : screen === "questions"
          ? `Pitanje ${safeIndex + 1} od ${steps.length}`
          : "Zakazivanje termina";

  const canGoBack =
    screen === "team" ||
    screen === "result" ||
    (screen === "questions" && (safeIndex > 0 || entry === "chooser"));

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

        {screen === "questions" ? (
          <div className="bg-coffee/8 h-[3px]">
            <div
              className="bg-sage ease-soft h-full rounded-full transition-all duration-[400ms]"
              style={{ width: `${((safeIndex + 1) / steps.length) * 100}%` }}
            />
          </div>
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
          <div className="flex-1 overflow-y-auto px-6 py-9 md:px-10 md:py-11">
            <SafetyNotice />
            {safeIndex === 0 ? (
              <p className="text-coffee/60 mb-6 text-[13px] leading-[1.55]">
                {INTAKE_INTRO.note}
              </p>
            ) : null}
            <h3
              ref={headingRef}
              tabIndex={-1}
              className="text-forest mb-[30px] font-serif text-[26px] leading-[1.12] font-normal tracking-[-0.01em] text-pretty outline-none md:text-[32px]"
            >
              {currentStep.question}
            </h3>
            <div className="flex flex-col gap-2.5">
              {currentStep.options.map((option) => {
                const selected = answers[currentStep.key] === option;
                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() => selectOption(currentStep.key, option)}
                    className={cn(
                      "text-coffee hover:border-sage flex cursor-pointer items-center justify-between gap-4 rounded-2xl border-[1.5px] px-[22px] py-[15px] text-left font-sans text-[15.5px] font-medium transition-all duration-200",
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
                  {OTHER_TEXT_PROMPT}{" "}
                  <span className="text-coffee/45">Opciono</span>
                </label>
                <textarea
                  id="guidance-other-text"
                  value={answers.reasonOtherText}
                  onChange={(event) =>
                    setAnswers((prev) => ({
                      ...prev,
                      reasonOtherText: event.target.value,
                    }))
                  }
                  rows={3}
                  className="border-coffee/15 bg-surface text-coffee focus:border-sage w-full resize-none rounded-2xl border px-4 py-3 text-[15px] leading-[1.5] outline-none"
                />
                <button
                  type="button"
                  onClick={() => advanceFrom(answers)}
                  className="bg-forest text-canvas hover:bg-forest-hover mt-4 cursor-pointer rounded-full border-0 px-7 py-[14px] text-[15px] font-semibold transition-colors"
                >
                  Dalje
                </button>
              </>
            ) : null}
          </div>
        ) : null}

        {screen === "result" && result ? (
          <ResultScreen
            headingRef={headingRef}
            result={result}
            answers={answers}
            extraText={extraText}
            onExtraTextChange={setExtraText}
            onTeamReview={() => setScreen("team")}
            onClose={onClose}
          />
        ) : null}

        {screen === "team" && result ? (
          <TeamScreen
            headingRef={headingRef}
            summary={buildSummary(answers, result, extraText, null)}
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

/**
 * Builds the plain-language summary emailed with a booking request. Answers
 * only — internal scores never leave matching.ts.
 */
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
      answer = `${answer} — ${answers.reasonOtherText.trim()}`;
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

/** Always-visible, non-diagnostic / not-an-emergency notice above the questions. */
function SafetyNotice() {
  return (
    <div className="bg-warm/20 text-coffee/80 mb-7 rounded-2xl px-5 py-[14px] text-[13.5px] leading-[1.55]">
      {SAFETY_NOTICE}
    </div>
  );
}

/** Two entry paths: guided questionnaire vs. „I already know who I want". */
function ChooserScreen({
  headingRef,
  onQuiz,
  onClose,
}: {
  headingRef: React.RefObject<HTMLHeadingElement | null>;
  onQuiz: () => void;
  onClose: () => void;
}) {
  return (
    <div className="flex-1 overflow-y-auto px-6 py-9 md:px-10 md:py-11">
      <h3
        ref={headingRef}
        tabIndex={-1}
        className="text-forest mb-2 font-serif text-[28px] leading-[1.12] font-normal text-pretty outline-none md:text-[32px]"
      >
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
  headingRef,
  result,
  answers,
  extraText,
  onExtraTextChange,
  onTeamReview,
  onClose,
}: {
  headingRef: React.RefObject<HTMLHeadingElement | null>;
  result: IntakeMatchResult;
  answers: IntakeAnswers;
  extraText: string;
  onExtraTextChange: (value: string) => void;
  onTeamReview: () => void;
  onClose: () => void;
}) {
  const [showAlternative, setShowAlternative] = useState(false);
  const [bookingFor, setBookingFor] = useState<string | null>(null);

  const primary = result.primaryRecommendation;
  const alternative = result.alternativeRecommendation;
  const shown: TherapistMatch[] = result.showBoth
    ? [primary, alternative].filter((m): m is TherapistMatch => m !== null)
    : primary
      ? [primary]
      : [];

  const minorNote =
    answers.participants === PARTICIPANTS.parentChild &&
    answers.childAgeGroup !== null &&
    answers.childAgeGroup !== ADULT_CHILD_AGE_GROUP;

  return (
    <div className="flex-1 overflow-y-auto px-6 py-9 md:px-10 md:py-11">
      <div className="text-sage mb-3.5 text-[12.5px] font-semibold tracking-[0.16em] uppercase">
        Predlog na osnovu vaših odgovora
      </div>

      <h3
        ref={headingRef}
        tabIndex={-1}
        className="text-forest mb-2 font-serif text-[24px] leading-[1.15] font-normal text-pretty outline-none"
      >
        Preporučena usluga: {result.recommendedService}
      </h3>

      {result.onlineFallback ? (
        <p className="bg-warm/20 text-coffee/80 mb-4 rounded-2xl px-4 py-3 text-[13.5px] leading-[1.55]">
          Na izabranoj lokaciji trenutno nema rada uživo — svi terapeuti su
          dostupni online.
        </p>
      ) : null}

      {result.needsManualReview ? (
        <p className="bg-warm/20 text-coffee/80 mb-4 rounded-2xl px-4 py-3 text-[13.5px] leading-[1.55]">
          Pošto ste izabrali „Drugo“, tim će dodatno pregledati vaš zahtev i
          predložiti najbolji sledeći korak.
        </p>
      ) : null}

      {result.showBoth && shown.length > 1 ? (
        <p className="text-coffee/70 mb-4 text-[14.5px] leading-[1.6]">
          Oba terapeuta rade sa izabranim oblastima — izaberite osobu koja vam
          više odgovara.
        </p>
      ) : null}

      <div className="flex flex-col gap-4">
        {shown.map((match) => (
          <TherapistResultCard
            key={match.therapist.slug}
            match={match}
            bookingOpen={bookingFor === match.therapist.slug}
            onToggleBooking={() =>
              setBookingFor((prev) =>
                prev === match.therapist.slug ? null : match.therapist.slug,
              )
            }
            summary={buildSummary(answers, result, extraText, match)}
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
              bookingOpen={bookingFor === alternative.therapist.slug}
              onToggleBooking={() =>
                setBookingFor((prev) =>
                  prev === alternative.therapist.slug
                    ? null
                    : alternative.therapist.slug,
                )
              }
              summary={buildSummary(answers, result, extraText, alternative)}
              onClose={onClose}
            />
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setShowAlternative(true)}
            className="text-coffee/70 hover:text-forest mt-4 inline-flex cursor-pointer items-center gap-2 border-0 bg-transparent text-[14px] font-semibold underline underline-offset-[3px] transition-colors"
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
          Tekst ostaje na vašem uređaju i šalje se samo ako pošaljete zahtev za
          termin.
        </p>
      </div>

      <button
        type="button"
        onClick={onTeamReview}
        className="text-coffee/70 hover:text-forest mt-5 inline-flex cursor-pointer items-center gap-2 border-0 bg-transparent text-[14px] font-semibold underline underline-offset-[3px] transition-colors"
      >
        Želim da tim pregleda moj zahtev
      </button>

      <div className="bg-meadow/25 text-coffee/70 mt-6 rounded-2xl px-5 py-[18px] text-[13.5px] leading-[1.6]">
        Vaši odgovori se ne čuvaju i ne prate — šalju se timu isključivo uz vaš
        zahtev za termin.
      </div>
    </div>
  );
}

function TherapistResultCard({
  match,
  bookingOpen,
  onToggleBooking,
  summary,
  onClose,
}: {
  match: TherapistMatch;
  bookingOpen: boolean;
  onToggleBooking: () => void;
  summary: BookingSummary;
  onClose: () => void;
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
        <button
          type="button"
          onClick={onToggleBooking}
          className="bg-forest text-canvas hover:bg-forest-hover cursor-pointer rounded-full border-0 px-6 py-3 text-[14px] font-semibold transition-colors"
        >
          {bookingOpen ? "Sakrij formu" : "Zatražite termin"}
        </button>
        <Link
          href={`/tim/${therapist.slug}`}
          onClick={onClose}
          className="text-coffee/70 hover:text-forest text-[14px] font-medium underline underline-offset-[3px] transition-colors"
        >
          Pogledajte profil
        </Link>
      </div>
      {bookingOpen ? (
        <div className="mt-5">
          <BookingRequestForm
            therapistSlug={therapist.slug}
            therapistName={therapist.name}
            tone="light"
            summary={summary}
          />
        </div>
      ) : null}
    </div>
  );
}

/**
 * Unassigned request — the whole team receives it and confirms the best fit.
 */
function TeamScreen({
  headingRef,
  summary,
}: {
  headingRef: React.RefObject<HTMLHeadingElement | null>;
  summary: BookingSummary;
}) {
  return (
    <div className="flex-1 overflow-y-auto px-6 py-9 md:px-10 md:py-11">
      <div className="text-sage mb-3.5 text-[12.5px] font-semibold tracking-[0.16em] uppercase">
        Zahtev za tim
      </div>
      <h3
        ref={headingRef}
        tabIndex={-1}
        className="text-forest mb-3 font-serif text-[26px] leading-[1.15] font-normal text-pretty outline-none"
      >
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
      <p className="text-coffee/70 mt-4 mb-5 text-[14px] leading-[1.6]">
        Vaš zahtev sa sažetkom odgovora stiže celom timu, a javiće vam se
        terapeut koji najbolje odgovara vašim potrebama.
      </p>
      <BookingRequestForm
        therapistSlug={null}
        therapistName="Psihointegritet tim"
        tone="surface"
        summary={summary}
      />
    </div>
  );
}
