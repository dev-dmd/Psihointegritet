import { expect, test, type Page } from "@playwright/test";

/**
 * `/zakazi` renders the Booking Widget. What the visitor may change is decided
 * by `BookingSelectionPolicy`, derived once from `?source=` — these specs
 * assert the three entry points that policy produces, not the widget's
 * internals.
 */

async function mockBooking(page: Page, sink?: { body?: unknown }) {
  await page.route("**/api/booking-request", (route) => {
    if (sink) {
      sink.body = route.request().postDataJSON();
    }
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ ok: true }),
    });
  });
}

async function pickFirstSlot(page: Page) {
  const slot = page.getByRole("button", { name: /^\d{2}:\d{2}$/ }).first();
  await slot.click();
  await expect(slot).toHaveAttribute("aria-pressed", "true");
  return slot;
}

test("direct booking opens on a valid therapist and offering", async ({
  page,
}) => {
  await page.goto("/zakazi");

  await expect(
    page.getByRole("heading", { level: 1, name: "Pošaljite zahtev za termin" }),
  ).toBeVisible();

  // Both choices are editable, so the widget must offer them.
  await expect(page.getByText(/^Usluge kod /)).toBeVisible();
  await expect(page.getByText("Ostali terapeuti")).toBeVisible();
});

test("therapist profile opens booking with a therapist prefill", async ({
  page,
}) => {
  await page.goto("/tim/maria-bullock");

  const bookingLink = page
    .locator("#zakazivanje")
    .getByRole("link", { name: "Zakaži termin" });
  await expect(bookingLink).toHaveAttribute(
    "href",
    "/zakazi?therapist=maria-bullock&source=therapist",
  );
  await bookingLink.click();

  await expect(page).toHaveURL(
    /\/zakazi\?therapist=maria-bullock&source=therapist$/,
  );
  await expect(page.getByText("Usluge kod Marije")).toBeVisible();
  // Pre-selected, never locked: a profile visit may still change person.
  await expect(page.getByText("Ostali terapeuti")).toBeVisible();
});

test("service detail opens booking with a service prefill", async ({
  page,
}) => {
  await page.goto("/usluge/individualna-psihoterapija");

  const bookingLink = page
    .locator("#usluga")
    .getByRole("link", { name: "Zakaži termin" });
  await expect(bookingLink).toHaveAttribute(
    "href",
    "/zakazi?service=individualna-psihoterapija&source=service",
  );
  await bookingLink.click();

  await expect(page).toHaveURL(
    /\/zakazi\?service=individualna-psihoterapija&source=service$/,
  );
  // The service param must survive the hand-off, not be silently dropped.
  await expect(
    page.getByRole("heading", { name: "Individualna psihoterapija" }),
  ).toBeVisible();
});

test("changing the therapist clears the previously selected slot", async ({
  page,
}) => {
  await page.goto("/zakazi?therapist=maria-bullock&source=therapist");

  const slot = await pickFirstSlot(page);

  await page
    .getByRole("button", { name: /John Francis/ })
    .first()
    .click();

  await expect(page.getByText("Usluge kod Johna")).toBeVisible();
  await expect(slot).toHaveAttribute("aria-pressed", "false");
});

test("booking request submits through the endpoint and remains a request", async ({
  page,
}) => {
  const sink: { body?: unknown } = {};
  await mockBooking(page, sink);
  await page.goto(
    "/zakazi?service=individualna-psihoterapija&therapist=maria-bullock&format=online&source=therapist",
  );

  await pickFirstSlot(page);
  await page.getByRole("button", { name: "Zakaži" }).click();

  await page.getByLabel("Ime i prezime").fill("Petar Petrović");
  await page
    .getByLabel("Email adresa", { exact: true })
    .fill("petar@example.com");
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Pošalji zahtev za termin" }).click();

  await expect(page.getByText(/nije konačna potvrda termina/)).toBeVisible();

  expect(sink.body).toMatchObject({
    therapistSlug: "maria-bullock",
    serviceSlug: "individualna-psihoterapija",
    format: "online",
  });
  // Matching internals must never reach the public booking payload.
  expect(JSON.stringify(sink.body)).not.toContain("scoreBreakdown");
});

test("intake matching entry locks the selection and offers only a way back", async ({
  page,
}) => {
  await page.goto(
    "/zakazi?service=individualna-psihoterapija&therapist=maria-bullock&format=online&source=matching",
  );

  await expect(page.getByText("Vaš izbor")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Individualna psihoterapija" }),
  ).toBeVisible();

  // No way to turn the widget back into a marketplace.
  await expect(page.getByText("Ostali terapeuti")).toBeHidden();
  await expect(page.getByText(/^Usluge kod /)).toBeHidden();
  await expect(
    page.getByRole("button", { name: "Sledeća usluga" }),
  ).toBeHidden();

  const back = page.getByRole("button", { name: "Nazad na preporuke" });
  await expect(back).toBeVisible();
  await back.click();
  await expect(page).toHaveURL(/\/pronadji-podrsku$/);
});
