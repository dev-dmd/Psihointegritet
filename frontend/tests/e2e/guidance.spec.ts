import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

async function startQuestionnaire(page: Page) {
  await page.goto("/pronadji-podrsku");
  await page.getByRole("button", { name: "Započni upitnik" }).click();
}

test("header booking CTA opens the canonical booking route", async ({
  page,
}) => {
  await page.goto("/");

  const cta = page.getByRole("link", { name: "Zakaži termin" }).first();
  await expect(cta).toHaveAttribute("href", "/zakazi?source=header");
  await cta.click();

  await expect(page).toHaveURL(/\/zakazi\?source=header$/);
});

test("homepage support CTA opens the route-level guided flow", async ({
  page,
}) => {
  await page.goto("/");

  await page
    .getByRole("link", { name: "Pomozi mi da pronađem podršku" })
    .click();

  await expect(page).toHaveURL(/\/pronadji-podrsku$/);
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "Pronađite podršku koja vam odgovara",
    }),
  ).toBeVisible();
  await expect(page.getByText("Upitnik nije dijagnostički alat")).toBeVisible();
});

test("matching result hands off only safe booking context", async ({
  page,
}) => {
  await startQuestionnaire(page);

  await page.getByRole("button", { name: "Burnout", exact: true }).click();
  await page.getByRole("button", { name: "Sam/a", exact: true }).click();
  await page.getByRole("button", { name: "Ne", exact: true }).click();
  await page
    .getByRole("button", { name: "Naučiti kako da se nosim sa emocijama" })
    .click();
  await page.getByRole("button", { name: "Online", exact: true }).click();

  await expect(
    page.getByText("Predlog na osnovu vaših odgovora"),
  ).toBeVisible();
  await expect(
    page.getByText("Anja Stamenković", { exact: true }),
  ).toBeVisible();

  const bookingLink = page
    .getByRole("link", { name: "Zatražite termin" })
    .first();
  await expect(bookingLink).toHaveAttribute(
    "href",
    "/zakazi?service=individualna-psihoterapija&therapist=anja-stamenkovic&format=online&source=matching",
  );
  await bookingLink.click();

  await expect(page).toHaveURL(
    /\/zakazi\?service=individualna-psihoterapija&therapist=anja-stamenkovic&format=online&source=matching$/,
  );
  await expect(page.getByLabel("Usluga")).toHaveValue(
    "individualna-psihoterapija",
  );
  await expect(page.getByLabel("Terapeut")).toHaveValue("anja-stamenkovic");
});

test("guided route has no critical accessibility violations", async ({
  page,
}) => {
  await page.goto("/pronadji-podrsku");

  const results = await new AxeBuilder({ page }).analyze();
  const critical = results.violations.filter(
    (violation) => violation.impact === "critical",
  );
  expect(critical).toEqual([]);
});
