"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

import {
  NEEDS,
  activeCompanySteps,
  recommendCompanyPlan,
  type CompanyAnswers,
} from "@/content/company";
import { cn } from "@/helpers/cn";

type Screen = "intro" | "questions" | "recommendation" | "contact" | "done";

interface Contact {
  companyName: string;
  contactName: string;
  email: string;
  teamSize: string;
  phone: string;
  deadline: string;
  message: string;
  consent: boolean;
}

const emptyAnswers: CompanyAnswers = {
  needs: [],
  teamSize: null,
  scheduleModel: null,
  funding: null,
  period: null,
  monthlySessions: null,
  delivery: null,
};

const emptyContact: Contact = {
  companyName: "",
  contactName: "",
  email: "",
  teamSize: "",
  phone: "",
  deadline: "",
  message: "",
  consent: false,
};

interface CompanyConfiguratorDrawerProps {
  onClose: () => void;
}

/**
 * B2B configurator drawer („Program podrške zaposlenima"). Multi-step config →
 * hardcoded package recommendation → contact form → email to the team. Demo
 * only: no persistence, no company codes, no Booking Engine (spec §5A).
 */
export function CompanyConfiguratorDrawer({
  onClose,
}: CompanyConfiguratorDrawerProps) {
  const [screen, setScreen] = useState<Screen>("intro");
  const [stepIndex, setStepIndex] = useState(0);
  const [answers, setAnswers] = useState<CompanyAnswers>(emptyAnswers);
  const [otherText, setOtherText] = useState("");
  const [contact, setContact] = useState<Contact>(emptyContact);
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

  const steps = useMemo(
    () => activeCompanySteps(answers.period),
    [answers.period],
  );
  const safeIndex = Math.min(stepIndex, steps.length - 1);
  const currentStep = steps[safeIndex];
  const plan = useMemo(() => recommendCompanyPlan(answers), [answers]);

  const advance = () => {
    if (safeIndex >= steps.length - 1) {
      setScreen("recommendation");
    } else {
      advanceTimer.current = window.setTimeout(
        () => setStepIndex(safeIndex + 1),
        160,
      );
    }
  };

  const selectSingle = (key: string, option: string) => {
    setAnswers((prev) => ({ ...prev, [key]: option }));
    advance();
  };

  const toggleNeed = (option: string) => {
    setAnswers((prev) => {
      const has = prev.needs.includes(option);
      return {
        ...prev,
        needs: has
          ? prev.needs.filter((item) => item !== option)
          : [...prev.needs, option],
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
      setStepIndex(steps.length - 1);
      return;
    }
    if (safeIndex > 0) {
      setStepIndex(safeIndex - 1);
    } else {
      setScreen("intro");
    }
  };

  const contactValid =
    contact.companyName.trim() &&
    contact.contactName.trim() &&
    /.+@.+\..+/.test(contact.email) &&
    contact.teamSize.trim() &&
    contact.consent;

  const submit = async () => {
    setSending(true);
    setError(null);
    try {
      const needsText = answers.needs.includes(NEEDS.other)
        ? [...answers.needs, `Nešto drugo: ${otherText.trim() || "—"}`]
        : answers.needs;
      const response = await fetch("/api/company-inquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan: { name: plan.name, price: plan.price },
          answers: {
            needs: needsText,
            teamSize: answers.teamSize,
            scheduleModel: answers.scheduleModel,
            funding: answers.funding,
            period: answers.period,
            monthlySessions: answers.monthlySessions,
            delivery: answers.delivery,
          },
          contact: {
            companyName: contact.companyName.trim(),
            contactName: contact.contactName.trim(),
            email: contact.email.trim(),
            teamSize: contact.teamSize.trim(),
            phone: contact.phone.trim() || undefined,
            deadline: contact.deadline.trim() || undefined,
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
            ? `Korak ${safeIndex + 1} od ${steps.length}`
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
        aria-label="Program podrške zaposlenima"
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
            <h3 className="text-forest mb-3 font-serif text-[28px] leading-[1.12] font-normal text-pretty md:text-[32px]">
              Program podrške zaposlenima
            </h3>
            <p className="text-coffee/70 mb-8 text-[15px] leading-[1.65]">
              Kreirajte okvirni model podrške prema veličini tima, potrebama
              zaposlenih i načinu korišćenja termina. Popunjavanje traje oko dva
              minuta i ne zahteva unošenje zdravstvenih podataka zaposlenih.
            </p>
            <button
              type="button"
              onClick={() => setScreen("questions")}
              className="bg-forest text-canvas hover:bg-forest-hover cursor-pointer rounded-full border-0 px-7 py-[15px] text-[15px] font-semibold transition-colors"
            >
              Konfigurišite program
            </button>
          </div>
        ) : null}

        {screen === "questions" && currentStep ? (
          <div className="flex-1 overflow-y-auto px-6 py-9 md:px-10 md:py-11">
            <h3 className="text-forest mb-[26px] font-serif text-[24px] leading-[1.14] font-normal tracking-[-0.01em] text-pretty md:text-[30px]">
              {currentStep.question}
            </h3>
            <div className="flex flex-col gap-2.5">
              {currentStep.options.map((option) => {
                const selected = currentStep.multi
                  ? answers.needs.includes(option)
                  : answers[currentStep.key] === option;
                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() =>
                      currentStep.multi
                        ? toggleNeed(option)
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

            {currentStep.multi && answers.needs.includes(NEEDS.other) ? (
              <textarea
                value={otherText}
                onChange={(event) => setOtherText(event.target.value)}
                rows={2}
                placeholder="Opišite ukratko šta vam je potrebno."
                className="border-coffee/15 bg-surface text-coffee focus:border-sage mt-3 w-full resize-none rounded-2xl border px-4 py-3 text-[15px] leading-[1.5] outline-none"
              />
            ) : null}

            {currentStep.multi ? (
              <button
                type="button"
                onClick={advance}
                disabled={answers.needs.length === 0}
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
            <h3 className="text-forest mb-1 font-serif text-[30px] leading-[1.1] font-normal text-pretty">
              {plan.name}
            </h3>
            <div className="text-coffee/60 mb-5 text-[14px]">
              {plan.audience}
            </div>
            <div className="bg-meadow/20 mb-5 flex flex-wrap gap-2 rounded-2xl px-5 py-4">
              <span className="text-coffee text-[13px] font-medium">
                {plan.model}
              </span>
            </div>
            <div className="mb-5">
              <div className="text-sage mb-1.5 text-[11.5px] font-semibold tracking-[0.14em] uppercase">
                Okvirna cena
              </div>
              <div className="text-forest font-serif text-[24px]">
                {plan.price}
              </div>
            </div>
            <div className="mb-6">
              <div className="text-sage mb-2 text-[11.5px] font-semibold tracking-[0.14em] uppercase">
                Šta kompanija dobija
              </div>
              <ul className="flex flex-col gap-2">
                {plan.includes.map((item) => (
                  <li
                    key={item}
                    className="text-coffee/75 flex gap-2.5 text-[14.5px] leading-[1.5]"
                  >
                    <span aria-hidden className="text-sage">
                      •
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <p className="text-coffee/55 mb-6 text-[12.5px] leading-[1.55]">
              Cene su radne i služe za okvirnu procenu. Konačnu ponudu, pravila
              otkazivanja i uslove definišemo u razgovoru.
            </p>
            <button
              type="button"
              onClick={() => {
                setContact((prev) => ({
                  ...prev,
                  teamSize: prev.teamSize || answers.teamSize || "",
                }));
                setScreen("contact");
              }}
              className="bg-forest text-canvas hover:bg-forest-hover cursor-pointer rounded-full border-0 px-7 py-[15px] text-[15px] font-semibold transition-colors"
            >
              Zatražite ponudu
            </button>
          </div>
        ) : null}

        {screen === "contact" ? (
          <div className="flex-1 overflow-y-auto px-6 py-9 md:px-10 md:py-11">
            <h3 className="text-forest mb-5 font-serif text-[26px] leading-[1.12] font-normal text-pretty">
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
                label="Broj zaposlenih ili veličina tima *"
                value={contact.teamSize}
                onChange={(v) => setContact((c) => ({ ...c, teamSize: v }))}
              />
              <Field
                label="Telefon"
                value={contact.phone}
                onChange={(v) => setContact((c) => ({ ...c, phone: v }))}
              />
              <Field
                label="Rok za početak programa"
                value={contact.deadline}
                onChange={(v) => setContact((c) => ({ ...c, deadline: v }))}
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
            <h3 className="text-forest mb-3 font-serif text-[28px] leading-[1.12] font-normal text-pretty">
              Hvala na interesovanju
            </h3>
            <p className="text-coffee/70 text-[15px] leading-[1.65]">
              Primili smo vaš upit i okvirne zahteve. Član tima Psihointegriteta
              će vas kontaktirati radi potvrde potreba, kapaciteta i pripreme
              konačne ponude.
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
