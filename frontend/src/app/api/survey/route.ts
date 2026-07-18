import "server-only";

import { Resend } from "resend";
import { z } from "zod";

/**
 * Demo survey submission — Next Route Handler, no backend, no persistence.
 * Sends the collected answers by email to the research inbox via Resend
 * (decision D-024). When the real notifications backend (R1.3) exists this
 * moves there per ARCHITECTURAL_RULES §1.1.
 */

const answerSchema = z.object({
  question: z.string().min(1).max(300),
  answer: z.string().min(1).max(300),
});

const payloadSchema = z.object({
  surveyId: z.string().min(1).max(80),
  answers: z.array(answerSchema).min(1).max(20),
  // Optional free text — kept short; never health data (survey copy says so).
  note: z.string().max(2000).optional(),
});

const RECIPIENT =
  process.env.SURVEY_RECIPIENT_EMAIL ?? "info@psihointegritet.com";
const FROM =
  process.env.RESEND_FROM_EMAIL ??
  "Psihointegritet <noreply@psihointegritet.com>";

function escapeHtml(value: string): string {
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
  const { surveyId, answers, note } = parsed.data;

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    // Demo safety: never crash the app, just report the survey can't send.
    return Response.json(
      { error: "Slanje trenutno nije konfigurisano." },
      { status: 503 },
    );
  }

  const rows = answers
    .map(
      (item) =>
        `<tr><td style="padding:4px 12px 4px 0;color:#4E5F4C;">${escapeHtml(
          item.question,
        )}</td><td style="padding:4px 0;font-weight:600;">${escapeHtml(
          item.answer,
        )}</td></tr>`,
    )
    .join("");
  const noteBlock = note
    ? `<p style="margin-top:16px;"><strong>Dodatni komentar:</strong><br>${escapeHtml(note).replace(/\n/g, "<br>")}</p>`
    : "";

  const html = `<div style="font-family:sans-serif;color:#3A2E28;">
    <h2 style="color:#2E3B2E;">Nova anketa — ${escapeHtml(surveyId)}</h2>
    <table style="border-collapse:collapse;">${rows}</table>
    ${noteBlock}
    <p style="margin-top:20px;color:#8A9D82;font-size:12px;">Anonimna anketa sa javnog sajta. Bez ličnih i zdravstvenih podataka.</p>
  </div>`;

  const resend = new Resend(apiKey);
  const { error } = await resend.emails.send({
    from: FROM,
    to: RECIPIENT,
    subject: `[Anketa] ${surveyId}`,
    html,
  });

  if (error) {
    return Response.json({ error: "Slanje nije uspelo." }, { status: 502 });
  }

  return Response.json({ ok: true });
}
