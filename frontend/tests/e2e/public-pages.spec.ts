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
  // Tridesete parent note: the session price covers both parents together.
  await expect(page.locator("body")).toContainText(
    "po susretu, ne po roditelju",
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

test("service detail has a canonical booking CTA and unknown services return 404", async ({
  page,
}) => {
  await page.goto("/usluge/roditeljsko-savetovanje");
  await expect(
    page.locator("#usluga").getByRole("link", { name: "Zakaži termin" }),
  ).toHaveAttribute(
    "href",
    "/zakazi?service=roditeljsko-savetovanje&source=service",
  );

  const response = await page.goto("/usluge/ne-postoji");
  expect(response?.status()).toBe(404);
});

test("footer exposes the confirmed email, locations and only live routes", async ({
  page,
}) => {
  await page.goto("/");

  const footer = page.locator("footer");
  await expect(footer).toContainText("info@psihointegritet.com");
  await expect(footer).toContainText("Niš");
  await expect(footer).toContainText("Leskovac");
  await expect(footer).toContainText("online i uživo");
  await expect(footer.getByRole("link", { name: "Kontakt" })).toHaveAttribute(
    "href",
    "/kontakt",
  );
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
