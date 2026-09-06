import {
  buildBookingHref,
  type BookingCatalogs,
  type BookingFormat,
} from "@/features/booking/booking-context";

export function resultBookingHref(
  catalogs: BookingCatalogs,
  service: string | undefined,
  therapist: string | undefined,
  format: BookingFormat | null | undefined,
): string {
  return buildBookingHref(
    { service, therapist, format, source: "matching" },
    catalogs,
  );
}
