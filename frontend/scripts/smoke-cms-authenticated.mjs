/**
 * Real development-Clerk staff panel smoke.
 *
 * Sadržaj: open a system page from the catalogue (lazily registers its CMS
 * revision) -> UI edit -> save -> stale-lock 409 -> delete the created draft.
 * Then loads the two decomposed panels (Dokumenti, Kompas) and asserts they
 * render against the real API.
 *
 * Usage:
 *   node scripts/smoke-cms-authenticated.mjs user_...
 *
 * Reads only CLERK_SECRET_KEY from `.env.local`, never prints it or the
 * one-time sign-in ticket. Anything the run creates is removed before exit.
 *
 * ⚠️ Rewritten 2026-08-01. The previous version drove a „Nova stranica" +
 * „Slug" create form on /radni-prostor/sadrzaj. Task 1.10 (2026-07-30) removed
 * free creation of system routes — the catalogue is now fixed and the backend
 * rejects identities outside it — so the old script could no longer pass. It
 * had not been updated since commit 4e44208.
 */
import fs from "node:fs";
import path from "node:path";

import { chromium } from "@playwright/test";

const BASE_URL = process.env.SMOKE_BASE_URL ?? "http://localhost:3007";

const userId = process.argv[2];
if (!userId?.startsWith("user_")) {
  throw new Error("Pass one development Clerk user id (user_...).");
}

function envValue(name) {
  if (process.env[name]) return process.env[name];
  const source = fs.readFileSync(path.resolve(".env.local"), "utf8");
  const line = source
    .split(/\r?\n/)
    .find((candidate) => candidate.startsWith(`${name}=`));
  if (!line) return null;
  return line
    .slice(name.length + 1)
    .trim()
    .replace(/^(['"])(.*)\1$/, "$2");
}

const secretKey = envValue("CLERK_SECRET_KEY");
if (!secretKey?.startsWith("sk_test_")) {
  throw new Error("A development CLERK_SECRET_KEY is required.");
}

const ticketResponse = await fetch("https://api.clerk.com/v1/sign_in_tokens", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${secretKey}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({ user_id: userId, expires_in_seconds: 120 }),
});
if (!ticketResponse.ok) {
  throw new Error(`Clerk sign-in token failed (${ticketResponse.status}).`);
}
const ticketPayload = await ticketResponse.json();
const ticket = ticketPayload.token;
if (typeof ticket !== "string") {
  throw new Error("Clerk did not return a sign-in ticket.");
}

const steps = [];
function ok(step) {
  steps.push(step);
  console.log(`  ✓ ${step}`);
}

const browser = await chromium.launch();
const page = await browser.newPage();
/** Entry created by this run; removed in `finally` even if a step fails. */
let createdEntry = null;

try {
  await page.goto(`${BASE_URL}/`);
  await page.waitForFunction(() => window.Clerk?.loaded === true);
  await page.evaluate(async (oneTimeTicket) => {
    const signIn = await window.Clerk.client.signIn.create({
      strategy: "ticket",
      ticket: oneTimeTicket,
    });
    if (!signIn.createdSessionId) {
      throw new Error(`Clerk sign-in incomplete: ${signIn.status}`);
    }
    await window.Clerk.setActive({ session: signIn.createdSessionId });
  }, ticket);
  ok("Clerk sign-in");

  // ---- Sadržaj ---------------------------------------------------------
  await page.goto(`${BASE_URL}/radni-prostor/sadrzaj`);
  await page.getByRole("heading", { name: "Sadržaj", exact: true }).waitFor();
  ok("Sadržaj se učitava kao ulogovan staff");

  // Pick a catalogue item that has no CMS revision yet, so the run creates
  // exactly one entry and can remove it again without touching real content.
  const fallbackCard = page
    .getByRole("button")
    .filter({ hasText: "Fallback iz koda" })
    .first();
  await fallbackCard.waitFor();
  const fallbackLabel = (await fallbackCard.innerText()).split("\n")[0];

  const [createResponse] = await Promise.all([
    page.waitForResponse(
      (response) =>
        response.url().endsWith("/api/content/entries") &&
        response.request().method() === "POST",
    ),
    fallbackCard.click(),
  ]);
  if (createResponse.status() !== 201) {
    throw new Error(
      `Otvaranje sistemske stranice nije vratilo 201 (${createResponse.status()}).`,
    );
  }
  createdEntry = await createResponse.json();
  ok(`Sistemska stranica otvorena i registrovana: ${fallbackLabel}`);

  await page.getByRole("button", { name: "Prepiši" }).first().click();
  const firstField = page.getByLabel("H1").first();
  await firstField.waitFor();
  await firstField.fill("CMS smoke naslov");
  const [patchResponse] = await Promise.all([
    page.waitForResponse(
      (response) =>
        response.url().includes("/api/content/entries/") &&
        response.request().method() === "PATCH",
    ),
    page.getByRole("button", { name: "Sačuvaj", exact: true }).click(),
  ]);
  if (patchResponse.status() !== 200) {
    throw new Error(`Čuvanje nije vratilo 200 (${patchResponse.status()}).`);
  }
  ok("Izmena sačuvana kroz UI (PATCH 200)");

  // Optimistic lock: replay the now-stale lockVersion and require a 409.
  const staleStatus = await page.evaluate(async (entry) => {
    const response = await fetch(
      `/api/content/entries/${entry.entryId}/revisions/${entry.revisionId}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lockVersion: entry.lockVersion, slotData: {} }),
      },
    );
    return response.status;
  }, createdEntry);
  if (staleStatus !== 409) {
    throw new Error(`Zastarelo zaključavanje nije dalo 409 (${staleStatus}).`);
  }
  ok("Optimistic lock: zastareo PATCH vraća 409");

  // ---- Dokumenti -------------------------------------------------------
  await page.goto(`${BASE_URL}/radni-prostor/dokumenti`);
  await page
    .getByRole("heading", { name: "Dokumenti i saglasnosti", exact: true })
    .waitFor();
  await page.getByRole("button", { name: "Nova stranica" }).waitFor();
  await page.getByText(/Intake (prima|ne prima) zahteve/).first().waitFor();
  ok("Dokumenti: lista, gate banner i akcije renderuju");

  // ---- Kompas ----------------------------------------------------------
  await page.goto(`${BASE_URL}/radni-prostor/kompas`);
  await page.getByRole("heading", { name: "Kompas", exact: true }).waitFor();
  await page
    .getByRole("heading", { name: "Kontrolisane sistemske opcije" })
    .waitFor();
  await page.getByRole("heading", { name: "Oblasti", exact: true }).waitFor();
  ok("Kompas: registar, sistemske opcije i tabovi renderuju");

  console.log(`\nSmoke prošao — ${steps.length} koraka.`);
} finally {
  if (createdEntry) {
    const removed = await page
      .evaluate(async (entry) => {
        const response = await fetch(
          `/api/content/entries/${entry.entryId}/revisions/${entry.revisionId}`,
          { method: "DELETE" },
        );
        return response.status;
      }, createdEntry)
      .catch(() => "greška");
    console.log(`  · čišćenje: brisanje kreirane radne verzije → ${removed}`);
  }
  await browser.close();
}
