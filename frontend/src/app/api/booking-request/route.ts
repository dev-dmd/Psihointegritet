import "server-only";

import { Resend } from "resend";
import { z } from "zod";

import { formatRsd, findService, PRICE_NOTE } from "@/content/services";
import { findTherapist } from "@/content/therapists";
import { therapistProvidesService } from "@/features/booking/booking-context";

/**
 * Demo booking request - Next Route Handler, no database and no Booking
 * Engine. The FastAPI inquiries/booking modules take ownership in a later
 * iteration. This endpoint intentionally sends a request, never confirms a
 * time slot.
 */

const THERAPIST_EMAILS: Record<string, string> = {
  "anja-stamenkovic":
    process.env.THERAPIST_EMAIL_ANJA ?? "anja.stamenkovic@psihointegritet.com",
  "marija-stamenkovic":
    process.env.THERAPIST_EMAIL_MARIJA ??
    "marija.stamenkovic@psihointegritet.com",
  "marjan-jankovic":
    process.env.THERAPIST_EMAIL_MARJAN ?? "marjan.jankovic@psihointegritet.com",
};

const therapistSlugs = [
  "anja-stamenkovic",
  "marija-stamenkovic",
  "marjan-jankovic",
] as const;
const bookingSources = [
  "header",
  "homepage",
  "service",
  "therapist",
  "matching",
  "workshop",
] as const;

const summarySchema = z.object({
  answers: z
    .array(
      z.object({
        question: z.string().max(300),
        answer: z.string().max(600),
      }),
    )
    .max(12),
  extraText: z.string().max(2000).optional(),
  recommendedService: z.string().max(120).optional(),
  recommendedTherapist: z.string().max(120).optional(),
  alternativeTherapist: z.string().max(120).optional(),
  reasons: z.array(z.string().max(300)).max(3).optional(),
  format: z.string().max(120).optional(),
  location: z.string().max(120).optional(),
  priorTherapy: z.string().max(120).optional(),
  needsManualReview: z.boolean().optional(),
});

const payloadSchema = z
  .object({
    therapistSlug: z.enum(therapistSlugs).nullable(),
    serviceSlug: z.string().min(1).max(120),
    format: z.enum(["online", "uzivo"]),
    location: z.enum(["Niš", "Leskovac"]).nullable(),
    preferredDate: z.string().min(1).max(40),
    preferredTime: z.string().min(1).max(80),
    alternativeDate: z.string().max(40).optional(),
    name: z.string().min(1).max(160),
    email: z.email().max(200),
    phone: z.string().max(80).optional(),
    replyPreference: z.enum(["email", "phone"]),
    message: z.string().max(2000).optional(),
    bookingRulesAccepted: z.literal(true),
    source: z.enum(bookingSources).optional(),
    website: z.string().max(200).optional(),
    summary: summarySchema.optional(),
  })
  .superRefine((value, context) => {
    if (value.format === "uzivo" && !value.location) {
      context.addIssue({
        code: "custom",
        path: ["location"],
        message: "Lokacija je obavezna za rad uživo.",
      });
    }
    if (value.format === "online" && value.location !== null) {
      context.addIssue({
        code: "custom",
        path: ["location"],
        message: "Lokacija se ne šalje za online rad.",
      });
    }
    if (value.replyPreference === "phone" && !value.phone?.trim()) {
      context.addIssue({
        code: "custom",
        path: ["phone"],
        message: "Telefon je obavezan kada je izabran odgovor telefonom.",
      });
    }
  });

const FROM =
  process.env.RESEND_FROM_EMAIL ??
  "Psihointegritet <noreply@psihointegritet.com>";

function esc(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function row(label: string, value: string): string {
  return `<tr><td style="padding:4px 12px 4px 0;color:#4E5F4C;vertical-align:top;">${esc(label)}</td><td style="padding:4px 0;">${esc(value)}</td></tr>`;
}

export async function POST(request: Request): Promise<Response> {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return Response.json({ error: "Neispravan zahtev." }, { status: 400 });
  }

  const parsed = payloadSchema.safeParse(json);
  if (!parsed.success) {
    return Response.json({ error: "Neispravni podaci." }, { status: 422 });
  }
  const payload = parsed.data;

  // Quietly accept a filled honeypot without sending a message.
  if (payload.website?.trim()) {
    return Response.json({ ok: true });
  }

  const service = findService(payload.serviceSlug);
  if (!service) {
    return Response.json(
      { error: "Izabrana usluga nije dostupna." },
      { status: 422 },
    );
  }
  const therapist = payload.therapistSlug
    ? findTherapist(payload.therapistSlug)
    : null;
  if (payload.therapistSlug && !therapist) {
    return Response.json(
      { error: "Izabrani terapeut nije dostupan." },
      { status: 422 },
    );
  }
  if (therapist && !therapistProvidesService(therapist.slug, service.slug)) {
    return Response.json(
      { error: "Izabrana kombinacija usluge i terapeuta nije dostupna." },
      { status: 422 },
    );
  }
  if (
    therapist &&
    payload.format === "uzivo" &&
    payload.location !== therapist.city
  ) {
    return Response.json(
      { error: "Izabrani terapeut ne radi na toj lokaciji." },
      { status: 422 },
    );
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: "Slanje trenutno nije konfigurisano." },
      { status: 503 },
    );
  }

  const recipients = therapist
    ? [THERAPIST_EMAILS[therapist.slug]!]
    : Object.values(THERAPIST_EMAILS);
  const forWhom = therapist?.name ?? "Psihointegritet tim (nedodeljen zahtev)";
  const summary = payload.summary;

  let summaryHtml = "";
  if (summary) {
    const rows = summary.answers
      .map((item) => row(item.question, item.answer))
      .join("");
    const meta = [
      summary.recommendedService
        ? `<p><strong>Preporučena usluga:</strong> ${esc(summary.recommendedService)}</p>`
        : "",
      summary.recommendedTherapist
        ? `<p><strong>Preporučeni terapeut:</strong> ${esc(summary.recommendedTherapist)}${
            summary.alternativeTherapist
              ? ` (alternativa: ${esc(summary.alternativeTherapist)})`
              : ""
          }</p>`
        : "",
      summary.reasons?.length
        ? `<p><strong>Razlozi preporuke:</strong> ${summary.reasons.map(esc).join(" ")}</p>`
        : "",
      summary.extraText
        ? `<p><strong>Dodatno, svojim rečima:</strong><br>${esc(summary.extraText).replace(/\n/g, "<br>")}</p>`
        : "",
      summary.needsManualReview
        ? `<p style="color:#B4552D;"><strong>Potreban ručni pregled:</strong> klijent je izabrao „Drugo" kao razlog javljanja.</p>`
        : "",
    ].join("");
    summaryHtml = `<h3 style="color:#2E3B2E;margin-top:18px;">Sažetak upitnika</h3><table style="border-collapse:collapse;">${rows}</table>${meta}`;
  }

  const teamRows = [
    row("Za", forWhom),
    row("Usluga", service.name),
    row("Format", payload.format === "online" ? "Online" : "Uživo"),
    ...(payload.location ? [row("Lokacija", payload.location)] : []),
    row("Željeni datum", payload.preferredDate),
    row("Period dana", payload.preferredTime),
    ...(payload.alternativeDate
      ? [row("Alternativni datum", payload.alternativeDate)]
      : []),
    row("Ime", payload.name),
    row("Email", payload.email),
    ...(payload.phone ? [row("Telefon", payload.phone)] : []),
    row(
      "Odgovor putem",
      payload.replyPreference === "phone" ? "telefona" : "emaila",
    ),
    ...(payload.message ? [row("Poruka", payload.message)] : []),
  ].join("");
  const priceLine = `${service.name} (${service.duration}): okvirno ${formatRsd(service.priceAmount)}.`;
  const teamHtml = `<div style="font-family:sans-serif;color:#3A2E28;">
    <h2 style="color:#2E3B2E;">Novi zahtev za termin</h2>
    <table style="border-collapse:collapse;">${teamRows}</table>
    ${summaryHtml}
    <p style="margin-top:16px;">${priceLine}</p>
    <p style="margin-top:16px;color:#8A9D82;font-size:12px;">Demo zahtev. Nije potvrđen termin - javite se klijentu radi dogovora.</p>
  </div>`;

  const resend = new Resend(apiKey);
  const teamSend = await resend.emails.send({
    from: FROM,
    to: recipients,
    replyTo: payload.email,
    subject: therapist
      ? `[Termin] Novi zahtev za ${therapist.name} - ${payload.name}`
      : `[Termin] Nedodeljen zahtev - ${payload.name}`,
    html: teamHtml,
  });
  if (teamSend.error) {
    return Response.json({ error: "Slanje nije uspelo." }, { status: 502 });
  }

  const requesterHtml = `<div style="font-family:sans-serif;color:#3A2E28;">
    <p>Poštovani/a ${esc(payload.name)},</p>
    <p>Poslali ste zahtev za ${esc(service.name)}${
      therapist ? ` kod: <strong>${esc(therapist.name)}</strong>` : ""
    }.</p>
    <p><strong>Napomena:</strong> ovo nije potvrda termina. ${
      therapist ? "Terapeut" : "Član tima"
    } će proveriti dostupnost i javiti vam se radi dogovora o tačnom datumu i vremenu.</p>
    <p>${esc(PRICE_NOTE)}</p>
    <p style="color:#8A9D82;">Psihointegritet - digitalni centar za mentalno zdravlje</p>
  </div>`;

  await resend.emails.send({
    from: FROM,
    to: payload.email,
    subject: "Vaš zahtev za termin - Psihointegritet",
    html: requesterHtml,
  });

  return Response.json({ ok: true });
}
