"use client";

import { ChevronLeftIcon } from "@heroicons/react/24/outline";
import { useState } from "react";
import { useTranslations } from "next-intl";

import { cn } from "@/helpers/cn";
import type { BookingWidgetTheme } from "../booking-widget.types";

// ── Props ───────────────────────────────────────────────────────────────────

export interface ContactFormData {
  name: string;
  email: string;
  phone: string;
  bookingRulesAccepted: boolean;
}

interface BookingWidgetContactFormProps {
  /** The widget theme for consistent styling. */
  theme: BookingWidgetTheme;
  /** Called when the user clicks back / cancel. */
  onBack: () => void;
  /** Called when the user submits valid data. */
  onSubmit: (data: ContactFormData) => void;
  /** Whether a submission is in progress (shows spinner on button). */
  isSubmitting: boolean;
  /** An error message to display above the button. */
  error: string | null;
  /** Pre-fill name (e.g. from Clerk signed-in user). */
  initialName?: string | undefined;
  /** Pre-fill email (e.g. from Clerk signed-in user). */
  initialEmail?: string | undefined;
}

// ── Component ───────────────────────────────────────────────────────────────

export function BookingWidgetContactForm({
  theme,
  onBack,
  onSubmit,
  isSubmitting,
  error,
  initialName,
  initialEmail,
}: BookingWidgetContactFormProps) {
  const t = useTranslations("public.bookingWidget");
  const [name, setName] = useState(initialName ?? "");
  const [email, setEmail] = useState(initialEmail ?? "");
  const [phone, setPhone] = useState("");
  const [bookingRulesAccepted, setBookingRulesAccepted] = useState(false);

  const canSubmit =
    name.trim().length > 1 &&
    /.+@.+\..+/.test(email) &&
    bookingRulesAccepted &&
    !isSubmitting;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    onSubmit({
      name: name.trim(),
      email: email.trim(),
      phone: phone.trim(),
      bookingRulesAccepted,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      {/* Back button */}
      <button
        type="button"
        onClick={onBack}
        className={cn(
          "inline-flex cursor-pointer items-center gap-1.5 text-[13px] font-medium transition-colors",
          theme.muted,
          "hover:text-current",
        )}
      >
        <ChevronLeftIcon className="size-4" />
        {t("contactBack")}
      </button>

      <div className="space-y-4">
        <div>
          <label
            htmlFor="bcf-name"
            className={cn("mb-1.5 block text-[13px] font-medium", theme.body)}
          >
            {t("name")}
          </label>
          <input
            id="bcf-name"
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("namePlaceholder")}
            className={cn(
              "w-full rounded-xl border px-4 py-2.5 text-[15px] transition-colors outline-none",
              theme.border,
              theme.body,
              "focus:border-sage bg-transparent placeholder:text-current/35",
            )}
          />
        </div>

        <div>
          <label
            htmlFor="bcf-email"
            className={cn("mb-1.5 block text-[13px] font-medium", theme.body)}
          >
            {t("email")}
          </label>
          <input
            id="bcf-email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t("emailPlaceholder")}
            className={cn(
              "w-full rounded-xl border px-4 py-2.5 text-[15px] transition-colors outline-none",
              theme.border,
              theme.body,
              "focus:border-sage bg-transparent placeholder:text-current/35",
            )}
          />
        </div>

        <div>
          <label
            htmlFor="bcf-phone"
            className={cn("mb-1.5 block text-[13px] font-medium", theme.body)}
          >
            {t("phone")} <span className={theme.muted}>({t("optional")})</span>
          </label>
          <input
            id="bcf-phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+381 6X XXXXXXX"
            className={cn(
              "w-full rounded-xl border px-4 py-2.5 text-[15px] transition-colors outline-none",
              theme.border,
              theme.body,
              "focus:border-sage bg-transparent placeholder:text-current/35",
            )}
          />
        </div>

        <label
          className={cn(
            "flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-colors",
            theme.border,
            bookingRulesAccepted
              ? "border-sage bg-sage/8"
              : "hover:border-sage/50",
          )}
        >
          <input
            type="checkbox"
            checked={bookingRulesAccepted}
            onChange={(e) => setBookingRulesAccepted(e.target.checked)}
            className="accent-sage mt-0.5 size-4 cursor-pointer"
          />
          <span className={cn("text-[13px] leading-[1.55]", theme.body)}>
            {t("rules")}
          </span>
        </label>
      </div>

      {error ? (
        <p className="rounded-xl border border-red-400/40 bg-red-50/60 px-4 py-2.5 text-[13px] text-red-700">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={!canSubmit}
        className={cn(
          "min-h-11 w-full cursor-pointer rounded-full px-6 py-3 text-[15px] font-semibold transition-all duration-300 ease-out",
          "hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:translate-y-0",
          theme.primaryButton,
        )}
      >
        {isSubmitting ? (
          <span className="inline-flex items-center gap-2">
            <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            {t("sending")}
          </span>
        ) : (
          t("sendRequest")
        )}
      </button>
    </form>
  );
}
