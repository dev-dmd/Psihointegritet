import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const drawerName = "Rad sa kompanijama";

async function mockInquiryEndpoint(page: Page) {
  await page.route("**/api/company-inquiry", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ ok: true }),
    });
  });
}

test("companies page CTA opens the configurator with the new intro", async ({
  page,
}) => {
  await page.goto("/rad-sa-kompanijama");
  await page
    .getByRole("button", { name: "Konfigurišite program" })
    .first()
    .click();

  const drawer = page.getByRole("dialog", { name: drawerName });
  await expect(drawer).toBeVisible();
  await expect(drawer).toContainText("Kako možemo pomoći vašoj organizaciji?");
});

test("workshop request maps to the team workshop, priced on request", async ({
  page,
}) => {
  await mockInquiryEndpoint(page);
  await page.goto("/rad-sa-kompanijama");
  await page
    .getByRole("button", { name: "Konfigurišite program" })
    .first()
    .click();

  const drawer = page.getByRole("dialog", { name: drawerName });
  await drawer.getByRole("button", { name: "Konfigurišite program" }).click();

  // Q1 — employees (single-select, auto-advance).
  await drawer.getByRole("button", { name: "20–50" }).click();
  // Q2 — goals (multi-select + „Dalje").
  await drawer.getByRole("button", { name: "Radionicu" }).click();
  await drawer.getByRole("button", { name: "Dalje" }).click();
  // Q3 — topics (multi-select + „Dalje").
  await drawer.getByRole("button", { name: "Burnout" }).click();
  await drawer.getByRole("button", { name: "Stres" }).click();
  await drawer.getByRole("button", { name: "Dalje" }).click();
  // Q4 — format.
  await drawer.getByRole("button", { name: "Online", exact: true }).click();

  await expect(drawer).toContainText("Interaktivna radionica za tim");
  await expect(drawer).toContainText("Cena po ponudi");
  // The old demo prices are gone — nothing priced in RSD.
  await expect(drawer).not.toContainText("RSD");

  await drawer.getByRole("button", { name: "Zatražite ponudu" }).click();

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

test("over 200 employees always leads to the custom program", async ({
  page,
}) => {
  await page.goto("/rad-sa-kompanijama");
  await page
    .getByRole("button", { name: "Konfigurišite program" })
    .first()
    .click();

  const drawer = page.getByRole("dialog", { name: drawerName });
  await drawer.getByRole("button", { name: "Konfigurišite program" }).click();

  await drawer.getByRole("button", { name: "Više od 200" }).click();
  await drawer.getByRole("button", { name: "Predavanje ili vebinar" }).click();
  await drawer.getByRole("button", { name: "Dalje" }).click();
  await drawer.getByRole("button", { name: "Liderstvo" }).click();
  await drawer.getByRole("button", { name: "Dalje" }).click();
  await drawer.getByRole("button", { name: "Kombinovano" }).click();

  await expect(drawer).toContainText("Program po meri");
  await expect(drawer).toContainText("Cena po ponudi");
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
