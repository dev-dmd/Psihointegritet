"use client";

import { useMutation } from "@tanstack/react-query";

import {
  submitBookingRequest,
  type BookingRequestPayload,
} from "@/lib/api/booking-request";

export const bookingRequestMutationKey = [
  "public",
  "booking-request",
] as const;

export function useBookingRequestMutation() {
  return useMutation({
    mutationKey: bookingRequestMutationKey,
    mutationFn: (payload: BookingRequestPayload) =>
      submitBookingRequest(payload),
    retry: false,
  });
}
