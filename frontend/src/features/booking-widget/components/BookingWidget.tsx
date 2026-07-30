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
 * Engine decisions: host code provides slots and receives callback payloads.
 */
export function BookingWidget({
  variant,
  brand,
  service,
  therapist,
  initialFormat,
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
      service={service}
      slots={slots}
      {...(initialFormat ? { initialFormat } : {})}
    >
      <BookingWidgetLayout
        brand={brand}
        showBrandPanel={showBrandPanel}
        theme={theme}
        variant={variant}
        {...(className ? { className } : {})}
      >
        <BookingWidgetHeader
          brand={brand}
          service={service}
          copy={copy}
          theme={theme}
        />
        <div
          className={cn(
            "grid gap-6 py-6 lg:grid-cols-[minmax(190px,0.9fr)_minmax(220px,1fr)_minmax(220px,1fr)] lg:gap-6",
          )}
        >
          <BookingWidgetSummary
            service={service}
            showTherapist={showTherapist}
            theme={theme}
            {...(therapist ? { therapist } : {})}
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
          {...(therapist ? { therapist } : {})}
          {...(onCancel ? { onCancel } : {})}
          {...(onNotify ? { onNotify } : {})}
          {...(onSubmit ? { onSubmit } : {})}
        />
      </BookingWidgetLayout>
    </BookingWidgetProvider>
  );
}
