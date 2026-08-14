"use client";

import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";

import { cn } from "@/helpers/cn";
import type { UiLocale } from "@/i18n/locales";

import { formatBookingPrice } from "../booking-widget.config";
import { useBookingWidget } from "../hooks/use-booking-widget";
import type {
  BookingSelectionPolicy,
  BookingTherapist,
  BookingWidgetCopy,
  BookingWidgetTheme,
} from "../booking-widget.types";
import { BookingWidgetOfferings } from "./BookingWidgetOfferings";
import { BookingWidgetTherapists } from "./BookingWidgetTherapists";

interface BookingWidgetSummaryProps {
  therapists: BookingTherapist[];
  showTherapist: boolean;
  selectionPolicy: BookingSelectionPolicy;
  copy: BookingWidgetCopy;
  theme: BookingWidgetTheme;
}

export function BookingWidgetSummary({
  therapists,
  showTherapist,
  selectionPolicy,
  copy,
  theme,
}: BookingWidgetSummaryProps) {
  const t = useTranslations("public.bookingWidget");
  const locale = useLocale() as UiLocale;
  const { activeOffering, selectedTherapistId } = useBookingWidget();

  const selectedTherapist =
    therapists.find((therapist) => therapist.id === selectedTherapistId) ??
    null;

  // The policy is the only thing consulted here — never `source` (§3).
  const canChangeService = selectionPolicy.service !== "locked";
  const canChangeTherapist = selectionPolicy.therapist === "editable";
  const isLocked = !canChangeService && !canChangeTherapist;

  const formatLabel =
    activeOffering?.format === "online" ? copy.onlineLabel : copy.inPersonLabel;

  return (
    <section aria-labelledby="booking-service-name" className="min-w-0">
      {isLocked ? (
        <p
          className={cn(
            "mb-3 text-[13px] font-semibold tracking-[0.08em] uppercase",
            theme.muted,
          )}
        >
          {copy.yourSelectionLabel}
        </p>
      ) : null}

      {/* Selected treatment — large display, reveals on change */}
      <div
        key={`svc-${activeOffering?.id ?? "none"}`}
        className="animate-reveal-fade"
      >
        <h3
          id="booking-service-name"
          className={cn(
            "font-serif text-3xl leading-[1.05] font-normal tracking-wide uppercase sm:text-4xl",
            theme.heading,
          )}
        >
          {activeOffering?.serviceName ?? copy.noOfferingsMessage}
        </h3>
        {activeOffering ? (
          <p className={cn("mt-3 text-base sm:text-lg", theme.serviceMeta)}>
            {t("duration", { count: activeOffering.durationMinutes })}
            <span aria-hidden className="text-warm mx-2">
              ·
            </span>
            {formatLabel}
            <span aria-hidden className="text-warm mx-2">
              ·
            </span>
            {formatBookingPrice(
              activeOffering.priceAmount,
              activeOffering.currency,
              locale,
            )}
          </p>
        ) : null}
      </div>

      {showTherapist ? (
        <div className="mt-6">
          <div
            key={`thr-${selectedTherapistId}`}
            className="animate-reveal-fade"
          >
            <div className="flex items-center gap-3">
              {selectedTherapist?.avatarUrl ? (
                <Image
                  src={selectedTherapist.avatarUrl}
                  alt=""
                  width={48}
                  height={48}
                  className="h-11 w-11 min-w-11 rounded-full border border-current/20 object-cover sm:h-12 sm:w-12 sm:min-w-12"
                />
              ) : (
                <div
                  aria-hidden
                  className={cn(
                    "flex h-11 w-11 items-center justify-center rounded-full border border-current/20 font-serif text-lg sm:h-12 sm:w-12 sm:min-w-12",
                    theme.heading,
                  )}
                >
                  {selectedTherapist?.name.slice(0, 1) ?? "T"}
                </div>
              )}
              <span className="min-w-0">
                <span
                  className={cn(
                    "block text-sm font-medium sm:text-[15px]",
                    theme.body,
                  )}
                >
                  {selectedTherapist?.name ?? ""}
                </span>
                {selectedTherapist?.title ? (
                  <span className={cn("mt-0.5 block text-[12px]", theme.muted)}>
                    {selectedTherapist.title}
                  </span>
                ) : null}
              </span>
            </div>
          </div>

          <BookingWidgetOfferings
            therapistName={
              selectedTherapist?.firstNameGenitive ??
              selectedTherapist?.name ??
              ""
            }
            copy={copy}
            theme={theme}
            editable={canChangeService}
          />

          <BookingWidgetTherapists
            therapists={therapists}
            copy={copy}
            theme={theme}
            editable={canChangeTherapist}
          />
        </div>
      ) : null}
    </section>
  );
}
