import "server-only";

import { Resend } from "resend";
import { z } from "zod";

/**
 * Demo B2B inquiry — Next Route Handler, no backend, no persistence. Emails a
 * structured inquiry to the team and sends the company an auto-reply, via
 * Resend (decisions D-023, D-024). Payload follows the reworked configurator
 * (employees / goals / topics / format — Anja's answers, 2026-07-18); every
 * model is „Cena po ponudi". No employee health data is collected. Moves to
 * the notifications backend in R4 per ARCHITECTURAL_RULES §1.1.
 */

const payloadSchema = z.object({
  model: z.object({ name: z.string().max(120), price: z.string().max(120) }),
  answers: z.object({
    employees: z.string().max(120).nullable(),
    goals: z.array(z.string().max(200)).max(10),
    topics: z.array(z.string().max(200)).max(10),
    format: z.string().max(120).nullable(),
  }),
  contact: z.object({
    companyName: z.string().min(1).max(200),
    contactName: z.string().min(1).max(200),
    email: z.email().max(200),
    phone: z.string().max(60).optional(),
    message: z.string().max(2000).optional(),
  }),
});

const TEAM_INBOX =
  process.env.SURVEY_RECIPIENT_EMAIL ?? "info@psihointegritet.com";
const FROM =
  process.env.RESEND_FROM_EMAIL ??
  "Psihointegritet <noreply@psihointegritet.com>";

function esc(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function row(label: string, value: string | null | undefined): string {
  if (!value) return "";
  return `<tr><td style="padding:4px 12px 4px 0;color:#4E5F4C;vertical-align:top;">${esc(
    label,
  )}</td><td style="padding:4px 0;font-weight:600;">${esc(value)}</td></tr>`;
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
  const { model, answers, contact } = parsed.data;

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: "Slanje trenutno nije konfigurisano." },
      { status: 503 },
    );
  }

  const teamHtml = `<div style="font-family:sans-serif;color:#3A2E28;">
    <h2 style="color:#2E3B2E;">Novi upit — rad sa kompanijama</h2>
    <table style="border-collapse:collapse;">
      ${row("Kompanija", contact.companyName)}
      ${row("Kontakt osoba", contact.contactName)}
      ${row("Email", contact.email)}
      ${row("Telefon", contact.phone)}
    </table>
    <h3 style="color:#2E3B2E;margin-top:18px;">Odgovori iz konfiguratora</h3>
    <table style="border-collapse:collapse;">
      ${row("Broj zaposlenih", answers.employees)}
      ${row("Oblici saradnje", answers.goals.join(", "))}
      ${row("Teme", answers.topics.join(", "))}
      ${row("Format", answers.format)}
    </table>
    <h3 style="color:#2E3B2E;margin-top:18px;">Preporučeni program</h3>
    <p><strong>${esc(model.name)}</strong> — ${esc(model.price)}</p>
    ${
      contact.message
        ? `<p style="margin-top:12px;"><strong>Poruka:</strong><br>${esc(
            contact.message,
          ).replace(/\n/g, "<br>")}</p>`
        : ""
    }
    <p style="margin-top:20px;color:#8A9D82;font-size:12px;">Demo upit. Bez zdravstvenih podataka zaposlenih.</p>
  </div>`;

  const replyHtml = `<div style="font-family:sans-serif;color:#3A2E28;">
    <p>Poštovani/a ${esc(contact.contactName)},</p>
    <p>Hvala na interesovanju za saradnju sa Psihointegritetom. Primili smo vaš
    upit (preporučeni program: <strong>${esc(model.name)}</strong>).</p>
    <p>Član tima će vas kontaktirati radi potvrde potreba i pripreme konačne
    ponude.</p>
    <p style="color:#8A9D82;">Psihointegritet — digitalni centar za mentalno zdravlje</p>
  </div>`;

  const resend = new Resend(apiKey);

  const teamSend = await resend.emails.send({
    from: FROM,
    to: TEAM_INBOX,
    replyTo: contact.email,
    subject: `[Kompanije] Novi upit — ${contact.companyName} — ${model.name}`,
    html: teamHtml,
  });
  if (teamSend.error) {
    return Response.json({ error: "Slanje nije uspelo." }, { status: 502 });
  }

  // Auto-reply is best-effort — the inquiry already reached the team.
  await resend.emails.send({
    from: FROM,
    to: contact.email,
    subject: "Vaš upit za saradnju sa Psihointegritetom",
    html: replyHtml,
  });

  return Response.json({ ok: true });
}
