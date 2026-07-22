"use client";

import { useRef, useState } from "react";

import { findTherapist } from "@/content/therapists";

import { intakeFeatureFlags } from "./intake-feature-flags";
import {
  submitPublicIntakeCase,
  toPublicIntakeAnswers,
  type PublicIntakeSubmissionKind,
} from "./public-intake-api";
import { REQUESTER_ROLES, SAFETY_NOTICE, type IntakeAnswers } from "./matching";
import { hasImmediateSafetySignal } from "./safety";

interface IntakeRequestFormProps {
  answers: IntakeAnswers;
  submissionKind: PublicIntakeSubmissionKind;
  preferredTherapistSlug: string | null;
  onBack: () => void;
}

function createIdempotencyKey(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `intake-${Date.now()}-${Math.random().toString(36).slice(2, 18)}`;
}

export function IntakeRequestForm({
  answers,
  submissionKind,
  preferredTherapistSlug,
  onBack,
}: IntakeRequestFormProps) {
  const idempotencyKey = useRef<string>(createIdempotencyKey());
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [replyPreference, setReplyPreference] = useState<"email" | "phone">(
    "email",
  );
  const [dataNoticeAccepted, setDataNoticeAccepted] = useState(false);
  const [requestAccepted, setRequestAccepted] = useState(false);
  const [freeText, setFreeText] = useState("");
  const [subjectIsAware, setSubjectIsAware] = useState<boolean | null>(null);
  const [guardianConsentStatus, setGuardianConsentStatus] = useState<
    "confirmed" | "needs_review" | null
  >(null);
  const [submittedTeamReview, setSubmittedTeamReview] = useState(false);
  const [priorityReview, setPriorityReview] = useState(false);
  const [state, setState] = useState<
    "idle" | "submitting" | "success" | "error"
  >("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const isGuardian = answers.requesterRole === REQUESTER_ROLES.guardian;
  const isAdolescent = answers.requesterRole === REQUESTER_ROLES.adolescent;
  const isControlledMinorFlow = isGuardian || isAdolescent;
  const allowsFreeText = !isAdolescent;
  const safetySignal = allowsFreeText && hasImmediateSafetySignal(freeText);
  const effectiveSubmissionKind: PublicIntakeSubmissionKind =
    safetySignal || isControlledMinorFlow ? "team_review" : submissionKind;

  const title =
    effectiveSubmissionKind === "request"
      ? "Pošaljite zahtev"
      : "Neka tim pregleda zahtev";
  const preferredTherapist = preferredTherapistSlug
    ? findTherapist(preferredTherapistSlug)
    : undefined;

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setState("submitting");
    setErrorMessage("");

    try {
      const response = await submitPublicIntakeCase(
        {
          submissionKind: effectiveSubmissionKind,
          answers: toPublicIntakeAnswers(answers),
          contact: {
            fullName: fullName.trim(),
            email: email.trim(),
            phone: phone.trim() || null,
            replyPreference,
          },
          acknowledgements: [
            {
              kind: "intake_data_processing_notice",
              documentVersion: intakeFeatureFlags.dataProcessingNoticeVersion,
              locale: "sr-Latn",
            },
            {
              kind: "intake_request_acknowledgement",
              documentVersion: intakeFeatureFlags.requestAcknowledgementVersion,
              locale: "sr-Latn",
            },
          ],
          freeText: allowsFreeText ? freeText.trim() || null : null,
          source: "matching",
          preferredTherapistSlug,
          subjectIsAware: isGuardian ? subjectIsAware : null,
          guardianConsentStatus: isGuardian
            ? (guardianConsentStatus ?? "not_applicable")
            : "not_applicable",
        },
        idempotencyKey.current,
      );
      setSubmittedTeamReview(response.submissionKind === "team_review");
      setPriorityReview(response.reviewPriority === "priority");
      setState("success");
    } catch {
      setState("error");
      setErrorMessage(
        "Zahtev trenutno ne može da se pošalje. Proverite podatke i pokušajte ponovo.",
      );
    }
  };

  if (state === "success") {
    return (
      <section aria-live="polite">
        <p className="text-sage mb-3 text-[12.5px] font-semibold tracking-[0.16em] uppercase">
          Zahtev je poslat
        </p>
        <h2 className="text-forest mb-3 font-serif text-[28px] leading-[1.14] font-normal md:text-[34px]">
          Hvala što ste nam se javili.
        </h2>
        <p className="text-coffee/75 max-w-[620px] text-[15px] leading-[1.65]">
          {priorityReview
            ? "Zahtev je prosleđen timu za prioritetni ljudski pregled. Platforma nije hitna služba i ne može obećati hitan odgovor."
            : submittedTeamReview
              ? "Tim je primio vaš zahtev i javiće vam se sa predlogom sledećeg koraka."
              : "Poslali ste zahtev za izabranu podršku. Terapeut će proveriti dostupnost i potvrditi sledeći korak ili predložiti drugu mogućnost."}
        </p>
        <p className="bg-warm/20 text-coffee/80 mt-6 max-w-[620px] rounded-2xl px-5 py-4 text-[13.5px] leading-[1.55]">
          Slanje zahteva nije potvrda termina niti rezervacija.
        </p>
      </section>
    );
  }

  return (
    <form onSubmit={submit}>
      <p className="text-sage mb-3 text-[12.5px] font-semibold tracking-[0.16em] uppercase">
        Sledeći korak
      </p>
      <h2 className="text-forest mb-3 font-serif text-[28px] leading-[1.14] font-normal md:text-[34px]">
        {title}
      </h2>
      <p className="text-coffee/75 mb-7 max-w-[660px] text-[15px] leading-[1.65]">
        Kontakt ostavljate samo da bismo vam odgovorili na zahtev. Ovo nije
        potvrda termina.
      </p>
      {preferredTherapist ? (
        <p className="bg-meadow/25 text-coffee/75 mb-6 max-w-[660px] rounded-2xl px-4 py-3 text-[13.5px] leading-[1.55]">
          Vaš izbor terapeuta: {preferredTherapist.name}. Tim proverava da li je
          taj sledeći korak odgovarajući i dostupan.
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-coffee/75 flex flex-col gap-2 text-[14px] font-medium sm:col-span-2">
          {isGuardian ? "Ime i prezime roditelja/staratelja" : "Ime i prezime"}
          <input
            required
            minLength={2}
            maxLength={160}
            autoComplete="name"
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            className="border-coffee/15 bg-surface text-coffee focus:border-sage min-h-11 rounded-xl border px-4 py-3 text-[15px] outline-none"
          />
        </label>
        <label className="text-coffee/75 flex flex-col gap-2 text-[14px] font-medium">
          Email
          <input
            required
            type="email"
            maxLength={320}
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="border-coffee/15 bg-surface text-coffee focus:border-sage min-h-11 rounded-xl border px-4 py-3 text-[15px] outline-none"
          />
        </label>
        <label className="text-coffee/75 flex flex-col gap-2 text-[14px] font-medium">
          Telefon <span className="text-coffee/45 font-normal">(opciono)</span>
          <input
            required={replyPreference === "phone"}
            type="tel"
            maxLength={80}
            autoComplete="tel"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            className="border-coffee/15 bg-surface text-coffee focus:border-sage min-h-11 rounded-xl border px-4 py-3 text-[15px] outline-none"
          />
        </label>
      </div>

      <fieldset className="mt-6 border-0 p-0">
        <legend className="text-coffee/75 mb-2 text-[14px] font-medium">
          Kako želite da vam odgovorimo?
        </legend>
        <div className="flex flex-wrap gap-3">
          {(
            [
              ["email", "Email"],
              ["phone", "Telefon"],
            ] as const
          ).map(([value, label]) => (
            <label
              key={value}
              className="border-coffee/15 bg-surface text-coffee flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border px-4 py-2 text-[14px]"
            >
              <input
                type="radio"
                name="reply-preference"
                value={value}
                checked={replyPreference === value}
                onChange={() => setReplyPreference(value)}
              />
              {label}
            </label>
          ))}
        </div>
      </fieldset>

      {isGuardian ? (
        <div className="bg-meadow/18 border-sage/20 mt-6 flex flex-col gap-5 rounded-2xl border px-5 py-4">
          <fieldset className="border-0 p-0">
            <legend className="text-coffee/75 mb-2 text-[14px] font-medium">
              Da li je dete upoznato sa ovim zahtevom?
            </legend>
            <div className="flex flex-wrap gap-3">
              <label className="border-coffee/15 bg-surface text-coffee flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border px-4 py-2 text-[14px]">
                <input
                  required
                  type="radio"
                  name="subject-aware"
                  checked={subjectIsAware === true}
                  onChange={() => setSubjectIsAware(true)}
                />
                Da
              </label>
              <label className="border-coffee/15 bg-surface text-coffee flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border px-4 py-2 text-[14px]">
                <input
                  type="radio"
                  name="subject-aware"
                  checked={subjectIsAware === false}
                  onChange={() => setSubjectIsAware(false)}
                />
                Ne
              </label>
            </div>
          </fieldset>
          <fieldset className="border-0 p-0">
            <legend className="text-coffee/75 mb-2 text-[14px] font-medium">
              Status podnošenja zahteva
            </legend>
            <div className="flex flex-col gap-2">
              <label className="text-coffee/75 flex cursor-pointer items-start gap-3 text-[13.5px] leading-[1.5]">
                <input
                  required
                  type="radio"
                  name="guardian-status"
                  checked={guardianConsentStatus === "confirmed"}
                  onChange={() => setGuardianConsentStatus("confirmed")}
                  className="mt-1 h-4 w-4 shrink-0"
                />
                Podnosim zahtev kao roditelj/staratelj.
              </label>
              <label className="text-coffee/75 flex cursor-pointer items-start gap-3 text-[13.5px] leading-[1.5]">
                <input
                  type="radio"
                  name="guardian-status"
                  checked={guardianConsentStatus === "needs_review"}
                  onChange={() => setGuardianConsentStatus("needs_review")}
                  className="mt-1 h-4 w-4 shrink-0"
                />
                Želim da tim prvo proveri koji je sledeći korak.
              </label>
            </div>
          </fieldset>
          <p className="text-coffee/60 text-[12.5px] leading-[1.5]">
            U ovom koraku ne tražimo puno ime deteta ni detalje o terapiji.
          </p>
        </div>
      ) : null}

      {isAdolescent ? (
        <p className="bg-meadow/18 border-sage/20 text-coffee/75 mt-6 rounded-2xl border px-5 py-4 text-[13.5px] leading-[1.55]">
          Tim najpre proverava odgovarajući sledeći korak. Ovim upitnikom ne
          tražimo kontakt roditelja niti dodatnu poruku.
        </p>
      ) : null}

      {allowsFreeText ? (
        <label className="text-coffee/75 mt-6 flex flex-col gap-2 text-[14px] font-medium">
          Želite li nešto da dodate?{" "}
          <span className="text-coffee/45 font-normal">(opciono)</span>
          <textarea
            maxLength={1000}
            rows={4}
            value={freeText}
            onChange={(event) => setFreeText(event.target.value)}
            className="border-coffee/15 bg-surface text-coffee focus:border-sage w-full resize-none rounded-xl border px-4 py-3 text-[15px] leading-[1.5] outline-none"
          />
          <span className="text-coffee/50 text-[12px] font-normal">
            Ovaj tekst nije deo preporuke i ne šalje se email-om.
          </span>
        </label>
      ) : null}

      {safetySignal ? (
        <div
          role="alert"
          className="bg-warm/20 border-warm/45 text-coffee mt-5 rounded-2xl border px-5 py-4 text-[13.5px] leading-[1.55]"
        >
          <strong className="block font-semibold">
            Potrebna je hitna pomoć?
          </strong>
          <p className="mt-1.5">{SAFETY_NOTICE}</p>
          <p className="mt-2">
            Ako pošaljete zahtev, biće prosleđen timu na prioritetni ljudski
            pregled, bez obećanja hitnog odgovora.
          </p>
        </div>
      ) : null}

      <div className="mt-7 flex flex-col gap-3">
        <label className="text-coffee/75 flex cursor-pointer items-start gap-3 text-[13.5px] leading-[1.5]">
          <input
            required
            type="checkbox"
            checked={dataNoticeAccepted}
            onChange={(event) => setDataNoticeAccepted(event.target.checked)}
            className="mt-1 h-4 w-4 shrink-0"
          />
          Upoznat/a sam sa obaveštenjem o obradi podataka za ovaj zahtev.
        </label>
        <label className="text-coffee/75 flex cursor-pointer items-start gap-3 text-[13.5px] leading-[1.5]">
          <input
            required
            type="checkbox"
            checked={requestAccepted}
            onChange={(event) => setRequestAccepted(event.target.checked)}
            className="mt-1 h-4 w-4 shrink-0"
          />
          Razumem da slanje zahteva nije potvrda termina niti rezervacija.
        </label>
      </div>

      {state === "error" ? (
        <p role="alert" className="text-danger mt-5 text-[14px] leading-[1.5]">
          {errorMessage}
        </p>
      ) : null}

      <div className="mt-8 flex flex-wrap items-center gap-4">
        <button
          type="submit"
          disabled={
            state === "submitting" ||
            !dataNoticeAccepted ||
            !requestAccepted ||
            (isGuardian &&
              (subjectIsAware === null || guardianConsentStatus === null))
          }
          className="bg-forest text-canvas hover:bg-forest-hover disabled:bg-forest/45 min-h-11 cursor-pointer rounded-full border-0 px-7 text-[15px] font-semibold transition-colors disabled:cursor-not-allowed"
        >
          {state === "submitting" ? "Slanje..." : "Pošaljite zahtev"}
        </button>
        <button
          type="button"
          onClick={onBack}
          className="text-coffee/70 hover:text-forest min-h-11 cursor-pointer border-0 bg-transparent px-2 text-[14px] font-semibold underline underline-offset-[3px]"
        >
          Nazad na predlog
        </button>
      </div>
    </form>
  );
}
