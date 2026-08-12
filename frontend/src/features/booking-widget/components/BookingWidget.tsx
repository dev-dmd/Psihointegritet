"use client";

import { cn } from "@/helpers/cn";

import { defaultBookingWidgetCopy } from "../booking-widget.config";
import { bookingWidgetThemes } from "../booking-widget.variants";
import { BookingWidgetProvider } from "../providers/booking-widget-provider";
import type { BookingWidgetProps } from "../booking-widget.types";
import { BookingWidgetActions } from "./BookingWidgetActions";
import { BookingWidgetCalendar } from "./BookingWidgetCalendar";
import { BookingWidgetHeader } from "./BookingWidgetHeader";
import { BookingWidgetLayout } from "./BookingWidgetLayout";
import { BookingWidgetSlots } from "./BookingWidgetSlots";
import { BookingWidgetSummary } from "./BookingWidgetSummary";

/**
 * Presentational booking surface. It intentionally has no API calls or Booking
 * Engine decisions: host code provides offerings and slots and receives
 * callback payloads.
 *
 * What may be changed is decided solely by `selectionPolicy` — no component
 * below this point knows which entry point the person arrived from.
 */
export function BookingWidget({
  variant,
  brand,
  offerings,
  therapists,
  selectionPolicy,
  initialServiceId,
  initialTherapistId,
  initialFormat,
  onBack,
  backLabel,
  slots,
  copy: copyOverrides,
  showBrandPanel = true,
  showTherapist = true,
  showNotifyAction = true,
  onCancel,
  onNotify,
  onSubmit,
  className,
}: BookingWidgetProps) {
  const theme = bookingWidgetThemes[variant];
  const copy = { ...defaultBookingWidgetCopy, ...copyOverrides };

  return (
    <BookingWidgetProvider
      offerings={offerings}
      slots={slots}
      {...(initialServiceId ? { initialServiceId } : {})}
      {...(initialTherapistId ? { initialTherapistId } : {})}
      {...(initialFormat ? { initialFormat } : {})}
    >
      <BookingWidgetLayout
        brand={brand}
        showBrandPanel={showBrandPanel}
        theme={theme}
        variant={variant}
        {...(className ? { className } : {})}
      >
        {/*
          The format switch stays visible in every mode, including a locked
          Intake selection: online vs in person is the one thing the person
          explicitly chose in the guided flow, and hiding it made that choice
          invisible. Switching it never changes the therapist or the service —
          it re-resolves the same treatment in the other format — so it does
          not reopen the catalogue the locked policy is there to close.
        */}
        <BookingWidgetHeader brand={brand} copy={copy} theme={theme} />
        <div
          className={cn(
            "grid gap-6 py-6 lg:grid-cols-[minmax(190px,0.9fr)_minmax(220px,1fr)_minmax(220px,1fr)] lg:gap-6",
          )}
        >
          <BookingWidgetSummary
            therapists={therapists}
            showTherapist={showTherapist}
            selectionPolicy={selectionPolicy}
            copy={copy}
            theme={theme}
          />
          <div
            className={cn(
              "border-y py-5 lg:border-x lg:border-y-0 lg:px-6 lg:py-0",
              theme.border,
            )}
          >
            <BookingWidgetCalendar theme={theme} />
          </div>
          <BookingWidgetSlots copy={copy} theme={theme} />
        </div>
        <BookingWidgetActions
          copy={copy}
          slots={slots}
          showNotifyAction={showNotifyAction}
          theme={theme}
          onBack={onBack}
          backLabel={backLabel}
          {...(onCancel ? { onCancel } : {})}
          {...(onNotify ? { onNotify } : {})}
          {...(onSubmit ? { onSubmit } : {})}
        />
      </BookingWidgetLayout>
    </BookingWidgetProvider>
  );
}
