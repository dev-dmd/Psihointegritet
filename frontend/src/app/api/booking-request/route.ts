import "server-only";

import { Resend } from "resend";
import { z } from "zod";

/**
 * Demo booking request — Next Route Handler, no backend, no Booking Engine, no
 * persistence (spec §5A, decisions D-021, D-024). Emails the request to the
 * chosen therapist (or, for an unassigned request, to all three) and sends the
 * requester their own confirmation.
 *
 * This is NOT a confirmed appointment — the copy says so, and the emails repeat
 * it. Real slot selection, holds and confirmation are the R2 Booking Engine.
 *
 * Therapist addresses are kept server-side (never shipped to the client bundle)
 * and can be overridden per environment. They move to the DB in R2.
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

/** Indicative individual-session price (Anja's answers, 2026-07-18). */
const PRICE_NOTE = "Individualni termin (60 min): okvirno 4.000 RSD.";

/**
 * Optional intake summary from the guided questionnaire. Plain-language
 * answers only — internal scores never reach any email (client or team).
 */
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

const payloadSchema = z.object({
  // Null slug = unassigned request → goes to the whole team.
  therapistSlug: z
    .enum(["anja-stamenkovic", "marija-stamenkovic", "marjan-jankovic"])
    .nullable(),
  therapistName: z.string().min(1).max(120),
  name: z.string().min(1).max(160),
  email: z.email().max(200),
  summary: summarySchema.optional(),
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
  const { therapistSlug, therapistName, name, email, summary } = parsed.data;

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: "Slanje trenutno nije konfigurisano." },
      { status: 503 },
    );
  }

  const recipients =
    therapistSlug === null
      ? Object.values(THERAPIST_EMAILS) // unassigned → all three
      : [THERAPIST_EMAILS[therapistSlug]!];

  const forWhom =
    therapistSlug === null
      ? "Psihointegritet tim (nedodeljen zahtev)"
      : therapistName;

  const resend = new Resend(apiKey);

  let summaryHtml = "";
  if (summary) {
    const rows = summary.answers
      .map(
        (item) =>
          `<tr><td style="padding:4px 12px 4px 0;color:#4E5F4C;vertical-align:top;">${esc(
            item.question,
          )}</td><td style="padding:4px 0;font-weight:600;">${esc(
            item.answer,
          )}</td></tr>`,
      )
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
      summary.reasons && summary.reasons.length > 0
        ? `<p><strong>Razlozi preporuke:</strong> ${summary.reasons
            .map(esc)
            .join(" ")}</p>`
        : "",
      summary.extraText
        ? `<p><strong>Dodatno, svojim rečima:</strong><br>${esc(
            summary.extraText,
          ).replace(/\n/g, "<br>")}</p>`
        : "",
      summary.needsManualReview
        ? `<p style="color:#B4552D;"><strong>Potreban ručni pregled:</strong> klijent je izabrao „Drugo" kao razlog javljanja.</p>`
        : "",
    ].join("");
    summaryHtml = `<h3 style="color:#2E3B2E;margin-top:18px;">Sažetak upitnika</h3>
    <table style="border-collapse:collapse;">${rows}</table>
    ${meta}`;
  }

  const teamHtml = `<div style="font-family:sans-serif;color:#3A2E28;">
    <h2 style="color:#2E3B2E;">Novi zahtev za termin</h2>
    <p><strong>Za:</strong> ${esc(forWhom)}</p>
    <table style="border-collapse:collapse;">
      <tr><td style="padding:4px 12px 4px 0;color:#4E5F4C;">Ime</td><td style="padding:4px 0;font-weight:600;">${esc(name)}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;color:#4E5F4C;">Email</td><td style="padding:4px 0;font-weight:600;">${esc(email)}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;color:#4E5F4C;">Termin</td><td style="padding:4px 0;">dogovara se nakon zahteva (demo — bez izbora slota)</td></tr>
    </table>
    ${summaryHtml}
    <p style="margin-top:16px;">${PRICE_NOTE}</p>
    <p style="margin-top:16px;color:#8A9D82;font-size:12px;">Demo zahtev. Nije potvrđen termin — javite se klijentu radi dogovora.</p>
  </div>`;

  const teamSend = await resend.emails.send({
    from: FROM,
    to: recipients,
    replyTo: email,
    subject:
      therapistSlug === null
        ? `[Termin] Nedodeljen zahtev — ${name}`
        : `[Termin] Novi zahtev za ${therapistName} — ${name}`,
    html: teamHtml,
  });
  if (teamSend.error) {
    return Response.json({ error: "Slanje nije uspelo." }, { status: 502 });
  }

  // Requester confirmation — best-effort; the request already reached the team.
  const requesterHtml = `<div style="font-family:sans-serif;color:#3A2E28;">
    <p>Poštovani/a ${esc(name)},</p>
    <p>Poslali ste zahtev za termin ${
      therapistSlug === null
        ? "koji će naš tim rasporediti odgovarajućem terapeutu"
        : `kod: <strong>${esc(therapistName)}</strong>`
    }.</p>
    <p><strong>Napomena:</strong> ovo nije potvrda termina — javićemo vam se radi
    dogovora o tačnom datumu i vremenu. Prvi razgovor je prilika da procenite da
    li vam pristup i način rada odgovaraju.</p>
    <p>${PRICE_NOTE} Tačan dogovor pravite direktno sa terapeutom.</p>
    <p style="color:#8A9D82;">Psihointegritet — digitalni centar za mentalno zdravlje</p>
  </div>`;

  await resend.emails.send({
    from: FROM,
    to: email,
    subject: "Vaš zahtev za termin — Psihointegritet",
    html: requesterHtml,
  });

  return Response.json({ ok: true });
}
