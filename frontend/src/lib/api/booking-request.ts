/** Thin adapter: POSTs the public booking form payload to the BFF Route Handler.
 *
 * All slug→UUID resolution and FastAPI forwarding happens server-side
 * in ``app/api/booking-request/route.ts``.  The form sends slugs/formats
 * — the Route Handler translates to UUIDs before calling the backend.
 */

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
  preferredTime?: string;
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

const bookingRequestResponseSchema = z.object({
  ok: z.literal(true),
  id: z.string().uuid().optional(),
  status: z.string().optional(),
});

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

