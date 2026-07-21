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

test("profile booking form sends a request and is clearly not a confirmation", async ({
  page,
}) => {
  await mockBooking(page);
  await page.goto("/tim/anja-stamenkovic");

  const strip = page.locator("#zakazivanje");
  // Must state it is a request, not a confirmed appointment (T6).
  await expect(strip).toContainText("zahtev za termin");
  await expect(strip).toContainText("ne potvrda");

  // Date/time are read-only placeholders (no real slot selection yet).
  const dateField = strip.getByLabel(/Datum — dogovara se/);
  await expect(dateField).toHaveAttribute("readonly", "");

  await strip.getByLabel("Ime i prezime").fill("Petar Petrović");
  await strip.getByLabel("Email").fill("petar@test.rs");
  await strip.getByRole("button", { name: "Zakaži termin" }).click();

  await expect(strip).toContainText("Zahtev je poslat");
});

test("submit stays disabled until name and a valid email are entered", async ({
  page,
}) => {
  await page.goto("/tim/marjan-jankovic");
  const strip = page.locator("#zakazivanje");
  const submit = strip.getByRole("button", { name: "Zakaži termin" });

  await expect(submit).toBeDisabled();
  await strip.getByLabel("Ime i prezime").fill("Ana");
  await strip.getByLabel("Email").fill("not-an-email");
  await expect(submit).toBeDisabled();
  await strip.getByLabel("Email").fill("ana@test.rs");
  await expect(submit).toBeEnabled();
});

test("team-review request carries the intake summary without internal scores", async ({
  page,
}) => {
  const sink: { body?: unknown } = {};
  await mockBooking(page, sink);
  await page.goto("/");
  await page
    .getByRole("button", { name: "Pomozi mi da pronađem podršku" })
    .click();
  const drawer = page.getByRole("dialog", { name: "Vođeni izbor podrške" });

  await drawer
    .getByRole("button", { name: "Ne znam tačno, želim razgovor" })
    .click();
  await drawer
    .getByRole("button", { name: "Nisam siguran/na", exact: true })
    .click();
  await drawer.getByRole("button", { name: "Ne", exact: true }).click();
  await drawer
    .getByRole("button", { name: "Nisam siguran/na", exact: true })
    .click();
  await drawer.getByRole("button", { name: "Online", exact: true }).click();

  await drawer
    .getByLabel(/Želite li nešto da dodate svojim rečima/)
    .fill("Radije bih razgovor pre odluke.");
  await drawer
    .getByRole("button", { name: "Želim da tim pregleda moj zahtev" })
    .click();

  await expect(drawer).toContainText("Nedodeljen zahtev");
  await drawer.getByLabel("Ime i prezime").fill("Mika Mikić");
  await drawer.getByLabel("Email").fill("mika@test.rs");
  await drawer.getByRole("button", { name: "Zakaži termin" }).click();

  await expect(drawer).toContainText("Zahtev je poslat");

  // The request carries the plain-language summary…
  const body = sink.body as {
    therapistSlug: string | null;
    summary?: {
      answers: { question: string; answer: string }[];
      recommendedService?: string;
      extraText?: string;
    };
  };
  expect(body.therapistSlug).toBeNull();
  expect(body.summary?.recommendedService).toBe("Individualna psihoterapija");
  expect(body.summary?.extraText).toBe("Radije bih razgovor pre odluke.");
  expect(body.summary?.answers.length).toBeGreaterThanOrEqual(5);
  // …and never the internal score breakdown.
  expect(JSON.stringify(sink.body)).not.toContain("scoreBreakdown");
});
