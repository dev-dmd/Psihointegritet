"use client";

import { cn } from "@/helpers/cn";
import { useFormatter, useLocale, useTranslations } from "next-intl";
import type { UiLocale } from "@/i18n/locales";
import { formatBookingPrice } from "../booking-widget.config";
import type {
  BookingFormat,
  BookingWidgetTheme,
} from "../booking-widget.types";

// ── Props ───────────────────────────────────────────────────────────────────

export interface ConfirmationDetails {
  treatmentName: string;
  durationMinutes: number;
  price: number;
  currency: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  /** Online or in person — part of the offering, so it belongs on the receipt. */
  format: BookingFormat;
  therapistName: string;
  clientName: string;
  clientEmail: string;
  clientPhone?: string;
  requestId: string;
}

interface BookingWidgetConfirmationProps {
  /** The widget theme. */
  theme: BookingWidgetTheme;
  /** The submitted request details. */
  details: ConfirmationDetails | null;
}

/**
 * „11.08.2026 · 09:00 – 10:00 · Online".
 *
 * The time half is dropped when no slot time reached us, so the line reads as
 * a date rather than showing a dangling „–" where the hours should be.
 */
// ── Component ───────────────────────────────────────────────────────────────

export function BookingWidgetConfirmation({
  theme,
  details,
}: BookingWidgetConfirmationProps) {
  const t = useTranslations("public.bookingWidget");
  const locale = useLocale() as UiLocale;
  const format = useFormatter();
  if (!details) return null;
  const date = format.dateTime(new Date(`${details.date}T12:00:00`), {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  const time =
    details.startTime && details.endTime
      ? ` · ${details.startTime} – ${details.endTime}`
      : "";
  const appointmentFormat =
    details.format === "online" ? t("online") : t("inPerson");

  return (
    <section aria-label={t("confirmationLabel")} className="space-y-5">
      {/* Treatment name — uppercase, large */}
      <div>
        <h3
          className={cn(
            "font-serif text-3xl leading-[1.05] font-normal tracking-wide uppercase sm:text-4xl",
            theme.heading,
          )}
        >
          {details.treatmentName}
        </h3>
        <p className={cn("mt-3 text-base sm:text-lg", theme.serviceMeta)}>
          {t("duration", { count: details.durationMinutes })}
          <span aria-hidden className="text-warm mx-2">
            ·
          </span>
          {formatBookingPrice(details.price, details.currency, locale)}
        </p>
      </div>

      {/* Date & time */}
      <div className={cn("space-y-2 rounded-xl border p-4", theme.border)}>
        <p
          className={cn(
            "text-[13px] font-semibold tracking-[0.08em] uppercase",
            theme.muted,
          )}
        >
          {t("appointment")}
        </p>
        <p className={cn("text-[15px] font-medium", theme.body)}>
          {date}
          {time} · {appointmentFormat}
        </p>
        {details.therapistName ? (
          <p className={cn("text-[13px]", theme.muted)}>
            {details.therapistName}
          </p>
        ) : null}
      </div>

      {/* Client info */}
      <div className={cn("space-y-2 rounded-xl border p-4", theme.border)}>
        <p
          className={cn(
            "text-[13px] font-semibold tracking-[0.08em] uppercase",
            theme.muted,
          )}
        >
          {t("details")}
        </p>
        <p className={cn("text-[15px] font-medium", theme.body)}>
          {details.clientName}
        </p>
        <p className={cn("text-[13px]", theme.muted)}>{details.clientEmail}</p>
        {details.clientPhone ? (
          <p className={cn("text-[13px]", theme.muted)}>
            {details.clientPhone}
          </p>
        ) : null}
      </div>

      {/* Notice */}
      <div className={cn("rounded-xl border p-4", theme.border, theme.muted)}>
        <p className="text-[13px] leading-[1.6]">
          <strong className={theme.body}>{t("noteLabel")}</strong>{" "}
          {t.rich("note", {
            address: details.clientEmail,
            email: (chunks) => <span className={theme.body}>{chunks}</span>,
          })}
        </p>
      </div>
    </section>
  );
}
