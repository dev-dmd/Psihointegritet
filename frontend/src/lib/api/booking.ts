/** Typed API transport for all Booking Engine endpoints.

Public endpoints go through same-origin Route Handler proxies
(``/api/booking/...``). Staff endpoints go through the same proxies
which forward the Clerk session token to FastAPI.

Every function validates the response at the boundary with Zod.
*/

import { z } from "zod";

import { requestJson } from "@/lib/api/request-json";

// ── Public schemas ───────────────────────────────────────────────────────────

const derivedSlotSchema = z.object({
  start: z.string().datetime(),
  end: z.string().datetime(),
  therapist_profile_id: z.string().uuid(),
  service_id: z.string().uuid(),
  format: z.string(),
  slot_duration_minutes: z.number().int().positive(),
});

const slotHoldOutSchema = z.object({
  id: z.string().uuid(),
  slot_start: z.string().datetime(),
  slot_end: z.string().datetime(),
  expires_at: z.string().datetime(),
});

const appointmentRequestOutSchema = z.object({
  id: z.string().uuid(),
  organization_id: z.string().uuid(),
  therapist_profile_id: z.string().uuid(),
  service_id: z.string().uuid(),
  request_type: z.string(),
  status: z.string(),
  preferred_start: z.string().datetime().nullable(),
  preferred_end: z.string().datetime().nullable(),
  existing_appointment_id: z.string().uuid().nullable(),
  format: z.string(),
  location_id: z.string().uuid().nullable(),
  client_name: z.string(),
  client_email: z.string().email(),
  client_timezone: z.string(),
  client_note: z.string().nullable(),
  expires_at: z.string().datetime().nullable(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

const appointmentOutSchema = z.object({
  id: z.string().uuid(),
  organization_id: z.string().uuid(),
  therapist_profile_id: z.string().uuid(),
  service_id: z.string().uuid(),
  appointment_request_id: z.string().uuid().nullable(),
  start_time: z.string().datetime(),
  end_time: z.string().datetime(),
  format: z.string(),
  location_id: z.string().uuid().nullable(),
  status: z.string(),
  client_name: z.string(),
  client_email: z.string().email(),
  client_timezone: z.string(),
  client_note: z.string().nullable(),
  cancelled_by: z.string().nullable(),
  cancellation_reason: z.string().nullable(),
  cancelled_at: z.string().datetime().nullable(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

// ── Public payload types (hand-written — no OpenAPI gen yet) ─────────────────

export interface SlotQueryParams {
  service_id: string;
  therapist_profile_id: string;
  format: string;
  location_id?: string;
  date_from: string; // YYYY-MM-DD
  date_until: string; // YYYY-MM-DD
  client_timezone?: string;
}

export interface SlotHoldRequest {
  therapist_profile_id: string;
  service_id: string;
  slot_start: string; // ISO 8601
  slot_end: string;
  client_timezone: string;
  idempotency_key: string;
}

export interface AppointmentRequestPayload {
  therapist_profile_id: string;
  service_id: string;
  request_type: "initial" | "reschedule";
  preferred_start?: string | null;
  preferred_end?: string | null;
  existing_appointment_id?: string | null;
  format: string;
  location_id?: string | null;
  client_name: string;
  client_email: string;
  client_phone?: string | null;
  client_timezone: string;
  client_note?: string | null;
  idempotency_key: string;
  consent_booking_rules: boolean;
}

export interface ReviewActionPayload {
  action: "confirm" | "decline" | "propose_alternative";
  reason?: string | null;
  alternatives?: Array<{
    proposed_start: string;
    proposed_end: string;
    format: string;
    location_id?: string | null;
    therapist_note?: string | null;
    expires_at?: string | null;
  }> | null;
}

export interface CancelAppointmentPayload {
  reason?: string | null;
}

// ── Derive type aliases ─────────────────────────────────────────────────────

export type DerivedSlot = z.infer<typeof derivedSlotSchema>;
export type SlotHold = z.infer<typeof slotHoldOutSchema>;
export type AppointmentRequest = z.infer<typeof appointmentRequestOutSchema>;
export type Appointment = z.infer<typeof appointmentOutSchema>;

// ── Public endpoints (through BFF) ──────────────────────────────────────────

export async function getAvailableSlots(
  params: SlotQueryParams,
): Promise<DerivedSlot[]> {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null) qs.set(k, v as string);
  }
  return requestJson(
    `/api/booking/slots?${qs.toString()}`,
    { method: "GET" },
    z.array(derivedSlotSchema),
  );
}

export async function holdSlot(
  payload: SlotHoldRequest,
  signal?: AbortSignal,
): Promise<SlotHold> {
  return requestJson(
    "/api/booking/slots/hold",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: signal ?? null,
    },
    slotHoldOutSchema,
  );
}

export async function releaseSlotHold(holdId: string): Promise<void> {
  await fetch(`/api/booking/slots/hold/${holdId}`, { method: "DELETE" });
}

export async function submitAppointmentRequest(
  payload: AppointmentRequestPayload,
): Promise<AppointmentRequest> {
  return requestJson(
    "/api/booking/appointment-requests",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
    appointmentRequestOutSchema,
  );
}

export async function getClientRequests(
  email: string,
): Promise<AppointmentRequest[]> {
  return requestJson(
    `/api/booking/appointment-requests/client/${encodeURIComponent(email)}`,
    { method: "GET" },
    z.array(appointmentRequestOutSchema),
  );
}

/**
 * The signed-in client's own requests — the client panel's only booking read.
 *
 * Deliberately parameterless: unlike `getClientRequests`, the email is not the
 * caller's to choose. `app/api/account/appointment-requests` resolves it from
 * the session, which is what makes this safe to call from the browser.
 */
export async function getMyAppointmentRequests(): Promise<
  AppointmentRequest[]
> {
  return requestJson(
    "/api/account/appointment-requests",
    { method: "GET" },
    z.array(appointmentRequestOutSchema),
  );
}

export async function acceptAlternative(
  requestId: string,
  proposalId: string,
  idempotencyKey: string,
): Promise<{ status: string }> {
  return requestJson(
    `/api/booking/appointment-requests/${requestId}/accept-alternative`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        proposal_id: proposalId,
        idempotency_key: idempotencyKey,
      }),
    },
    z.object({ status: z.string() }),
  );
}

// ── Staff endpoints (through BFF — session auth forwarded) ───────────────────

export async function listStaffAppointmentRequests(params?: {
  therapist_profile_id?: string;
  status?: string;
}): Promise<AppointmentRequest[]> {
  const qs = new URLSearchParams();
  if (params?.therapist_profile_id) {
    qs.set("therapist_profile_id", params.therapist_profile_id);
  }
  if (params?.status) qs.set("status", params.status);
  const q = qs.toString();
  return requestJson(
    `/api/booking/staff/appointment-requests${q ? `?${q}` : ""}`,
    { method: "GET" },
    z.array(appointmentRequestOutSchema),
  );
}

export async function reviewRequest(
  requestId: string,
  payload: ReviewActionPayload,
): Promise<AppointmentRequest> {
  return requestJson(
    `/api/booking/staff/appointment-requests/${requestId}/review`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
    appointmentRequestOutSchema,
  );
}

/**
 * The parameter is `therapist_profile_id`, not `therapist_id`: FastAPI ignores
 * unknown query params, so the old name silently returned *every* therapist's
 * appointments instead of filtering to one.
 */
export async function listStaffAppointments(params?: {
  therapist_profile_id?: string;
  status?: string;
  date_from?: string;
  date_until?: string;
}): Promise<Appointment[]> {
  const qs = new URLSearchParams();
  if (params?.therapist_profile_id) {
    qs.set("therapist_profile_id", params.therapist_profile_id);
  }
  if (params?.status) qs.set("status", params.status);
  if (params?.date_from) qs.set("date_from", params.date_from);
  if (params?.date_until) qs.set("date_until", params.date_until);
  const q = qs.toString();
  return requestJson(
    `/api/booking/staff/appointments${q ? `?${q}` : ""}`,
    { method: "GET" },
    z.array(appointmentOutSchema),
  );
}

export async function cancelAppointment(
  appointmentId: string,
  payload: CancelAppointmentPayload,
): Promise<Appointment> {
  return requestJson(
    `/api/booking/staff/appointments/${appointmentId}/cancel`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
    appointmentOutSchema,
  );
}

export async function completeAppointment(
  appointmentId: string,
): Promise<Appointment> {
  return requestJson(
    `/api/booking/staff/appointments/${appointmentId}/complete`,
    { method: "POST" },
    appointmentOutSchema,
  );
}

export async function noShowAppointment(
  appointmentId: string,
): Promise<Appointment> {
  return requestJson(
    `/api/booking/staff/appointments/${appointmentId}/no-show`,
    { method: "POST" },
    appointmentOutSchema,
  );
}
