"use client";

import { useSearchParams } from "next/navigation";

import { parseBookingWidgetSearchParams } from "./booking-widget.config";
import { BookingWidget } from "./components/BookingWidget";
import type { BookingWidgetProps } from "./booking-widget.types";

interface BookingWidgetFromSearchParamsProps extends Omit<
  BookingWidgetProps,
  "initialFormat" | "initialServiceId" | "initialTherapistId"
> {}

/**
 * Thin route adapter for public booking URLs. The widget itself remains URL
 * agnostic, so it can also be embedded on therapist and tenant pages.
 *
 * URL params ``?therapist=slug`` and ``?service=slug`` pre-select via
 * ``initialTherapistId`` and ``initialServiceId``.
 */
export function BookingWidgetFromSearchParams({
  ...props
}: BookingWidgetFromSearchParamsProps) {
  const searchParams = useSearchParams();
  const context = parseBookingWidgetSearchParams(searchParams);

  return (
    <div data-booking-source={context.source ?? undefined}>
      <BookingWidget
        {...props}
        {...(context.therapistSlug
          ? { initialTherapistId: context.therapistSlug }
          : {})}
        {...(context.serviceSlug
          ? { initialServiceId: context.serviceSlug }
          : {})}
        {...(context.format ? { initialFormat: context.format } : {})}
      />
    </div>
  );
}
