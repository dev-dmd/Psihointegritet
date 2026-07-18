import { expect, test, type Page } from "@playwright/test";

async function mockBooking(page: Page) {
  await page.route("**/api/booking-request", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ ok: true }),
    }),
  );
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

test("unassigned team result offers a request form to the whole team", async ({
  page,
}) => {
  await mockBooking(page);
  await page.goto("/");
  await page
    .getByRole("button", { name: "Pomozi mi da pronađem podršku" })
    .click();
  const drawer = page.getByRole("dialog", { name: "Vođeni izbor podrške" });

  await drawer.getByRole("button", { name: "Za mene — odrasla osoba" }).click();
  await drawer.getByRole("button", { name: "26–45" }).click();
  await drawer
    .getByRole("button", {
      name: "Oporavak nakon nasilja ili kriznog iskustva",
    })
    .click();
  await drawer.getByRole("button", { name: "Online", exact: true }).click();
  await drawer
    .getByRole("button", { name: "Najbolje stručno uklapanje" })
    .click();

  await expect(drawer).toContainText("Nedodeljen zahtev");
  await drawer.getByLabel("Ime i prezime").fill("Mika Mikić");
  await drawer.getByLabel("Email").fill("mika@test.rs");
  await drawer.getByRole("button", { name: "Zakaži termin" }).click();

  await expect(drawer).toContainText("Zahtev je poslat");
});
