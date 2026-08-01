import { z } from "zod";

import type {
  BookingFormat,
  BookingSource,
} from "@/features/booking/booking-context";
import type { BookingSummary } from "@/features/booking/booking-types";
import { postJson } from "@/lib/api/request-json";

export interface BookingRequestPayload {
  therapistSlug: string | null;
  serviceSlug: string;
  format: BookingFormat;
  location: "Niš" | "Leskovac" | null;
  preferredDate: string;
  preferredTime: string;
  alternativeDate?: string;
  name: string;
  email: string;
  phone?: string;
  replyPreference: "email" | "phone";
  message?: string;
  bookingRulesAccepted: true;
  source?: BookingSource;
  website: string;
  summary?: BookingSummary;
}

const bookingRequestResponseSchema = z.object({ ok: z.literal(true) });

export type BookingRequestResponse = z.infer<
  typeof bookingRequestResponseSchema
>;

export function submitBookingRequest(
  payload: BookingRequestPayload,
): Promise<BookingRequestResponse> {
  return postJson(
    "/api/booking-request",
    payload,
    bookingRequestResponseSchema,
  );
}
