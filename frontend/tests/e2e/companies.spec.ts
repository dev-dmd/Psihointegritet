import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("companies page renders public models and the existing configurator", async ({
  page,
}) => {
  const response = await page.goto("/rad-sa-kompanijama");
  expect(response?.status()).toBe(200);

  await expect(
    page.getByRole("heading", { level: 1, name: "Rad sa kompanijama" }),
  ).toBeVisible();
  for (const name of [
    "Pojedinačni pristup",
    "Team Flex",
    "Rezervisani kapacitet",
    "Program po meri",
  ]) {
    await expect(page.getByRole("heading", { level: 3, name })).toBeVisible();
  }
  await expect(page.getByText("Najčešća pitanja")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Konfigurišite program" }).first(),
  ).toBeVisible();
});

test("hero Za organizacije card links to the companies page (no 404)", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("link", { name: /Rad sa kompanijama/ })
    .first()
    .click();
  await expect(page).toHaveURL(/\/rad-sa-kompanijama$/);
});

test("companies page has no critical accessibility violations", async ({
  page,
}) => {
  await page.goto("/rad-sa-kompanijama");
  const results = await new AxeBuilder({ page }).analyze();
  const critical = results.violations.filter(
    (violation) => violation.impact === "critical",
  );
  expect(critical).toEqual([]);
});
