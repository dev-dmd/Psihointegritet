import { expect, test, type Page } from "@playwright/test";

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

test("direct booking explains the three starting choices", async ({ page }) => {
  await page.goto("/zakazi");

  await expect(
    page.getByRole("heading", { level: 1, name: "Pošaljite zahtev za termin" }),
  ).toBeVisible();
  await expect(page.getByText("Kako želite da počnete?")).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Nisam siguran/na" }),
  ).toHaveAttribute("href", "/pronadji-podrsku");
});

test("therapist profile opens booking with a therapist prefill", async ({
  page,
}) => {
  await page.goto("/tim/anja-stamenkovic");

  const bookingLink = page
    .locator("#zakazivanje")
    .getByRole("link", { name: "Zakaži termin" });
  await expect(bookingLink).toHaveAttribute(
    "href",
    "/zakazi?therapist=anja-stamenkovic&source=therapist",
  );
  await bookingLink.click();

  await expect(page).toHaveURL(
    /\/zakazi\?therapist=anja-stamenkovic&source=therapist$/,
  );
  await expect(page.getByLabel("Terapeut")).toHaveValue("anja-stamenkovic");
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
  await expect(page.getByLabel("Usluga")).toHaveValue(
    "individualna-psihoterapija",
  );
});

test("booking request submits through the demo endpoint and remains a request", async ({
  page,
}) => {
  const sink: { body?: unknown } = {};
  await mockBooking(page, sink);
  await page.goto(
    "/zakazi?service=individualna-psihoterapija&therapist=anja-stamenkovic&format=online&source=matching",
  );

  await expect(page.getByText(/Ovo je zahtev za termin/)).toBeVisible();
  await page.getByRole("button", { name: "Nastavi" }).click();
  await page.getByRole("button", { name: "Nastavi" }).click();

  await page.getByLabel("Željeni datum").fill("2026-08-10");
  await page.getByLabel("Period dana").selectOption("Popodne");
  await page.getByRole("button", { name: "Nastavi" }).click();

  await page.getByLabel("Ime i prezime").fill("Petar Petrović");
  await page
    .getByRole("textbox", { name: "Email", exact: true })
    .fill("petar@example.com");
  await page.getByRole("button", { name: "Nastavi" }).click();

  const submit = page.getByRole("button", { name: "Pošaljite zahtev" });
  await expect(submit).toBeDisabled();
  await page.getByLabel(/Razumem da je ovo zahtev za termin/).check();
  await expect(submit).toBeEnabled();
  await submit.click();

  await expect(page.getByText("Vaš zahtev je uspešno poslat")).toBeVisible();
  await expect(
    page.getByText(/Ovo još nije konačna potvrda termina/),
  ).toBeVisible();

  expect(sink.body).toMatchObject({
    therapistSlug: "anja-stamenkovic",
    serviceSlug: "individualna-psihoterapija",
    format: "online",
    preferredDate: "2026-08-10",
    preferredTime: "Popodne",
    source: "matching",
  });
  expect(JSON.stringify(sink.body)).not.toContain("scoreBreakdown");
});
