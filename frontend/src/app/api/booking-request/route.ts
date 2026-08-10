import "server-only";

import { z } from "zod";

import { serverEnv } from "@/lib/validation/env";

/**
 * Public booking request — BFF proxy to FastAPI Booking Engine.
 *
 * R2.5 replaces the demo Resend email-only handler. The form still speaks in
 * therapist slugs / service slugs / format strings — this handler resolves
 * them to UUIDs server-side and forwards to the FastAPI endpoint.
 *
 * In R2 request-first mode the FastAPI creates an ``AppointmentRequest``
 * with status ``submitted``. No slot is reserved, no real-time availability
 * is checked — the therapist reviews and confirms later.
 */

// ── Slug → UUID mapping (hardcoded — tech debt tracked for CMS migration) ───
//
// Therapist UUIDs from therapist_matching_profiles (provision_team.py).
// Service UUIDs from content_entries (seed_booking_services.py).
// Populated from development DB 2026-08-08; therapists re-read 2026-08-10
// after the D-074 team replacement created the incoming profiles.
//
// These ids are per-database. `provision_team.py` lets Postgres generate them,
// so staging and production hold *different* UUIDs for the same three slugs —
// re-read this table from each environment after running the swap there, or a
// request arrives with `therapist_profile_id: null` and no error to explain it.

const THERAPIST_SLUG_TO_ID: Record<string, string> = {
  "maria-bullock": "1d163c01-1bea-4098-913c-087f1d81137f",
  "elsa-browers": "f0990ab2-76fb-42a6-97a3-1aa201805212",
  "john-francis": "9fd95a7f-0f1b-4b12-ba60-4fb4d1fcbecb",
};

const SERVICE_SLUG_TO_ID: Record<string, string> = {
  "individualna-psihoterapija": "94bc327b-14e3-49d4-af7f-166c78a5d1a5",
  "bracno-savetovanje": "1b457aca-0bda-4c40-b97b-7513cfc28f0c",
  "roditeljsko-savetovanje": "d4195f62-6a15-4c71-89d3-41999d87114b",
};

// ── Payload validation (same schema as before) ──────────────────────────────

const therapistSlugs = [
  "maria-bullock",
  "elsa-browers",
  "john-francis",
] as const;

const payloadSchema = z.object({
  therapistSlug: z.enum(therapistSlugs).nullable(),
  serviceSlug: z.string().min(1).max(120),
  format: z.enum(["online", "uzivo"]),
  location: z.enum(["Chicago", "Milwaukee", "Madison"]).nullable(),
  preferredDate: z.string().min(1).max(40),
  preferredTime: z.string().min(1).max(80).optional(),
  alternativeDate: z.string().max(40).optional(),
  name: z.string().min(1).max(160),
  email: z.email().max(200),
  phone: z.string().max(80).optional(),
  replyPreference: z.enum(["email", "phone"]),
  message: z.string().max(2000).optional(),
  bookingRulesAccepted: z.literal(true),
  source: z.string().max(120).optional(),
  website: z.string().max(200).optional(),
});

// ── POST handler ────────────────────────────────────────────────────────────

export async function POST(request: Request): Promise<Response> {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return Response.json({ error: "Neispravan zahtev." }, { status: 400 });
  }

  const parsed = payloadSchema.safeParse(json);
  if (!parsed.success) {
    return Response.json(
      { error: "Neispravni podaci.", details: parsed.error.flatten() },
      { status: 422 },
    );
  }
  const payload = parsed.data;

  // Honeypot: silently accept
  if (payload.website?.trim()) {
    return Response.json({ ok: true });
  }

  // Resolve slugs
  const therapistProfileId = payload.therapistSlug
    ? (THERAPIST_SLUG_TO_ID[payload.therapistSlug] ?? null)
    : null;
  const serviceId = SERVICE_SLUG_TO_ID[payload.serviceSlug];

  if (!serviceId) {
    return Response.json(
      {
        error: `Usluga "${payload.serviceSlug}" nema UUID. Pokrenite scripts/seed_booking_services.py.`,
      },
      { status: 422 },
    );
  }

  // Build client_note from preferred date/time + message
  const noteParts: string[] = [];
  if (payload.preferredDate)
    noteParts.push(`Željeni datum: ${payload.preferredDate}`);
  if (payload.preferredTime)
    noteParts.push(`Željeno vreme: ${payload.preferredTime}`);
  if (payload.alternativeDate)
    noteParts.push(`Alternativni datum: ${payload.alternativeDate}`);
  if (payload.phone) noteParts.push(`Telefon: ${payload.phone}`);
  if (payload.replyPreference)
    noteParts.push(
      `Odgovor: ${payload.replyPreference === "email" ? "emailom" : "telefonom"}`,
    );
  if (payload.message) noteParts.push(`Poruka: ${payload.message}`);
  if (payload.source) noteParts.push(`Izvor: ${payload.source}`);

  // Forward to FastAPI
  const fastApiPayload = {
    therapist_profile_id: therapistProfileId ?? null,
    service_id: serviceId,
    request_type: "initial",
    preferred_start: null,
    preferred_end: null,
    format: payload.format === "online" ? "online" : "in_person",
    location_id: null,
    client_name: payload.name,
    client_email: payload.email,
    client_phone: payload.phone ?? null,
    client_timezone: "Europe/Belgrade",
    client_note: noteParts.join(" | ") || null,
    idempotency_key: `${payload.email}-${Date.now()}`,
    consent_booking_rules: payload.bookingRulesAccepted === true,
  };

  try {
    const backendResponse = await fetch(
      `${serverEnv.NEXT_PUBLIC_API_URL}/api/v1/booking/appointment-requests`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(fastApiPayload),
        cache: "no-store",
      },
    );

    const body =
      backendResponse.status === 204
        ? null
        : await backendResponse.json().catch(() => null);

    if (!backendResponse.ok) {
      return Response.json(
        body ?? { error: "Backend nije prihvatio zahtev." },
        {
          status: backendResponse.status,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    return Response.json(
      { ok: true, id: body?.id, status: body?.status },
      { status: 201 },
    );
  } catch {
    return Response.json(
      { error: "Booking servis trenutno nije dostupan." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
