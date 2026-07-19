"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

import {
  COMPANY_INTRO,
  COMPANY_PRICE_ON_REQUEST,
  companySteps,
  emptyCompanyAnswers,
  recommendCompanyModel,
  type CompanyAnswers,
  type CompanyStepKey,
} from "@/content/company";
import { cn } from "@/helpers/cn";

type Screen = "intro" | "questions" | "recommendation" | "contact" | "done";

interface Contact {
  companyName: string;
  contactName: string;
  email: string;
  phone: string;
  message: string;
  consent: boolean;
}

const emptyContact: Contact = {
  companyName: "",
  contactName: "",
  email: "",
  phone: "",
  message: "",
  consent: false,
};

interface CompanyConfiguratorDrawerProps {
  onClose: () => void;
}

/**
 * B2B configurator drawer — „Kako možemo pomoći vašoj organizaciji?".
 * Four questions (employees / goals / topics / format) → deterministic model
 * from recommendCompanyModel → contact form → email to the team. Demo only:
 * no persistence, no prices (everything is „Cena po ponudi"), no employee
 * health data.
 */
export function CompanyConfiguratorDrawer({
  onClose,
}: CompanyConfiguratorDrawerProps) {
  const [screen, setScreen] = useState<Screen>("intro");
  const [stepIndex, setStepIndex] = useState(0);
  const [answers, setAnswers] = useState<CompanyAnswers>(emptyCompanyAnswers);
  const [contact, setContact] = useState<Contact>(emptyContact);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
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

  const safeIndex = Math.min(stepIndex, companySteps.length - 1);
  const currentStep = companySteps[safeIndex];
  const model = useMemo(() => recommendCompanyModel(answers), [answers]);

  // Keyboard users land on the new question instead of a stale option.
  useEffect(() => {
    headingRef.current?.focus();
  }, [screen, safeIndex]);

  const advance = () => {
    if (safeIndex >= companySteps.length - 1) {
      setScreen("recommendation");
    } else {
      advanceTimer.current = window.setTimeout(
        () => setStepIndex(safeIndex + 1),
        160,
      );
    }
  };

  const selectSingle = (key: CompanyStepKey, option: string) => {
    setAnswers((prev) => ({ ...prev, [key]: option }));
    advance();
  };

  const toggleMulti = (key: "goals" | "topics", option: string) => {
    setAnswers((prev) => {
      const list = prev[key];
      return {
        ...prev,
        [key]: list.includes(option)
          ? list.filter((item) => item !== option)
          : [...list, option],
      };
    });
  };

  const goBack = () => {
    if (screen === "contact") {
      setScreen("recommendation");
      return;
    }
    if (screen === "recommendation") {
      setScreen("questions");
      setStepIndex(companySteps.length - 1);
      return;
    }
    if (safeIndex > 0) {
      setStepIndex(safeIndex - 1);
    } else {
      setScreen("intro");
    }
  };

  const multiValue = (key: CompanyStepKey): string[] =>
    key === "goals" ? answers.goals : key === "topics" ? answers.topics : [];

  const multiCanAdvance =
    !currentStep?.multi || multiValue(currentStep.key).length > 0;

  const contactValid =
    contact.companyName.trim() &&
    contact.contactName.trim() &&
    /.+@.+\..+/.test(contact.email) &&
    contact.consent;

  const submit = async () => {
    setSending(true);
    setError(null);
    try {
      const response = await fetch("/api/company-inquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: { name: model.name, price: COMPANY_PRICE_ON_REQUEST },
          answers: {
            employees: answers.employees,
            goals: answers.goals,
            topics: answers.topics,
            format: answers.format,
          },
          contact: {
            companyName: contact.companyName.trim(),
            contactName: contact.contactName.trim(),
            email: contact.email.trim(),
            phone: contact.phone.trim() || undefined,
            message: contact.message.trim() || undefined,
          },
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
      ? "Upit poslat"
      : screen === "contact"
        ? "Kontakt"
        : screen === "recommendation"
          ? "Naš predlog"
          : screen === "questions"
            ? `Korak ${safeIndex + 1} od ${companySteps.length}`
            : "Rad sa kompanijama";

  const canGoBack = screen !== "intro" && screen !== "done";

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
        aria-label="Rad sa kompanijama"
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

        {screen === "intro" ? (
          <div className="flex-1 overflow-y-auto px-6 py-9 md:px-10 md:py-11">
            <h3
              ref={headingRef}
              tabIndex={-1}
              className="text-forest mb-3 font-serif text-[28px] leading-[1.12] font-normal text-pretty outline-none md:text-[32px]"
            >
              {COMPANY_INTRO.title}
            </h3>
            <p className="text-coffee/70 mb-5 text-[15px] leading-[1.65]">
              {COMPANY_INTRO.description}
            </p>
            <ul className="mb-8 flex flex-wrap gap-2">
              {COMPANY_INTRO.offer.map((item) => (
                <li
                  key={item}
                  className="bg-meadow/28 text-coffee rounded-full px-3.5 py-1.5 text-[13px] font-medium"
                >
                  {item}
                </li>
              ))}
            </ul>
            <button
              type="button"
              onClick={() => setScreen("questions")}
              className="bg-forest text-canvas hover:bg-forest-hover cursor-pointer rounded-full border-0 px-7 py-[15px] text-[15px] font-semibold transition-colors"
            >
              {COMPANY_INTRO.cta}
            </button>
          </div>
        ) : null}

        {screen === "questions" && currentStep ? (
          <div className="flex-1 overflow-y-auto px-6 py-9 md:px-10 md:py-11">
            <h3
              ref={headingRef}
              tabIndex={-1}
              className="text-forest mb-[26px] font-serif text-[24px] leading-[1.14] font-normal tracking-[-0.01em] text-pretty outline-none md:text-[30px]"
            >
              {currentStep.question}
            </h3>
            <div className="flex flex-col gap-2.5">
              {currentStep.options.map((option) => {
                const selected = currentStep.multi
                  ? multiValue(currentStep.key).includes(option)
                  : answers[currentStep.key] === option;
                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() =>
                      currentStep.multi
                        ? toggleMulti(
                            currentStep.key as "goals" | "topics",
                            option,
                          )
                        : selectSingle(currentStep.key, option)
                    }
                    className={cn(
                      "text-coffee hover:border-sage flex cursor-pointer items-center justify-between gap-4 rounded-2xl border-[1.5px] px-[22px] py-[15px] text-left font-sans text-[15.5px] font-medium transition-all duration-200",
                      selected
                        ? "border-sage bg-meadow/30"
                        : "border-coffee/12 bg-surface",
                    )}
                  >
                    <span>{option}</span>
                    <span aria-hidden className="text-sage text-[15px]">
                      {selected ? (currentStep.multi ? "✓" : "●") : ""}
                    </span>
                  </button>
                );
              })}
            </div>

            {currentStep.multi ? (
              <button
                type="button"
                onClick={advance}
                disabled={!multiCanAdvance}
                className="bg-forest text-canvas hover:bg-forest-hover mt-6 cursor-pointer rounded-full border-0 px-7 py-[14px] text-[15px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50"
              >
                Dalje
              </button>
            ) : null}
          </div>
        ) : null}

        {screen === "recommendation" ? (
          <div className="flex-1 overflow-y-auto px-6 py-9 md:px-10 md:py-11">
            <div className="text-sage mb-3 text-[12.5px] font-semibold tracking-[0.16em] uppercase">
              Na osnovu vaših odgovora preporučujemo
            </div>
            <h3
              ref={headingRef}
              tabIndex={-1}
              className="text-forest mb-3 font-serif text-[30px] leading-[1.1] font-normal text-pretty outline-none"
            >
              {model.name}
            </h3>
            <p className="text-coffee/70 mb-5 text-[15px] leading-[1.6]">
              {model.description}
            </p>
            <div className="bg-meadow/20 mb-5 flex flex-col gap-2 rounded-2xl px-5 py-4">
              {answers.employees ? (
                <div className="text-coffee text-[13.5px]">
                  <span className="font-semibold">Veličina tima:</span>{" "}
                  {answers.employees} zaposlenih
                </div>
              ) : null}
              {answers.topics.length > 0 ? (
                <div className="text-coffee text-[13.5px]">
                  <span className="font-semibold">Teme:</span>{" "}
                  {answers.topics.join(", ")}
                </div>
              ) : null}
              {answers.format ? (
                <div className="text-coffee text-[13.5px]">
                  <span className="font-semibold">Format:</span>{" "}
                  {answers.format}
                </div>
              ) : null}
            </div>
            <div className="mb-6">
              <div className="text-sage mb-1.5 text-[11.5px] font-semibold tracking-[0.14em] uppercase">
                Cena
              </div>
              <div className="text-forest font-serif text-[24px]">
                {COMPANY_PRICE_ON_REQUEST}
              </div>
            </div>
            <p className="text-coffee/55 mb-6 text-[12.5px] leading-[1.55]">
              Konačnu ponudu, obim i uslove saradnje definišemo u razgovoru,
              prema potrebama vaše organizacije.
            </p>
            <button
              type="button"
              onClick={() => setScreen("contact")}
              className="bg-forest text-canvas hover:bg-forest-hover cursor-pointer rounded-full border-0 px-7 py-[15px] text-[15px] font-semibold transition-colors"
            >
              Zatražite ponudu
            </button>
          </div>
        ) : null}

        {screen === "contact" ? (
          <div className="flex-1 overflow-y-auto px-6 py-9 md:px-10 md:py-11">
            <h3
              ref={headingRef}
              tabIndex={-1}
              className="text-forest mb-5 font-serif text-[26px] leading-[1.12] font-normal text-pretty outline-none"
            >
              Kontakt za ponudu
            </h3>
            <div className="flex flex-col gap-3.5">
              <Field
                label="Naziv kompanije *"
                value={contact.companyName}
                onChange={(v) => setContact((c) => ({ ...c, companyName: v }))}
              />
              <Field
                label="Ime i prezime kontakt osobe *"
                value={contact.contactName}
                onChange={(v) => setContact((c) => ({ ...c, contactName: v }))}
              />
              <Field
                label="Poslovni email *"
                type="email"
                value={contact.email}
                onChange={(v) => setContact((c) => ({ ...c, email: v }))}
              />
              <Field
                label="Telefon"
                value={contact.phone}
                onChange={(v) => setContact((c) => ({ ...c, phone: v }))}
              />
              <label className="text-coffee/70 text-[13px] font-medium">
                Dodatna poruka
                <textarea
                  value={contact.message}
                  onChange={(event) =>
                    setContact((c) => ({ ...c, message: event.target.value }))
                  }
                  rows={3}
                  className="border-coffee/15 bg-surface text-coffee focus:border-sage mt-1.5 w-full resize-none rounded-2xl border px-4 py-2.5 text-[15px] leading-[1.5] outline-none"
                />
              </label>
              <label className="text-coffee/75 flex cursor-pointer items-start gap-2.5 text-[13.5px] leading-[1.5]">
                <input
                  type="checkbox"
                  checked={contact.consent}
                  onChange={(event) =>
                    setContact((c) => ({ ...c, consent: event.target.checked }))
                  }
                  className="mt-0.5 h-4 w-4 shrink-0"
                />
                Saglasan/na sam da me Psihointegritet kontaktira povodom ovog
                upita.
              </label>
            </div>
            {error ? (
              <p className="text-danger mt-3 text-[13.5px]" role="alert">
                {error}
              </p>
            ) : null}
            <button
              type="button"
              onClick={submit}
              disabled={sending || !contactValid}
              className="bg-forest text-canvas hover:bg-forest-hover mt-6 cursor-pointer rounded-full border-0 px-7 py-[15px] text-[15px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50"
            >
              {sending ? "Šaljemo…" : "Pošaljite upit za program"}
            </button>
          </div>
        ) : null}

        {screen === "done" ? (
          <div className="flex-1 overflow-y-auto px-6 py-9 md:px-10 md:py-11">
            <h3
              ref={headingRef}
              tabIndex={-1}
              className="text-forest mb-3 font-serif text-[28px] leading-[1.12] font-normal text-pretty outline-none"
            >
              Hvala na interesovanju
            </h3>
            <p className="text-coffee/70 text-[15px] leading-[1.65]">
              Primili smo vaš upit i okvirne zahteve. Član tima Psihointegriteta
              će vas kontaktirati radi potvrde potreba i pripreme konačne
              ponude.
            </p>
            <button
              type="button"
              onClick={onClose}
              className="bg-meadow text-forest hover:bg-meadow-hover mt-8 cursor-pointer rounded-full border-0 px-7 py-[15px] text-[15px] font-semibold transition-colors"
            >
              Zatvori
            </button>
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

function Field({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <label className="text-coffee/70 text-[13px] font-medium">
      {label}
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="border-coffee/15 bg-surface text-coffee focus:border-sage mt-1.5 w-full rounded-2xl border px-4 py-2.5 text-[15px] outline-none"
      />
    </label>
  );
}
