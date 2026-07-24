"use client";

import { useSearchParams } from "next/navigation";

import { parseBookingWidgetSearchParams } from "./booking-widget.config";
import { BookingWidget } from "./components/BookingWidget";
import type {
  BookingService,
  BookingTherapist,
  BookingWidgetProps,
} from "./booking-widget.types";

interface BookingWidgetFromSearchParamsProps extends Omit<
  BookingWidgetProps,
  "service" | "therapist" | "initialFormat"
> {
  services: BookingService[];
  therapists: BookingTherapist[];
  fallbackService: BookingService;
}

/**
 * Thin route adapter for public booking URLs. The widget itself remains URL
 * agnostic, so it can also be embedded on therapist and tenant pages.
 */
export function BookingWidgetFromSearchParams({
  services,
  therapists,
  fallbackService,
  ...props
}: BookingWidgetFromSearchParamsProps) {
  const searchParams = useSearchParams();
  const context = parseBookingWidgetSearchParams(searchParams);
  const service =
    services.find((item) => item.slug === context.serviceSlug) ??
    fallbackService;
  const therapist = therapists.find(
    (item) => item.slug === context.therapistSlug,
  );

  return (
    <div data-booking-source={context.source ?? undefined}>
      <BookingWidget
        {...props}
        service={service}
        {...(therapist ? { therapist } : {})}
        {...(context.format ? { initialFormat: context.format } : {})}
      />
    </div>
  );
}
