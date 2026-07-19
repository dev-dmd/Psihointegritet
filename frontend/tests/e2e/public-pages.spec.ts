import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("services page lists the three priced services with the mandatory price note", async ({
  page,
}) => {
  const response = await page.goto("/usluge");
  expect(response?.status()).toBe(200);

  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "Podrška prilagođena vašoj situaciji",
    }),
  ).toBeVisible();

  for (const name of [
    "Individualna psihoterapija",
    "Bračno savetovanje",
    "Roditeljsko savetovanje",
  ]) {
    await expect(page.getByRole("heading", { name })).toBeVisible();
  }

  // Prices per Anja's answers (2026-07-18), still flagged as indicative.
  await expect(page.locator("body")).toContainText("Cene su okvirne");
  for (const price of ["4.000 RSD", "5.500 RSD", "5.000 RSD"]) {
    await expect(page.locator("body")).toContainText(price);
  }

  // Session packages and group programs are listed; unconfirmed group prices
  // show the pending note instead of an invented figure.
  await expect(page.locator("body")).toContainText("Paketi individualnog rada");
  await expect(page.locator("body")).toContainText("Grupni programi");
  await expect(page.locator("body")).toContainText("Tridesete — Vreme promene");
  await expect(page.locator("body")).toContainText(
    "Cena će biti objavljena naknadno.",
  );

  // 5-session package: regular price struck through next to the discounted one.
  await expect(page.locator("s", { hasText: "20.000 RSD" })).toBeVisible();
  await expect(page.locator("body")).toContainText("15.000 RSD");
  // Tridesete parent note is visible (wording pending Anja's clarification).
  await expect(page.locator("body")).toContainText(
    "roditelji imaju mogućnost dolaska po ceni jednog",
  );
});

test("knowledge page shows articles as coming soon, with no read links", async ({
  page,
}) => {
  const response = await page.goto("/znanje");
  expect(response?.status()).toBe(200);

  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "Razumevanje može biti prvi korak.",
    }),
  ).toBeVisible();

  // Every planned article is labelled "U pripremi" — no fake published content.
  await expect(page.getByText("U pripremi").first()).toBeVisible();
  // No "read the article" affordance exists yet.
  await expect(page.getByRole("link", { name: /Pročitaj/ })).toHaveCount(0);
});

test("header nav links to the dedicated services and knowledge pages", async ({
  page,
}) => {
  await page.goto("/");

  await page
    .getByRole("navigation", { name: "Glavna navigacija" })
    .getByRole("link", { name: "Usluge" })
    .click();
  await expect(page).toHaveURL(/\/usluge$/);

  await page
    .getByRole("navigation", { name: "Glavna navigacija" })
    .getByRole("link", { name: "Znanje i resursi" })
    .click();
  await expect(page).toHaveURL(/\/znanje$/);
});

test("services and knowledge pages have no critical accessibility violations", async ({
  page,
}) => {
  for (const path of ["/usluge", "/znanje"]) {
    await page.goto(path);
    const results = await new AxeBuilder({ page }).analyze();
    const critical = results.violations.filter(
      (violation) => violation.impact === "critical",
    );
    expect(critical, `critical a11y violations on ${path}`).toEqual([]);
  }
});
