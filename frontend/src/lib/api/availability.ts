import { z } from "zod";

/**
 * Availability transport (ADR-015 v2 §2.7) — layers 1 and 3.
 *
 * Layer 1 (working hours) is `AvailabilityProfile` + `AvailabilityRule`;
 * layer 3 (exceptions) is `AvailabilityException`. Layer 2 (generated slots)
 * and layer 4 (company capacity) are deliberately not here yet.
 *
 * Everything goes through the BFF under `/api/booking/staff/**`, never
 * straight to FastAPI: the Clerk session token must not reach the browser.
 */

export const availabilityModes = [
  "hourly_grid",
  "flexible_grid",
  "manual_slots",
] as const;
export type AvailabilityMode = (typeof availabilityModes)[number];

export const availabilityFormats = ["online", "in_person"] as const;
export type AvailabilityFormat = (typeof availabilityFormats)[number];

const profileSchema = z.object({
  id: z.string(),
  organization_id: z.string(),
  therapist_profile_id: z.string(),
  mode: z.string(),
  timezone: z.string(),
  start_step_minutes: z.number().nullable(),
  min_lead_time_hours: z.number(),
  cancellation_notice_hours: z.number(),
  enabled: z.boolean(),
});

const ruleSchema = z.object({
  id: z.string(),
  availability_profile_id: z.string(),
  day_of_week: z.number(),
  start_local_time: z.string(),
  end_local_time: z.string(),
  valid_from: z.string(),
  valid_until: z.string().nullable(),
  format: z.string(),
  location_id: z.string().nullable(),
  is_active: z.boolean(),
});

const exceptionSchema = z.object({
  id: z.string(),
  therapist_profile_id: z.string(),
  availability_profile_id: z.string().nullable(),
  kind: z.string(),
  starts_at: z.string(),
  ends_at: z.string(),
  format: z.string().nullable(),
  location_id: z.string().nullable(),
  reason_code: z.string().nullable(),
});

export type AvailabilityProfile = z.infer<typeof profileSchema>;
export type AvailabilityRule = z.infer<typeof ruleSchema>;
export type AvailabilityException = z.infer<typeof exceptionSchema>;

async function request<T>(
  path: string,
  init: RequestInit,
  schema: z.ZodType<T>,
): Promise<T> {
  const response = await fetch(path, init);
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(
      detail || `Zahtev nije uspeo (${String(response.status)}).`,
    );
  }
  if (response.status === 204) return schema.parse(undefined);
  return schema.parse(await response.json());
}

const jsonHeaders = { "Content-Type": "application/json" } as const;

// ── Who am I ────────────────────────────────────────────────────────────────

const myTherapistSchema = z.object({
  id: z.string(),
  slug: z.string(),
  display_name: z.string(),
});

export type MyTherapistProfile = z.infer<typeof myTherapistSchema>;

/**
 * The browser only knows a Clerk user; the availability tables key on
 * `therapist_matching_profiles.id`. The mapping is resolved server-side, and a
 * 404 legitimately means "this account is not a therapist".
 */
export async function getMyTherapistProfile(): Promise<MyTherapistProfile | null> {
  const response = await fetch("/api/booking/staff/availability/me", {
    method: "GET",
  });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error("Profil terapeuta nije mogao da se učita.");
  return myTherapistSchema.parse(await response.json());
}

// ── Layer 1: profile ────────────────────────────────────────────────────────

export async function listAvailabilityProfiles(
  therapistProfileId: string,
): Promise<AvailabilityProfile[]> {
  return request(
    `/api/booking/staff/availability/profiles/${therapistProfileId}`,
    { method: "GET" },
    z.array(profileSchema),
  );
}

export interface AvailabilityProfileInput {
  therapist_profile_id: string;
  mode: AvailabilityMode;
  timezone: string;
  start_step_minutes: number | null;
  min_lead_time_hours: number;
  cancellation_notice_hours: number;
  enabled: boolean;
}

export async function createAvailabilityProfile(
  payload: AvailabilityProfileInput,
): Promise<AvailabilityProfile> {
  return request(
    "/api/booking/staff/availability/profiles",
    { method: "POST", headers: jsonHeaders, body: JSON.stringify(payload) },
    profileSchema,
  );
}

export async function updateAvailabilityProfile(
  profileId: string,
  payload: AvailabilityProfileInput,
): Promise<AvailabilityProfile> {
  return request(
    `/api/booking/staff/availability/profiles/${profileId}`,
    { method: "PUT", headers: jsonHeaders, body: JSON.stringify(payload) },
    profileSchema,
  );
}

// ── Layer 1: rules ──────────────────────────────────────────────────────────

export async function listAvailabilityRules(
  profileId: string,
): Promise<AvailabilityRule[]> {
  return request(
    `/api/booking/staff/availability/rules/${profileId}`,
    { method: "GET" },
    z.array(ruleSchema),
  );
}

export interface AvailabilityRuleInput {
  availability_profile_id: string;
  day_of_week: number;
  start_local_time: string;
  end_local_time: string;
  valid_from: string;
  valid_until?: string | null;
  format: AvailabilityFormat;
  location_id?: string | null;
}

export async function createAvailabilityRule(
  payload: AvailabilityRuleInput,
): Promise<AvailabilityRule> {
  return request(
    "/api/booking/staff/availability/rules",
    { method: "POST", headers: jsonHeaders, body: JSON.stringify(payload) },
    ruleSchema,
  );
}

export async function deleteAvailabilityRule(ruleId: string): Promise<void> {
  const response = await fetch(
    `/api/booking/staff/availability/rules/${ruleId}`,
    { method: "DELETE" },
  );
  if (!response.ok) throw new Error("Brisanje smene nije uspelo.");
}

// ── Layer 3: exceptions ─────────────────────────────────────────────────────

export async function listAvailabilityExceptions(
  therapistProfileId: string,
  dateFrom: string,
  dateUntil: string,
): Promise<AvailabilityException[]> {
  const query = new URLSearchParams({
    date_from: dateFrom,
    date_until: dateUntil,
  });
  return request(
    `/api/booking/staff/availability/exceptions/${therapistProfileId}?${query.toString()}`,
    { method: "GET" },
    z.array(exceptionSchema),
  );
}

export interface AvailabilityExceptionInput {
  therapist_profile_id: string;
  availability_profile_id?: string | null;
  kind: "unavailable" | "extra_available";
  starts_at: string;
  ends_at: string;
  format?: string | null;
  location_id?: string | null;
  reason_code?: string | null;
}

export async function createAvailabilityException(
  payload: AvailabilityExceptionInput,
): Promise<AvailabilityException> {
  return request(
    "/api/booking/staff/availability/exceptions",
    { method: "POST", headers: jsonHeaders, body: JSON.stringify(payload) },
    exceptionSchema,
  );
}

export async function deleteAvailabilityException(
  exceptionId: string,
): Promise<void> {
  const response = await fetch(
    `/api/booking/staff/availability/exceptions/${exceptionId}`,
    { method: "DELETE" },
  );
  if (!response.ok) throw new Error("Brisanje izuzetka nije uspelo.");
}
