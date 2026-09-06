"use client";

import { useMutation, useQuery } from "@tanstack/react-query";

import {
  acceptAlternative,
  getAvailableSlots,
  getClientRequests,
  holdSlot,
  listStaffAppointmentRequests,
  submitAppointmentRequest,
  type AppointmentRequestPayload,
  type SlotHoldRequest,
  type SlotQueryParams,
} from "@/lib/api/booking";

// ── Query key factory ───────────────────────────────────────────────────────

export const bookingQueryKeys = {
  all: ["booking"] as const,
  slots: (params: SlotQueryParams) =>
    [...bookingQueryKeys.all, "slots", params] as const,
  clientRequests: (email: string) =>
    [...bookingQueryKeys.all, "client-requests", email] as const,
};

// ── Public hooks ────────────────────────────────────────────────────────────

/** Fetch available time slots for a specific service/therapist/format combo. */
export function useBookingSlots(params: SlotQueryParams | null) {
  return useQuery({
    queryKey: bookingQueryKeys.slots(params!),
    queryFn: () => getAvailableSlots(params!),
    enabled: params !== null,
    staleTime: 30_000, // slots are volatile — short stale time
  });
}

/** Atomically hold a slot during form submission. */
export function useHoldSlot() {
  return useMutation({
    mutationFn: ({
      payload,
      signal,
    }: {
      payload: SlotHoldRequest;
      signal?: AbortSignal;
    }) => holdSlot(payload, signal),
    retry: false,
  });
}

/** Submit a booking request to the backend. */
export function useSubmitBookingRequest() {
  return useMutation({
    mutationFn: (payload: AppointmentRequestPayload) =>
      submitAppointmentRequest(payload),
    retry: false,
  });
}

/** Fetch client's existing requests by email. */
export function useClientRequests(email: string | null) {
  return useQuery({
    queryKey: bookingQueryKeys.clientRequests(email!),
    queryFn: () => getClientRequests(email!),
    enabled: email !== null && email.length > 0,
    staleTime: 30_000,
  });
}

/** Accept a proposed alternative slot. */
export function useAcceptAlternative() {
  return useMutation({
    mutationFn: ({
      requestId,
      proposalId,
      idempotencyKey,
    }: {
      requestId: string;
      proposalId: string;
      idempotencyKey: string;
    }) => acceptAlternative(requestId, proposalId, idempotencyKey),
    retry: false,
  });
}

// ── Staff hooks ─────────────────────────────────────────────────────────────

export const staffBookingQueryKeys = {
  all: ["staff", "booking"] as const,
  requests: (params?: { therapist_profile_id?: string; status?: string }) =>
    [...staffBookingQueryKeys.all, "requests", params] as const,
  appointments: (params?: {
    therapist_profile_id?: string;
    date_from?: string;
    date_until?: string;
  }) => [...staffBookingQueryKeys.all, "appointments", params] as const,
};

/** Fetch appointment requests for staff review. */
export function useStaffAppointmentRequests(params?: {
  therapist_profile_id?: string;
  status?: string;
}) {
  return useQuery({
    queryKey: staffBookingQueryKeys.requests(params),
    queryFn: () => listStaffAppointmentRequests(params),
    staleTime: 15_000,
  });
}
