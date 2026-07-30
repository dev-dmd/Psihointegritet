/**
 * Real development-Clerk CMS smoke:
 * sign in -> UI create/edit/save -> stale-lock 409 -> UI delete.
 *
 * Usage:
 *   node scripts/smoke-cms-authenticated.mjs user_...
 *
 * Reads only CLERK_SECRET_KEY from `.env.local`, never prints it or the
 * one-time sign-in ticket. The created draft is deleted before exit.
 */
import fs from "node:fs";
import path from "node:path";

import { chromium } from "@playwright/test";

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

const slug = `cms-smoke-${Date.now()}`;
const browser = await chromium.launch();
const page = await browser.newPage();

try {
  await page.goto("http://localhost:3007/");
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

  await page.goto("http://localhost:3007/radni-prostor/sadrzaj");
  await page.getByRole("heading", { name: "Sadržaj", exact: true }).waitFor();
  await page.evaluate(async () => {
    const response = await fetch("/api/content/entries", { cache: "no-store" });
    if (!response.ok) return;
    const entries = await response.json();
    await Promise.all(
      entries
        .filter(
          (entry) =>
            entry.status === "draft" && entry.slug.startsWith("cms-smoke-"),
        )
        .map((entry) =>
          fetch(
            `/api/content/entries/${entry.entryId}/revisions/${entry.revisionId}`,
            { method: "DELETE" },
          ),
        ),
    );
  });
  await page.reload();
  await page.getByRole("heading", { name: "Sadržaj", exact: true }).waitFor();
  await page.getByRole("button", { name: "Nova stranica" }).click();
  await page.getByLabel("Slug").fill(slug);
  await Promise.all([
    page.waitForResponse(
      (response) =>
        response.url().endsWith("/api/content/entries") &&
        response.request().method() === "POST" &&
        response.status() === 201,
    ),
    page.getByRole("button", { name: "Sačuvaj kao radnu verziju" }).click(),
  ]);
  await page.getByText(`/${slug}`, { exact: true }).last().waitFor();

  await page.getByRole("button", { name: "Prepiši" }).first().click();
  const h1 = page.getByLabel("H1");
  await h1.fill("CMS smoke naslov");
  await Promise.all([
    page.waitForResponse(
      (response) =>
        response.url().includes("/api/content/entries/") &&
        response.request().method() === "PATCH" &&
        response.status() === 200,
    ),
    page.getByRole("button", { name: "Sačuvaj", exact: true }).click(),
  ]);

  const entry = await page.evaluate(async (createdSlug) => {
    const response = await fetch("/api/content/entries", { cache: "no-store" });
    if (!response.ok) throw new Error(`List failed (${response.status})`);
    const entries = await response.json();
    return entries.find((candidate) => candidate.slug === createdSlug);
  }, slug);
  if (!entry) throw new Error("Created entry was not returned by the API.");

  const conflictStatuses = await page.evaluate(async (current) => {
    const url = `/api/content/entries/${current.entryId}/revisions/${current.revisionId}`;
    const update = (marker) => ({
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        lockVersion: current.lockVersion,
        slotData: { ...current.slotData, smokeMarker: marker },
      }),
    });
    const first = await fetch(url, update("first"));
    const second = await fetch(url, update("stale-second"));
    return [first.status, second.status];
  }, entry);
  if (conflictStatuses[0] !== 200 || conflictStatuses[1] !== 409) {
    throw new Error(`Expected save/409, got ${conflictStatuses.join("/")}.`);
  }

  await page
    .getByRole("button", { name: "Obriši", exact: true })
    .first()
    .click();
  await Promise.all([
    page.waitForResponse(
      (response) =>
        response.url().includes("/api/content/entries/") &&
        response.request().method() === "DELETE" &&
        response.status() === 204,
    ),
    page.getByRole("button", { name: "Obriši", exact: true }).last().click(),
  ]);
  await page
    .getByText(`/${slug}`, { exact: true })
    .waitFor({ state: "detached" });

  console.log(`PASS ${slug}: signed-in create/edit/save/409/delete`);
} finally {
  await browser.close();
}
