"use client";

import { XMarkIcon } from "@heroicons/react/24/outline";
import { useTranslations } from "next-intl";

import { BookingWidgetConfirmation } from "./BookingWidgetConfirmation";
import type { ConfirmationDetails } from "./BookingWidgetConfirmation";
import type { BookingWidgetTheme } from "../booking-widget.types";

interface BookingWidgetConfirmationOverlayProps {
  theme: BookingWidgetTheme;
  details: ConfirmationDetails | null;
  onClose: () => void;
}

/**
 * Bottom-sheet modal that slides the confirmation up as an overlay while
 * the BookingWidget stays mounted underneath.
 */
export function BookingWidgetConfirmationOverlay({
  theme,
  details,
  onClose,
}: BookingWidgetConfirmationOverlayProps) {
  const t = useTranslations("public.bookingWidget");

  return (
    <div className="animate-slide-up fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
      <div
        className="bg-coffee/45 fixed inset-0"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className="shadow-hero-card scrollbar-hide relative max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-[28px] border p-6 sm:p-7"
        style={{
          background:
            "linear-gradient(135deg, rgb(from var(--color-surface) r g b / 0.88), rgb(from var(--color-canvas) r g b / 0.72)), var(--color-canvas)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
        }}
      >
        <div className="mb-2 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="text-coffee/50 hover:text-coffee cursor-pointer rounded-full p-1.5 transition-colors"
            aria-label={t("close")}
          >
            <XMarkIcon className="size-5" />
          </button>
        </div>
        <BookingWidgetConfirmation theme={theme} details={details} />
      </div>
    </div>
  );
}
