"use client";

import Link from "next/link";
import type { Route } from "next";
import { useEffect, useMemo, useRef, useState } from "react";

import { MonogramAvatar } from "@/components/ui/monogram-avatar";
import { findService, formatRsd, serviceSlugForName } from "@/content/services";
import { therapists } from "@/content/therapists";
import {
  buildBookingHref,
  type BookingFormat,
} from "@/features/booking/booking-context";
import { storeBookingSummary } from "@/features/booking/booking-summary-storage";
import type { BookingSummary } from "@/features/booking/booking-types";
import { cn } from "@/helpers/cn";

import {
  ADULT_SUBJECT_AGE_BAND,
  INTAKE_INTRO,
  MINOR_NOTE,
  PARTICIPANTS,
  REQUESTER_ROLES,
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
import { IntakeRequestForm } from "./intake-request-form";
import { intakeFeatureFlags } from "./intake-feature-flags";
import {
  fetchAuthoritativeIntakeMatch,
  type PublicIntakeSubmissionKind,
} from "./public-intake-api";

export type GuidanceFlowEntry = "chooser" | "quiz" | "page";
type Screen =
  "intro" | "chooser" | "questions" | "information" | "result" | "submit";

interface SubmissionIntent {
  kind: PublicIntakeSubmissionKind;
  preferredTherapistSlug: string | null;
  returnScreen: "chooser" | "result";
}

interface GuidanceFlowProps {
  entry: GuidanceFlowEntry;
  surface: "drawer" | "page";
  onClose?: () => void;
}

/**
 * One shared, non-diagnostic matching flow for the transitional drawer and
 * the canonical `/pronadji-podrsku` page. Matching state is local to the
 * component. The legacy Booking handoff remains available while the production
 * Intake flag is off; when it is on, matching and submission move through the
 * backend-owned contract.
 */
export function GuidanceFlow({ entry, surface, onClose }: GuidanceFlowProps) {
  const [screen, setScreen] = useState<Screen>(
    entry === "page" ? "intro" : entry === "chooser" ? "chooser" : "questions",
  );
  const [stepIndex, setStepIndex] = useState(0);
  const [answers, setAnswers] = useState<IntakeAnswers>(emptyIntakeAnswers);
  const [submissionIntent, setSubmissionIntent] =
    useState<SubmissionIntent | null>(null);
  const [authoritativeMatch, setAuthoritativeMatch] = useState<{
    key: string;
    result: IntakeMatchResult;
  } | null>(null);
  const [matchingErrorKey, setMatchingErrorKey] = useState<string | null>(null);
  const [matchAttempt, setMatchAttempt] = useState(0);
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
  const localResult = useMemo(
    () => (screen === "result" ? evaluateIntake(answers) : null),
    [screen, answers],
  );
  const matchingRequestKey = useMemo(
    () => JSON.stringify({ answers, matchAttempt }),
    [answers, matchAttempt],
  );
  const result = intakeFeatureFlags.publicFlowEnabled
    ? authoritativeMatch?.key === matchingRequestKey
      ? authoritativeMatch.result
      : null
    : localResult;
  const matchingError = matchingErrorKey === matchingRequestKey;

  useEffect(() => {
    if (!intakeFeatureFlags.publicFlowEnabled || screen !== "result") return;

    const controller = new AbortController();
    void fetchAuthoritativeIntakeMatch(answers, controller.signal)
      .then((next) => {
        if (!controller.signal.aborted) {
          setAuthoritativeMatch({ key: matchingRequestKey, result: next });
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setMatchingErrorKey(matchingRequestKey);
        }
      });
    return () => controller.abort();
  }, [answers, matchingRequestKey, screen]);

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
    if (key === "requesterRole") {
      if (option === REQUESTER_ROLES.guardian) {
        next.participants = PARTICIPANTS.parentChild;
        next.subjectAgeBand = null;
      } else if (option === REQUESTER_ROLES.adolescent) {
        next.participants = PARTICIPANTS.alone;
        next.subjectAgeBand = "16–17 godina";
      } else if (option === REQUESTER_ROLES.selfAdult) {
        next.participants = null;
        next.subjectAgeBand = ADULT_SUBJECT_AGE_BAND;
      }
      if (option === REQUESTER_ROLES.informationOnly) {
        setAnswers(next);
        setScreen("information");
        return;
      }
    }
    if (key === "format" && option !== WORK_FORMATS.inPerson) {
      next.location = null;
    }
    setAnswers(next);
    advanceFrom(next);
  };

  const goBack = () => {
    if (screen === "submit") {
      setScreen(submissionIntent?.returnScreen ?? "result");
      return;
    }
    if (screen === "information") {
      setScreen("questions");
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
    screen === "submit" ||
    screen === "information" ||
    (screen === "questions" &&
      (safeIndex > 0 || entry === "chooser" || entry === "page")) ||
    (screen === "chooser" && entry === "page");
  const progress =
    screen === "questions" ? ((safeIndex + 1) / steps.length) * 100 : 0;
  const label =
    screen === "result"
      ? "Vaš predlog"
      : screen === "submit"
        ? "Zahtev"
        : screen === "information"
          ? "Informacije"
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
              onChooseTherapist={
                intakeFeatureFlags.publicFlowEnabled
                  ? (therapistSlug) => {
                      setSubmissionIntent({
                        kind: "team_review",
                        preferredTherapistSlug: therapistSlug,
                        returnScreen: "chooser",
                      });
                      setScreen("submit");
                    }
                  : undefined
              }
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
            />
          ) : null}

          {screen === "information" ? (
            <InformationScreen headingRef={headingRef} onClose={onClose} />
          ) : null}

          {screen === "result" && result ? (
            <ResultScreen
              headingRef={headingRef}
              result={result}
              answers={answers}
              useProductionIntake={intakeFeatureFlags.publicFlowEnabled}
              onStartSubmission={(intent) => {
                setSubmissionIntent(intent);
                setScreen("submit");
              }}
              onClose={onClose}
            />
          ) : null}

          {screen === "result" &&
          intakeFeatureFlags.publicFlowEnabled &&
          !result ? (
            <MatchingStatus
              hasError={matchingError}
              onRetry={() => setMatchAttempt((value) => value + 1)}
            />
          ) : null}

          {screen === "submit" && submissionIntent ? (
            <IntakeRequestForm
              answers={answers}
              submissionKind={submissionIntent.kind}
              preferredTherapistSlug={submissionIntent.preferredTherapistSlug}
              onBack={() => setScreen(submissionIntent.returnScreen)}
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

function InformationScreen({
  headingRef,
  onClose,
}: {
  headingRef: React.RefObject<HTMLHeadingElement | null>;
  onClose?: (() => void) | undefined;
}) {
  return (
    <section>
      <p className="text-sage mb-3 text-[12.5px] font-semibold tracking-[0.16em] uppercase">
        Informacije
      </p>
      <h2
        ref={headingRef}
        tabIndex={-1}
        className="text-forest mb-3 font-serif text-[28px] leading-[1.14] font-normal outline-none md:text-[34px]"
      >
        Upoznajte podršku pre nego što pošaljete zahtev.
      </h2>
      <p className="text-coffee/75 max-w-[660px] text-[15px] leading-[1.65]">
        Možete pogledati terapeute, usluge, formate rada i okvirne cene bez
        ostavljanja kontakta. Kada budete želeli predlog za svoju situaciju,
        vratite se na vođeni izbor.
      </p>
      <div className="mt-7 flex flex-wrap gap-3">
        <Link
          href="/usluge"
          onClick={() => onClose?.()}
          className="bg-forest text-canvas hover:bg-forest-hover inline-flex min-h-11 items-center rounded-full px-6 text-[14px] font-semibold no-underline transition-colors"
        >
          Pogledajte usluge
        </Link>
        <Link
          href="/tim"
          onClick={() => onClose?.()}
          className="border-coffee/25 text-coffee hover:border-sage inline-flex min-h-11 items-center rounded-full border px-6 text-[14px] font-semibold no-underline transition-colors"
        >
          Upoznajte terapeute
        </Link>
      </div>
    </section>
  );
}

function QuestionsScreen({
  headingRef,
  currentStep,
  answers,
  isFirstStep,
  onSelect,
}: {
  headingRef: React.RefObject<HTMLHeadingElement | null>;
  currentStep: ReturnType<typeof activeIntakeSteps>[number];
  answers: IntakeAnswers;
  isFirstStep: boolean;
  onSelect: (key: IntakeStepKey, option: string) => void;
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
        className="text-forest mb-[30px] font-serif text-[26px] leading-[1.12] font-normal text-pretty outline-none md:text-[32px]"
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
    </>
  );
}

function MatchingStatus({
  hasError,
  onRetry,
}: {
  hasError: boolean;
  onRetry: () => void;
}) {
  if (hasError) {
    return (
      <section aria-live="polite">
        <h2 className="text-forest mb-3 font-serif text-[28px] leading-[1.14] font-normal md:text-[34px]">
          Predlog trenutno nije dostupan.
        </h2>
        <p className="text-coffee/75 mb-6 text-[15px] leading-[1.6]">
          Pokušajte ponovo za trenutak ili pregledajte terapeute samostalno.
        </p>
        <button
          type="button"
          onClick={onRetry}
          className="bg-forest text-canvas hover:bg-forest-hover min-h-11 cursor-pointer rounded-full border-0 px-7 text-[15px] font-semibold transition-colors"
        >
          Pokušajte ponovo
        </button>
      </section>
    );
  }

  return (
    <p aria-live="polite" className="text-coffee/70 text-[15px] leading-[1.6]">
      Pripremamo vaš predlog...
    </p>
  );
}

function ResultScreen({
  headingRef,
  result,
  answers,
  useProductionIntake,
  onStartSubmission,
  onClose,
}: {
  headingRef: React.RefObject<HTMLHeadingElement | null>;
  result: IntakeMatchResult;
  answers: IntakeAnswers;
  useProductionIntake: boolean;
  onStartSubmission: (intent: SubmissionIntent) => void;
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
  const controlledMinorFlow = result.controlledMinorFlow;
  const serviceSlug = serviceSlugForName(result.recommendedService);
  const format = bookingFormatForAnswer(answers.format);
  const service =
    !controlledMinorFlow && serviceSlug ? findService(serviceSlug) : undefined;

  const summaryFor = (match: TherapistMatch | null): BookingSummary =>
    buildSummary(answers, result, match);
  const teamHref = buildBookingHref({
    service: controlledMinorFlow ? undefined : serviceSlug,
    format,
    source: "matching",
  });

  return (
    <>
      <div className="text-sage mb-3.5 text-[12.5px] font-semibold tracking-[0.16em] uppercase">
        {controlledMinorFlow
          ? "Sledeći korak uz podršku tima"
          : "Predlog na osnovu vaših odgovora"}
      </div>
      <h2
        ref={headingRef}
        tabIndex={-1}
        className="text-forest mb-2 font-serif text-[24px] leading-[1.15] font-normal text-pretty outline-none"
      >
        {controlledMinorFlow
          ? "Tim će najpre proveriti odgovarajući sledeći korak."
          : `Preporučena usluga: ${result.recommendedService}`}
      </h2>
      {service ? (
        <p className="text-coffee/70 mb-4 text-[14.5px] leading-[1.55]">
          {service.duration} · okvirno {formatRsd(service.priceAmount)}
        </p>
      ) : null}
      {result.onlineFallback ? (
        <p className="bg-warm/20 text-coffee/80 mb-4 rounded-2xl px-4 py-3 text-[13.5px] leading-[1.55]">
          Na izabranoj lokaciji trenutno nema rada uživo - svi terapeuti su
          dostupni online.
        </p>
      ) : null}
      {result.needsManualReview ? (
        <p className="bg-warm/20 text-coffee/80 mb-4 rounded-2xl px-4 py-3 text-[13.5px] leading-[1.55]">
          {controlledMinorFlow
            ? "Za ovaj tok je potreban pregled tima pre potvrđivanja usluge, terapeuta ili termina."
            : "Za ovaj put je potreban pregled tima pre sledećeg koraka."}
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
            href={
              useProductionIntake || controlledMinorFlow
                ? undefined
                : buildBookingHref({
                    service: serviceSlug,
                    therapist: match.therapist.slug,
                    format,
                    source: "matching",
                  })
            }
            summary={
              useProductionIntake || controlledMinorFlow
                ? undefined
                : summaryFor(match)
            }
            onRequest={
              useProductionIntake &&
              !result.needsManualReview &&
              !controlledMinorFlow
                ? () =>
                    onStartSubmission({
                      kind: "request",
                      preferredTherapistSlug: match.therapist.slug,
                      returnScreen: "result",
                    })
                : undefined
            }
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
              href={
                useProductionIntake || controlledMinorFlow
                  ? undefined
                  : buildBookingHref({
                      service: serviceSlug,
                      therapist: alternative.therapist.slug,
                      format,
                      source: "matching",
                    })
              }
              summary={
                useProductionIntake || controlledMinorFlow
                  ? undefined
                  : summaryFor(alternative)
              }
              onRequest={
                useProductionIntake &&
                !result.needsManualReview &&
                !controlledMinorFlow
                  ? () =>
                      onStartSubmission({
                        kind: "request",
                        preferredTherapistSlug: alternative.therapist.slug,
                        returnScreen: "result",
                      })
                  : undefined
              }
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

      {controlledMinorFlow ? (
        <p className="text-coffee/70 bg-warm/20 mt-4 rounded-2xl px-4 py-3 text-[13.5px] leading-[1.55]">
          {MINOR_NOTE}
        </p>
      ) : null}

      <p className="text-coffee/60 mt-5 text-[13.5px] leading-[1.55]">
        Rezultat je objašnjiv predlog; konačan izbor je vaš.
      </p>
      {useProductionIntake ? (
        <button
          type="button"
          onClick={() =>
            onStartSubmission({
              kind: "team_review",
              preferredTherapistSlug: null,
              returnScreen: "result",
            })
          }
          className="text-coffee/70 hover:text-forest mt-5 inline-flex min-h-11 cursor-pointer items-center gap-2 border-0 bg-transparent text-[14px] font-semibold underline underline-offset-[3px] transition-colors"
        >
          {controlledMinorFlow
            ? "Pošaljite zahtev timu"
            : "Neka tim pregleda moj zahtev"}
        </button>
      ) : (
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
      )}
      <div className="bg-meadow/25 text-coffee/70 mt-6 rounded-2xl px-5 py-[18px] text-[13.5px] leading-[1.6]">
        Kontakt tražimo tek kada odlučite da pošaljete zahtev.
      </div>
    </>
  );
}

function TherapistResultCard({
  match,
  href,
  summary,
  onRequest,
  onClose,
}: {
  match: TherapistMatch;
  href?: string | undefined;
  summary?: BookingSummary | undefined;
  onRequest?: (() => void) | undefined;
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
        {onRequest ? (
          <button
            type="button"
            onClick={onRequest}
            className="bg-forest text-canvas hover:bg-forest-hover inline-flex min-h-11 cursor-pointer items-center rounded-full border-0 px-6 text-[14px] font-semibold transition-colors"
          >
            Pošaljite zahtev
          </button>
        ) : null}
        {href && summary ? (
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
        ) : null}
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
  onChooseTherapist,
  onClose,
}: {
  headingRef: React.RefObject<HTMLHeadingElement | null>;
  onQuiz: () => void;
  onChooseTherapist?: ((therapistSlug: string) => void) | undefined;
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
        Izaberite način koji vam više odgovara.
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
        {therapists.map((therapist) => {
          const content = (
            <>
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
            </>
          );
          const className =
            "bg-surface border-coffee/8 hover:shadow-row-hover flex items-center gap-4 rounded-[18px] border px-5 py-3.5 text-left no-underline transition-shadow duration-200";

          return onChooseTherapist ? (
            <button
              key={therapist.slug}
              type="button"
              onClick={() => onChooseTherapist(therapist.slug)}
              className={`${className} w-full cursor-pointer`}
            >
              {content}
            </button>
          ) : (
            <Link
              key={therapist.slug}
              href={
                buildBookingHref({
                  therapist: therapist.slug,
                  source: "therapist",
                }) as Route
              }
              onClick={() => onClose?.()}
              className={className}
            >
              {content}
            </Link>
          );
        })}
      </div>
    </>
  );
}

function SafetyNotice() {
  return (
    <aside className="bg-warm/20 text-coffee/80 mb-7 rounded-2xl px-5 py-[14px] text-[13.5px] leading-[1.55]">
      <strong className="text-coffee block font-semibold">
        Potrebna vam je hitna pomoć?
      </strong>
      <p className="mt-1.5">{SAFETY_NOTICE}</p>
    </aside>
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
  chosen: TherapistMatch | null,
): BookingSummary {
  const rows = activeIntakeSteps(answers).map((step) => ({
    question: step.question,
    answer: answers[step.key] ?? "—",
  }));
  const primaryName = result.primaryRecommendation?.therapist.name;
  const alternativeName = result.alternativeRecommendation?.therapist.name;
  const reasons = (chosen ?? result.primaryRecommendation)?.reasons;
  return {
    answers: rows,
    recommendedService: result.recommendedService,
    ...(primaryName ? { recommendedTherapist: primaryName } : {}),
    ...(alternativeName ? { alternativeTherapist: alternativeName } : {}),
    ...(reasons ? { reasons } : {}),
    ...(answers.format ? { format: answers.format } : {}),
    ...(answers.location ? { location: answers.location } : {}),
    ...(answers.priorTherapy ? { priorTherapy: answers.priorTherapy } : {}),
    ...(result.needsManualReview ? { needsManualReview: true } : {}),
  };
}
