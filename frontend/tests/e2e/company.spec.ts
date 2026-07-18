import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const drawerName = "Program podrške zaposlenima";

async function mockInquiryEndpoint(page: Page) {
  await page.route("**/api/company-inquiry", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ ok: true }),
    });
  });
}

async function runToRecommendation(page: Page) {
  const drawer = page.getByRole("dialog", { name: drawerName });
  await drawer.getByRole("button", { name: "Konfigurišite program" }).click();
  // Step 1 (multi): pick a need, then continue.
  await drawer
    .getByRole("button", { name: "Poverljive individualne razgovore" })
    .click();
  await drawer.getByRole("button", { name: "Dalje" }).click();
  // Steps 2–6 (single-select, auto-advance).
  await drawer.getByRole("button", { name: "3–9 osoba" }).click();
  await drawer.getByRole("button", { name: "Fleksibilni termini" }).click();
  await drawer
    .getByRole("button", { name: "Kompanija plaća sve termine" })
    .click();
  await drawer.getByRole("button", { name: "Šest meseci" }).click();
  await drawer.getByRole("button", { name: "Online", exact: true }).click();
  return drawer;
}

test("companies page CTA opens the configurator", async ({ page }) => {
  await page.goto("/rad-sa-kompanijama");
  await page
    .getByRole("button", { name: "Konfigurišite program" })
    .first()
    .click();
  await expect(page.getByRole("dialog", { name: drawerName })).toBeVisible();
});

test("matching B2B branch opens the configurator", async ({ page }) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Pomozi mi da pronađem podršku" })
    .click();
  const matching = page.getByRole("dialog", { name: "Vođeni izbor podrške" });
  await matching.getByRole("button", { name: "Rad sa kompanijama" }).click();
  await matching.getByRole("button", { name: "Konfigurišite program" }).click();
  await expect(page.getByRole("dialog", { name: drawerName })).toBeVisible();
});

test("full configurator produces a recommendation and submits the inquiry", async ({
  page,
}) => {
  await mockInquiryEndpoint(page);
  await page.goto("/rad-sa-kompanijama");
  await page
    .getByRole("button", { name: "Konfigurišite program" })
    .first()
    .click();

  const drawer = await runToRecommendation(page);

  // Team 3–9 + flexible + standard usage → Team Flex 4 (deterministic).
  await expect(drawer).toContainText("Team Flex 4");
  await expect(drawer).toContainText("20.000 RSD");

  await drawer.getByRole("button", { name: "Zatražite ponudu" }).click();

  // Contact form — team size is prefilled from the config answer.
  await drawer.getByLabel("Naziv kompanije *").fill("Test doo");
  await drawer.getByLabel("Ime i prezime kontakt osobe *").fill("Ana Anić");
  await drawer.getByLabel("Poslovni email *").fill("ana@test.rs");
  await drawer
    .getByLabel(/Saglasan\/na sam da me Psihointegritet kontaktira/)
    .check();

  await drawer
    .getByRole("button", { name: "Pošaljite upit za program" })
    .click();

  await expect(drawer).toContainText("Hvala na interesovanju");
});

test("configurator has no critical accessibility violations", async ({
  page,
}) => {
  await page.goto("/rad-sa-kompanijama");
  await page
    .getByRole("button", { name: "Konfigurišite program" })
    .first()
    .click();
  await expect(page.getByRole("dialog", { name: drawerName })).toBeVisible();

  const results = await new AxeBuilder({ page })
    .include('[role="dialog"]')
    .analyze();
  const critical = results.violations.filter(
    (violation) => violation.impact === "critical",
  );
  expect(critical).toEqual([]);
});
