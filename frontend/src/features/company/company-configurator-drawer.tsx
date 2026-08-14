"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import {
  companySteps,
  emptyCompanyAnswers,
  findCompanyPlan,
  recommendCompanyModel,
  type CompanyAnswers,
  type CompanyStepKey,
} from "@/content/company";
import { useCompanyInquiryMutation } from "@/features/company/hooks/use-company-inquiry-mutation";
import { cn } from "@/helpers/cn";
import { QueryProvider } from "@/providers/query-provider";

import { useCompanyConfiguratorCopy } from "./company-configurator-copy";
import { CompanyConfiguratorField as Field } from "./company-configurator-field";

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
  preselectedPlanSlug?: string | null;
}

/**
 * B2B configurator drawer — „Kako možemo pomoći vašoj organizaciji?".
 * Four questions (employees / goals / topics / format) → deterministic model
 * from recommendCompanyModel → contact form → email to the team. Demo only:
 * no persistence, no prices (everything is „Cena po ponudi"), no employee
 * health data.
 */
export function CompanyConfiguratorDrawer(
  props: CompanyConfiguratorDrawerProps,
) {
  return (
    <QueryProvider>
      <CompanyConfiguratorDrawerContent {...props} />
    </QueryProvider>
  );
}

function CompanyConfiguratorDrawerContent({
  onClose,
  preselectedPlanSlug,
}: CompanyConfiguratorDrawerProps) {
  const [screen, setScreen] = useState<Screen>("intro");
  const [stepIndex, setStepIndex] = useState(0);
  const [answers, setAnswers] = useState<CompanyAnswers>(emptyCompanyAnswers);
  const [contact, setContact] = useState<Contact>(emptyContact);
  const [error, setError] = useState<string | null>(null);
  const advanceTimer = useRef<number | null>(null);
  const headingRef = useRef<HTMLHeadingElement | null>(null);
  const submitMutation = useCompanyInquiryMutation();
  const { t, planTitle, optionLabel, modelCopy } = useCompanyConfiguratorCopy();

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
  const model = recommendCompanyModel(answers);
  const preselectedPlan = findCompanyPlan(preselectedPlanSlug);

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

  const submit = () => {
    setError(null);
    submitMutation.mutate(
      {
        model: { name: model.name, price: "Cena po ponudi" },
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
          ...(contact.phone.trim() ? { phone: contact.phone.trim() } : {}),
          ...(contact.message.trim()
            ? { message: contact.message.trim() }
            : {}),
        },
      },
      {
        onSuccess: () => setScreen("done"),
        onError: () => setError(t("contact.error")),
      },
    );
  };

  const stepLabel =
    screen === "done"
      ? t("progress.sent")
      : screen === "contact"
        ? t("progress.contact")
        : screen === "recommendation"
          ? t("progress.recommendation")
          : screen === "questions"
            ? t("progress.step", {
                current: String(safeIndex + 1),
                total: String(companySteps.length),
              })
            : t("progress.intro");

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
        aria-label={t("dialog")}
        className="bg-canvas shadow-drawer animate-drawer-in fixed top-0 right-0 bottom-0 z-[81] flex w-[min(560px,100vw)] flex-col"
      >
        <div className="border-coffee/10 flex items-center justify-between gap-6 border-b px-6 pt-7 pb-[22px] md:px-10">
          <div className="text-sage text-[13px] font-semibold tracking-[0.12em] uppercase">
            {stepLabel}
          </div>
          <button
            type="button"
            aria-label={t("close")}
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
              {t("intro.title")}
            </h3>
            <p className="text-coffee/70 mb-5 text-[15px] leading-[1.65]">
              {t("intro.description")}
            </p>
            {preselectedPlan ? (
              <p className="bg-meadow/25 text-coffee/80 mb-5 rounded-2xl px-4 py-3 text-[13.5px] leading-[1.55]">
                {t("intro.selected", {
                  plan: planTitle(preselectedPlan.slug, preselectedPlan.title),
                })}
              </p>
            ) : null}
            <ul className="mb-8 flex flex-wrap gap-2">
              {(
                [
                  "workshops",
                  "talks",
                  "counselling",
                  "managers",
                  "burnout",
                  "teamBuilding",
                ] as const
              ).map((item) => (
                <li
                  key={item}
                  className="bg-meadow/28 text-coffee rounded-full px-3.5 py-1.5 text-[13px] font-medium"
                >
                  {t(`intro.offer.${item}`)}
                </li>
              ))}
            </ul>
            <button
              type="button"
              onClick={() => setScreen("questions")}
              className="bg-forest text-canvas hover:bg-forest-hover cursor-pointer rounded-full border-0 px-7 py-[15px] text-[15px] font-semibold transition-colors"
            >
              {t("intro.cta")}
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
              {t(`questions.${currentStep.key}`)}
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
                    <span>{optionLabel(option)}</span>
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
                {t("next")}
              </button>
            ) : null}
          </div>
        ) : null}

        {screen === "recommendation" ? (
          <div className="flex-1 overflow-y-auto px-6 py-9 md:px-10 md:py-11">
            <div className="text-sage mb-3 text-[12.5px] font-semibold tracking-[0.16em] uppercase">
              {t("recommendation.eyebrow")}
            </div>
            <h3
              ref={headingRef}
              tabIndex={-1}
              className="text-forest mb-3 font-serif text-[30px] leading-[1.1] font-normal text-pretty outline-none"
            >
              {modelCopy(model.slug).name}
            </h3>
            <p className="text-coffee/70 mb-5 text-[15px] leading-[1.6]">
              {modelCopy(model.slug).description}
            </p>
            <div className="bg-meadow/20 mb-5 flex flex-col gap-2 rounded-2xl px-5 py-4">
              {answers.employees ? (
                <div className="text-coffee text-[13.5px]">
                  <span className="font-semibold">
                    {t("recommendation.teamSize")}
                  </span>{" "}
                  {t("recommendation.employees", {
                    count: optionLabel(answers.employees),
                  })}
                </div>
              ) : null}
              {answers.topics.length > 0 ? (
                <div className="text-coffee text-[13.5px]">
                  <span className="font-semibold">
                    {t("recommendation.topics")}
                  </span>{" "}
                  {answers.topics.map(optionLabel).join(", ")}
                </div>
              ) : null}
              {answers.format ? (
                <div className="text-coffee text-[13.5px]">
                  <span className="font-semibold">
                    {t("recommendation.format")}
                  </span>{" "}
                  {optionLabel(answers.format)}
                </div>
              ) : null}
            </div>
            <div className="mb-6">
              <div className="text-sage mb-1.5 text-[11.5px] font-semibold tracking-[0.14em] uppercase">
                {t("recommendation.price")}
              </div>
              <div className="text-forest font-serif text-[24px]">
                {t("recommendation.priceOnRequest")}
              </div>
            </div>
            <p className="text-coffee/55 mb-6 text-[12.5px] leading-[1.55]">
              {t("recommendation.note")}
            </p>
            <button
              type="button"
              onClick={() => setScreen("contact")}
              className="bg-forest text-canvas hover:bg-forest-hover cursor-pointer rounded-full border-0 px-7 py-[15px] text-[15px] font-semibold transition-colors"
            >
              {t("recommendation.request")}
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
              {t("contact.title")}
            </h3>
            <div className="flex flex-col gap-3.5">
              <Field
                label={t("contact.companyName")}
                value={contact.companyName}
                onChange={(v) => setContact((c) => ({ ...c, companyName: v }))}
              />
              <Field
                label={t("contact.contactName")}
                value={contact.contactName}
                onChange={(v) => setContact((c) => ({ ...c, contactName: v }))}
              />
              <Field
                label={t("contact.email")}
                type="email"
                value={contact.email}
                onChange={(v) => setContact((c) => ({ ...c, email: v }))}
              />
              <Field
                label={t("contact.phone")}
                value={contact.phone}
                onChange={(v) => setContact((c) => ({ ...c, phone: v }))}
              />
              <label className="text-coffee/70 text-[13px] font-medium">
                {t("contact.message")}
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
                {t("contact.consent")}
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
              disabled={submitMutation.isPending || !contactValid}
              className="bg-forest text-canvas hover:bg-forest-hover mt-6 cursor-pointer rounded-full border-0 px-7 py-[15px] text-[15px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitMutation.isPending
                ? t("contact.sending")
                : t("contact.submit")}
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
              {t("done.title")}
            </h3>
            <p className="text-coffee/70 text-[15px] leading-[1.65]">
              {t("done.body")}
            </p>
            <button
              type="button"
              onClick={onClose}
              className="bg-meadow text-forest hover:bg-meadow-hover mt-8 cursor-pointer rounded-full border-0 px-7 py-[15px] text-[15px] font-semibold transition-colors"
            >
              {t("done.close")}
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
              ← {t("back")}
            </button>
          </div>
        ) : null}
      </div>
    </>,
    document.body,
  );
}
